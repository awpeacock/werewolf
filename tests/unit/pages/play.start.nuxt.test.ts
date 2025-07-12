import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

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
} from '@tests/common/stubs';
import { server } from '@tests/unit/setup/api';
import { mockGame } from '@tests/unit/setup/game';
import { mockT, mockUseLocalePath, setLocale } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink } from '@tests/unit/setup/navigation';
import { setupPage, triggerAction } from '@tests/unit/setup/page';
import { setMockMinPlayers, setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSLatest } from '@tests/unit/setup/websocket';

import DefaultLayout from '@/layouts/default.vue';
import page from '@/pages/play/[[id]].vue';
import { Role } from '@/types/enums';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';

describe('Play Game (Start Game) page', () => {
	const storeGame = useGameStore();
	const storePlayer = usePlayerStore();

	const enterPage = async (
		locale: string,
		game: Game,
		player: Nullable<Player>,
		code?: Nullable<string>
	): Promise<VueWrapper> => {
		storeGame.set(structuredClone(game));
		mockGame.getLatest = vi.fn().mockReturnValue(game);
		if (player === null) {
			storePlayer.$reset();
		} else {
			storePlayer.set(structuredClone(player));
		}
		let wrapper: VueWrapper;
		if (code === null) {
			wrapper = await setupPage(locale);
		} else if (code) {
			wrapper = await setupPage(locale, `/play/${code}`);
		} else {
			wrapper = await setupPage(locale, `/play/${game.id}`);
		}
		return wrapper;
	};

	const expectStart = async (
		locale: string,
		game: Game,
		player: Player,
		success: boolean
	): Promise<void> => {
		const wrapper = await enterPage(locale, game, player);

		if (success) {
			expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(`start-game (${locale}`);
		} else if (player.id !== stubMayor.id) {
			expect(wrapper.text()).toContain(`waiting-for-mayor-to-start (${locale})`);
		}
	};

	const expectRedirect = async (
		locale: string,
		game: Game,
		player: Nullable<Player>,
		message: string,
		code?: Nullable<string>
	): Promise<void> => {
		const wrapper = await enterPage(locale, game, player, code);

		expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
		expect(wrapper.text()).toContain(`${message} (${locale})`);
		expect(wrapper.findComponent({ name: 'Button' }).exists()).toBeTruthy();

		const button = wrapper.find('a');
		await button.trigger('click');
		await flushPromises();

		expect(mockNavigate).toHaveBeenCalled();
		expect(mockUseLocalePath).toHaveBeenCalledWith('/');
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		sessionStorage.clear();
		useGameStore().$reset();
		usePlayerStore().$reset();
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])(
		'should display the welcome page upon first (valid) arrival',
		async (locale: string) => {
			const players = [stubMayor, stubVillager1];
			for (const player of players) {
				const wrapper = await enterPage(locale, stubGameInactive, player);

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
			await expectRedirect(
				locale,
				stubGameInactive,
				stubVillager1,
				'you-must-come-here-with-a-valid-game-code',
				null
			);
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if a game code is supplied not matching the game in session',
		async (locale: string) => {
			await expectRedirect(
				locale,
				stubGameInactive,
				stubVillager1,
				'you-have-the-wrong-game-code',
				stubGameNew.id
			);
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if there is no player in session',
		async (locale: string) => {
			await expectRedirect(locale, stubGameInactive, null, 'you-have-not-yet-joined');
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if the player in session is only pending',
		async (locale: string) => {
			await expectRedirect(
				locale,
				stubGamePending,
				stubVillager1,
				'the-mayor-has-not-selected-you-to-play-in-this-game'
			);
		}
	);

	it.each(['en', 'de'])(
		'should display a redirect page if the player does not exist in the game in session',
		async (locale: string) => {
			await expectRedirect(
				locale,
				stubGameInactive,
				stubVillager2,
				'you-are-not-a-player-in-this-game'
			);
		}
	);

	it.each(['en', 'de'])(
		'should display the "Start Game" button for the mayor',
		async (locale: string) => {
			await expectStart(locale, stubGameReady, stubMayor, true);
		}
	);

	it.each(['en', 'de'])(
		'should display a message to players that the mayor needs to start the game and bouncing dots',
		async (locale: string) => {
			await expectStart(locale, stubGameReady, stubVillager1, false);
		}
	);

	it.each(['en', 'de'])(
		'should take the player straight through if the game has already started',
		async (locale: string) => {
			const players = [stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer];
			const roles = [Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.WOLF, Role.HEALER];
			for (let p = 0; p < players.length; p++) {
				const wrapper = await enterPage(locale, stubGameActive, players[p]);

				expect(wrapper.text()).toContain(`you-are (${locale})`);
				expect(wrapper.text()).toContain(`${roles[p]} (${locale})`.toUpperCase());
			}
		}
	);

	it.each(['en', 'de'])(
		'should start the game when the mayor clicks the "Start Game" button',
		async (locale: string) => {
			const wrapper = await enterPage(locale, stubGameReady, stubMayor);

			await triggerAction(
				wrapper,
				'start',
				stubGameReady,
				stubMayor,
				true,
				200,
				stubGameActive
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeFalsy();
		}
	);

	it.each(['en', 'de'])(
		'should update the population reactively each time a player is added',
		async (locale: string) => {
			setLocale(locale);
			const game = structuredClone(stubGameInactive);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
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
				route: '/play/' + game.id,
				slots: {
					default: () => h(page),
				},
			});

			const population = wrapper.findComponent({ name: 'Population' });
			expect(population.text()).toContain(`population (${locale}) : 2`);

			mockWSLatest.value = {
				type: 'join-request',
				game: game,
				player: stubVillager2,
			};

			await nextTick();

			// That the "Notifications" component works correctly, and triggers the
			// right API with the correct JSON is tested there - we have to assume it
			// works here and just give us the right payload so we can check the
			// population is updated on screen
			server.use(
				http.put(`/api/games/${game.id}/admit`, async ({ request }) => {
					await request.json();
					game.players.push(structuredClone(stubVillager2));
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

			mockWSLatest.value = {
				type: 'invite-accept',
				game: game,
				player: stubVillager3,
			};

			await nextTick();

			expect(population.text()).toContain(`population (${locale}) : 4`);
			wrapper.unmount();
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if the mayor clicks the "Start Game" button for a non-existent game',
		async (locale: string) => {
			const wrapper = await enterPage(locale, stubGameReady, stubMayor);

			await triggerAction(
				wrapper,
				'start',
				stubGameReady,
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
			const wrapper = await enterPage(locale, stubGameReady, stubMayor);

			await triggerAction(
				wrapper,
				'start',
				stubGameReady,
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
			const wrapper = await enterPage(locale, stubGameInactive, stubMayor);

			await triggerAction(wrapper, 'start', stubGameInactive, stubMayor, false);

			expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should not allow the mayor to click the "Start Game" button if the minimum number of players (unconfigured) have not joined',
		async (locale: string) => {
			const min: Array<Undefinable<number>> = [undefined, 5];
			for (const m of min) {
				setMockMinPlayers(m);

				const wrapper = await enterPage(locale, stubGameInactive, stubMayor);

				await triggerAction(wrapper, 'start', stubGameInactive, stubMayor, false);

				expect(wrapper.text()).toContain(`welcome-to-lycanville (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should move the screen on for all players when their player roles come through',
		async (locale: string) => {
			const players = [stubVillager1, stubVillager2, stubVillager3];
			const roles = [Role.WOLF, Role.HEALER, Role.VILLAGER];
			for (let p = 0; p < players.length; p++) {
				const wrapper = await enterPage(locale, stubGameReady, players[p]);

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
		const wrapper = await enterPage(locale, stubGameReady, stubVillager1);

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
