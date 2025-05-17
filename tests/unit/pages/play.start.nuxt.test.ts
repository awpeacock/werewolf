import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import { setMockMinPlayers, setupRuntimeConfigForApis } from '../setup/runtime';

import DefaultLayout from '@/layouts/default.vue';
import page from '@/pages/play/[[id]].vue';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';
import { Role } from '@/types/enums';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockGame } from '@tests/unit/setup/game';
import { mockT, mockUseLocalePath, setLocale } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink } from '@tests/unit/setup/navigation';
import {
	stubGameActive,
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubGameReady,
	stubHealer,
	stubMayor,
	stubVillager1,
	stubVillager2,
	stubVillager3,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/unit/setup/stubs';
import { mockWSLatest } from '@tests/unit/setup/websocket';

setupRuntimeConfigForApis();

describe('Play Game (Start Game) page', () => {
	const storeGame = useGameStore();
	const storePlayer = usePlayerStore();

	const url = '/api/games/';

	const setupPage = async (
		locale: string,
		route?: string
	): Promise<VueWrapper<InstanceType<typeof page>>> => {
		setLocale(locale);

		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: stubNuxtLink,
				},
			},
			route: route ?? '/play',
		});
		return wrapper;
	};

	const triggerStart = async (
		wrapper: VueWrapper,
		id: string,
		player: Player,
		submit: boolean,
		responseCode?: number,
		responseData?: object
	) => {
		let body;
		server.use(
			http.put(url + id + '/start', async ({ request }) => {
				body = await request.json();
				spyApi(body);
				return HttpResponse.json(responseData, { status: responseCode });
			})
		);

		const button = wrapper.find('button');
		button.trigger('click');
		await flushPromises();
		await nextTick();

		if (submit) {
			await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
			expect(spyApi).toHaveBeenCalled();
			expect(body).toEqual({ auth: player.id });
		} else {
			expect(spyApi).not.toHaveBeenCalled();
		}
	};

	beforeEach(() => {
		sessionStorage.clear();
		useGameStore().$reset();
		usePlayerStore().$reset();
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])(
		'should display the welcome page upon first (valid) arrival',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			const players = [stubMayor, stubVillager1];
			for (const player of players) {
				storePlayer.set(structuredClone(player));
				const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

				expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should automatically retrieve the latest state of the game if no game in session',
		async (locale: string) => {
			storeGame.$reset();
			storePlayer.set(structuredClone(stubVillager1));
			const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

			expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should gracefully handle any error retrieving the latest state of the game',
		async (locale: string) => {
			const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
			storeGame.set(structuredClone(stubGameInactive));
			storePlayer.$reset();
			mockGame.getLatest = vi.fn().mockImplementationOnce(() => {
				throw new Error('Game error');
			});

			expect(async () => {
				const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

				expect(spyError).toBeCalled();
				expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
				expect(wrapper.text()).toContain(`you-have-not-yet-joined (${locale})`);
				expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();
			}).not.toThrowError();
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if no game code is supplied',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(structuredClone(stubVillager1));
			const wrapper = await setupPage(locale);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(
				`you-must-come-here-with-a-valid-game-code (${locale})`
			);
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith('/');
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if a game code is supplied not matching the game in session',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(structuredClone(stubVillager1));
			const wrapper = await setupPage(locale, '/play/' + stubGameNew.id);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(`you-have-the-wrong-game-code (${locale})`);
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith('/');
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if there is no player in session',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.$reset();
			const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(`you-have-not-yet-joined (${locale})`);
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith('/');
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if the player in session is only pending',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGamePending));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGamePending);
			storePlayer.set(structuredClone(stubVillager1));
			const wrapper = await setupPage(locale, '/play/' + stubGamePending.id);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(
				`the-mayor-has-not-selected-you-to-play-in-this-game (${locale})`
			);
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith('/');
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if the player does not exist in the game in session',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(structuredClone(stubVillager2));
			const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(`you-are-not-a-player-in-this-game (${locale})`);
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith('/');
		}
	);

	it.each(['en', 'de'])(
		'should display the "Start Game" button for the mayor',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(`start-game (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should display a message to players that the mayor needs to start the game and bouncing dots',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
			storePlayer.set(structuredClone(stubVillager1));
			const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

			expect(wrapper.text()).toContain(`waiting-for-mayor-to-start (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should take the player straight through if the game has already started',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);

			const players = [stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer];
			const roles = [Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.WOLF, Role.HEALER];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				expect(wrapper.text()).toContain(`you-are (${locale})`);
				expect(wrapper.text()).toContain(`${roles[p]} (${locale})`.toUpperCase());
			}
		}
	);

	it.each(['en', 'de'])(
		'should start the game when the mayor clicks the "Start Game" button',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

			await triggerStart(wrapper, stubGameReady.id, stubMayor, true, 200, stubGameActive);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeFalsy();
		}
	);

	it.each(['en', 'de'])(
		'should update the portfolio reactively each time a player is added',
		async (locale: string) => {
			setLocale(locale);
			storeGame.set(structuredClone(stubGameInactive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(structuredClone(stubMayor));

			const wrapper = await mountSuspended(DefaultLayout, {
				global: {
					mocks: {
						$t: mockT,
					},
					stubs: {
						NuxtLink: stubNuxtLink,
					},
				},
				route: '/play/' + stubGameInactive.id,
				slots: {
					default: page,
				},
			});

			const population = wrapper.findComponent({ name: 'Population' });
			expect(population.text()).toContain(`population (${locale}) : 2`);

			mockWSLatest.value = {
				type: 'join-request',
				game: stubGameInactive,
				player: stubVillager2,
			};

			await nextTick();

			// That the "Notifications" component works correctly, and triggers the
			// right API with the correct JSON is tested there - we have to assume it
			// works here and just give us the right payload so we can check the
			// population is updated on screen
			const game = structuredClone(stubGameInactive);
			game.players.push(stubVillager2);
			server.use(
				http.put(url + stubGameInactive.id + '/admit', async ({ request }) => {
					await request.json();
					return HttpResponse.json(game, { status: 200 });
				})
			);

			expect(wrapper.findComponent({ name: 'Notifications' }).exists()).toBeTruthy();
			const notifications = wrapper.findComponent({ name: 'Notifications' });
			const buttons = notifications.findAll('.cursor-pointer');
			expect(buttons.length).toBe(2);
			await buttons[0].trigger('click');
			await flushPromises();
			await nextTick();

			expect(population.text()).toContain(`population (${locale}) : 3`);
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if the mayor clicks the "Start Game" button for a non-existent game',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

			await triggerStart(
				wrapper,
				stubGameReady.id,
				stubMayor,
				true,
				404,
				GameIdNotFoundErrorResponse
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('game-not-found');
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if the mayor clicks the "Start Game" button and is not authorised',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

			await triggerStart(
				wrapper,
				stubGameReady.id,
				stubMayor,
				true,
				403,
				UnauthorisedErrorResponse
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('unexpected-error');
		}
	);

	it.each(['en', 'de'])(
		'should not allow the mayor to click the "Start Game" button if the minimum number of players have not joined',
		async (locale: string) => {
			storeGame.set(stubGameInactive);
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(stubMayor);
			const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

			await triggerStart(wrapper, stubGameInactive.id, stubMayor, false);

			expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should not allow the mayor to click the "Start Game" button if the minimum number of players (unconfigured) have not joined',
		async (locale: string) => {
			setMockMinPlayers(undefined);
			storeGame.set(stubGameInactive);
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameInactive);
			storePlayer.set(stubMayor);
			const wrapper = await setupPage(locale, '/play/' + stubGameInactive.id);

			await triggerStart(wrapper, stubGameInactive.id, stubMayor, false);

			expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should move the screen on for all players when their player roles come through',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameReady));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);

			const players = [stubVillager1, stubVillager2, stubVillager3];
			const roles = [Role.WOLF, Role.HEALER, Role.VILLAGER];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

				mockWSLatest.value = {
					type: 'start-game',
					game: stubGameReady,
					role: roles[p],
				};
				await flushPromises();
				await nextTick();

				expect(wrapper.text()).toContain(`you-are (${locale})`);
				expect(wrapper.text()).toContain(`${roles[p]} (${locale})`.toUpperCase());
			}
		}
	);

	it.each(['en', 'de'])('should ignore irrelevant WebSocket events', async (locale: string) => {
		storeGame.set(structuredClone(stubGameReady));
		mockGame.getLatest = vi.fn().mockReturnValue(stubGameReady);
		storePlayer.set(structuredClone(stubVillager1));

		const wrapper = await setupPage(locale, '/play/' + stubGameReady.id);

		// Can't get to this screen without being accepted
		mockWSLatest.value = {
			type: 'admission',
			game: stubGameReady,
			response: true,
		};
		await flushPromises();
		await nextTick();

		expect(wrapper.text()).toContain(`waiting-for-mayor-to-start (${locale})`);
	});
});
