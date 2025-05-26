import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/play/[[id]].vue';
import BouncingDots from '@/components/BouncingDots.vue';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';
import { Role } from '@/types/enums';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockGame } from '@tests/unit/setup/game';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubNuxtLink } from '@tests/unit/setup/navigation';
import {
	stubGameActive,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/unit/setup/stubs';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSLatest } from '@tests/unit/setup/websocket';

setupRuntimeConfigForApis();

describe('Play Game (Night time) page', () => {
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

	const triggerChoice = async (
		wrapper: VueWrapper,
		id: string,
		player: Player,
		role: Role,
		submit: boolean,
		responseCode?: number,
		responseData?: object
	) => {
		let body;
		server.use(
			http.put(url + id + '/night', async ({ request }) => {
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
			const target = storeGame.findPlayer(button.text());
			expect(body).toEqual({ role: role, player: player.id, target: target!.id });
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
		'should initially display the page with the character role',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer];
			const roles = ['A-VILLAGER', 'A-VILLAGER', 'A-VILLAGER', 'THE-WOLF', 'THE-HEALER'];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				expect(wrapper.text()).toContain(`you-are (${locale})`);
				expect(wrapper.text()).toContain(`${roles[p]} (${locale.toUpperCase()})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should display the correct day time voting page',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubWolf, stubHealer];
			const roles = ['the-wolf', 'the-healer'];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`night-time (${locale})`);
				expect(wrapper.text()).toContain(`make-your-decision-${roles[p]} (${locale})`);

				const buttons = wrapper.findAll('button');
				expect(buttons.length).toBe(5);
			}
		}
	);

	it.each(['en', 'de'])(
		'should display the waiting night time page for everyone but the wolf and the healer',
		async (locale: string) => {
			const game = structuredClone(stubGameActive);
			game.stage = undefined;
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			const players = [stubMayor, stubVillager6, stubVillager7, stubVillager8];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`night-time (${locale})`);
				expect(wrapper.text()).toContain(`we-wait (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should submit the choices for the wolf and the healer individually and present the wait screen',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubWolf, stubHealer];
			const roles = [Role.WOLF, Role.HEALER];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				const game = structuredClone(stubGameActive);
				game.activities?.push({
					wolf: roles[p] === Role.WOLF ? stubGameActive.players.at(0)!.id : null,
					healer: roles[p] === Role.HEALER ? stubGameActive.players.at(0)!.id : null,
				});
				await triggerChoice(
					wrapper,
					stubGameActive.id,
					players[p],
					roles[p],
					true,
					200,
					game
				);

				const waitingFor = roles[p] === Role.WOLF ? 'the healer' : 'the wolf';
				expect(wrapper.text()).toContain(
					`you-have-chosen {wait: ${waitingFor}}  (${locale})`
				);
				expect(wrapper.findComponent(BouncingDots).exists()).toBeTruthy();
			}
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when both have chosen the same',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			for (let p = 0; p < stubGameActive.players.length; p++) {
				storePlayer.set(structuredClone(stubGameActive.players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				const game = structuredClone(stubGameActive);
				game.activities?.push({
					wolf: stubGameActive.players.at(0)!.id,
					healer: stubGameActive.players.at(0)!.id,
				});
				mockWSLatest.value = {
					type: 'morning',
					game: game,
				};
				await flushPromises();
				await nextTick();

				expect(wrapper.text()).toContain(`activity-summary-saved (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when the wolf and healer have chosen differently',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			for (let p = 0; p < stubGameActive.players.length; p++) {
				storePlayer.set(structuredClone(stubGameActive.players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				const game = structuredClone(stubGameActive);
				game.activities?.push({
					wolf: stubGameActive.players.at(0)!.id,
					healer: stubGameActive.players.at(1)!.id,
				});
				mockWSLatest.value = {
					type: 'morning',
					game: game,
				};
				await flushPromises();
				await nextTick();

				expect(wrapper.text()).toContain(
					`activity-summary-not-saved {victim: ${stubGameActive.players.at(0)!.nickname}}  (${locale})`
				);
			}
		}
	);

	it.each(['en', 'de'])(
		'should automatically move the game on to day time if the choices have been made',
		async (locale: string) => {
			for (let v = 0; v < 2; v++) {
				const game = structuredClone(stubGameActive);
				game.stage = 'day';
				game.activities?.push({
					wolf: stubGameActive.players.at(v)!.id,
					healer: stubGameActive.players.at(1)!.id,
				});
				storeGame.set(game);
				mockGame.getLatest = vi.fn().mockReturnValue(game);
				for (let p = 0; p < stubGameActive.players.length; p++) {
					storePlayer.set(structuredClone(stubGameActive.players[p]));
					const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

					await wrapper.find('button').trigger('click');
					await flushPromises();

					if (v == 0) {
						expect(wrapper.text()).toContain(
							`activity-summary-not-saved {victim: ${stubGameActive.players.at(0)!.nickname}}  (${locale})`
						);
					} else {
						expect(wrapper.text()).toContain(`activity-summary-saved (${locale})`);
					}
				}
			}
		}
	);

	it.each(['en', 'de'])(
		'should handle any errors submitting the choices',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubWolf, stubHealer];
			const roles = [Role.WOLF, Role.HEALER];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				const game = structuredClone(stubGameActive);
				game.activities?.push({
					wolf: roles[p] === Role.WOLF ? stubGameActive.players.at(0)!.id : null,
					healer: roles[p] === Role.HEALER ? stubGameActive.players.at(0)!.id : null,
				});
				await triggerChoice(
					wrapper,
					stubGameActive.id,
					players[p],
					roles[p],
					true,
					403,
					UnauthorisedErrorResponse
				);

				expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
				expect(wrapper.text()).toContain('unexpected-error');
			}
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if a choice is made for a non-existent game',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubWolf, stubHealer];
			const roles = [Role.WOLF, Role.HEALER];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				const game = structuredClone(stubGameActive);
				game.activities?.push({
					wolf: roles[p] === Role.WOLF ? stubGameActive.players.at(0)!.id : null,
					healer: roles[p] === Role.HEALER ? stubGameActive.players.at(0)!.id : null,
				});
				await triggerChoice(
					wrapper,
					stubGameActive.id,
					players[p],
					roles[p],
					true,
					404,
					GameIdNotFoundErrorResponse
				);

				expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
				expect(wrapper.text()).toContain('game-not-found');
			}
		}
	);

	it.each(['en', 'de'])(
		'should not error if a null WebSocket event comes through',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

			expect(async () => {
				mockWSLatest.value = null;
				await flushPromises();
			}).not.toThrow();
			expect(wrapper.text()).toContain('you-are');
		}
	);

	it.each(['en', 'de'])(
		'should only listen for the "morning" event at night-time',
		async (locale: string) => {
			const game = structuredClone(stubGameActive);
			game.stage = 'night';
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

			expect(async () => {
				mockWSLatest.value = {
					type: 'start-game',
					game: game,
					role: Role.VILLAGER,
				};
				await flushPromises();
			}).not.toThrow();
			expect(wrapper.text()).toContain('you-are');
			expect(storePlayer.roles).not.toContain(Role.VILLAGER);
		}
	);
});
