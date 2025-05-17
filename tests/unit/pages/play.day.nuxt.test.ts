import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/play/[[id]].vue';
import BouncingDots from '@/components/BouncingDots.vue';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockGame } from '@tests/unit/setup/game';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubNuxtLink } from '@tests/unit/setup/navigation';
import {
	stubGameCorrectVotes,
	stubGameIncompleteActivity,
	stubGameIncorrectVotes1,
	stubGameIncorrectVotes2,
	stubGameTie,
	stubGameWolfWin,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubVotesTie,
	stubWolf,
} from '@tests/unit/setup/stubs';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSLatest } from '@tests/unit/setup/websocket';

setupRuntimeConfigForApis();

describe('Play Game (Day time) page', () => {
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

	const triggerVote = async (
		wrapper: VueWrapper,
		id: string,
		player: Player,
		submit: boolean,
		responseCode?: number,
		responseData?: object
	) => {
		let body;
		server.use(
			http.put(url + id + '/day', async ({ request }) => {
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
			expect(body).toEqual({ player: player.id, vote: target!.id });
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
			storeGame.set(structuredClone(stubGameIncompleteActivity));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncompleteActivity);
			const players = [stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer];
			const roles = ['A-VILLAGER', 'A-VILLAGER', 'A-VILLAGER', 'THE-WOLF', 'THE-HEALER'];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

				expect(wrapper.text()).toContain(`you-are (${locale})`);
				expect(wrapper.text()).toContain(`${roles[p]} (${locale.toUpperCase()})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should display the correct day time voting page for the alive players',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameIncompleteActivity));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncompleteActivity);
			const players = [stubWolf, stubHealer, stubMayor, stubVillager7, stubVillager8];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`day-time (${locale})`);
				expect(wrapper.text()).toContain(`time-for-the-village-to-vote (${locale})`);

				const buttons = wrapper.findAll('button');
				expect(buttons.length).toBe(4);
			}
		}
	);

	it.each(['en', 'de'])(
		'should display the correct day time page without voting options for the dead players',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			const activity = game.activities?.at(-1);
			activity!.votes = {};
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			const players = [stubVillager7, stubVillager8];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameWolfWin.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`day-time (${locale})`);
				expect(wrapper.text()).toContain(`you-cannot-vote-as-you-are-dead (${locale})`);
			}
		}
	);

	// NO VOTING OPTIONS FOR EVICTED

	it.each(['en', 'de'])(
		'should submit the vote for a player and present the wait screen',
		async (locale: string) => {
			for (let p = 0; p < stubGameIncompleteActivity.players.length; p++) {
				// Villager 6 is dead according to this game so can't vote
				if (stubGameIncompleteActivity.players[p].id === stubVillager6.id) {
					continue;
				}
				const game = structuredClone(stubGameIncompleteActivity);
				storeGame.set(game);
				mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncompleteActivity);
				storePlayer.set(structuredClone(stubGameIncompleteActivity.players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

				await wrapper.find('button').trigger('click');
				await flushPromises();

				// Have them vote for the mayor as that will be the first button
				// (as triggered in triggerVote)
				game.activities!.at(-1)!.votes = {};
				game.activities!.at(-1)!.votes![stubGameIncompleteActivity.players[p].id] =
					stubMayor.id;
				await triggerVote(
					wrapper,
					stubGameIncompleteActivity.id,
					stubGameIncompleteActivity.players[p],
					true,
					200,
					game
				);

				expect(wrapper.text()).toContain(`you-have-voted (${locale})`);
				expect(wrapper.findComponent(BouncingDots).exists()).toBeTruthy();
			}
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when all votes are in and the game is still on (with an eviction)',
		async (locale: string) => {
			const game = structuredClone(stubGameIncorrectVotes2);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager7));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncorrectVotes2.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(wrapper, stubGameIncorrectVotes2.id, stubVillager7, true, 200, game);

			game.activities!.at(-1)!.votes![stubVillager7.id] = stubVillager6.id;
			game.activities!.at(-1)!.evicted = stubVillager6.id;
			mockWSLatest.value = {
				type: 'eviction',
				game: game,
				player: stubVillager6,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`you-have-not-chosen-the-wolf (${locale})`);
			expect(wrapper.text()).toContain(
				`you-have-evicted {evicted: ${stubVillager6.nickname}}  (${locale})`
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when all votes are in and the game is still on (with no eviction)',
		async (locale: string) => {
			const game = structuredClone(stubGameTie);
			game.activities!.at(-1)!.votes = structuredClone(stubVotesTie);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + stubGameTie.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(wrapper, stubGameTie.id, stubVillager6, true, 200, game);

			game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			game.activities!.at(-1)!.evicted = null;
			mockWSLatest.value = {
				type: 'eviction',
				game: game,
				player: null,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`you-have-not-chosen-the-wolf (${locale})`);
			expect(wrapper.text()).toContain(`you-have-evicted-nobody (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should present the results for the evicted player when all votes are in and the game is still on',
		async (locale: string) => {
			const game = structuredClone(stubGameIncorrectVotes1);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncorrectVotes1.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(wrapper, stubGameIncorrectVotes1.id, stubVillager6, true, 200, game);

			game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			game.activities!.at(-1)!.evicted = stubVillager6.id;
			mockWSLatest.value = {
				type: 'eviction',
				game: game,
				player: stubVillager6,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`you-have-been-evicted (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should move the screen on to the next night after votes are in and the button is clicked',
		async (locale: string) => {
			const game = structuredClone(stubGameIncorrectVotes1);
			const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = remainingVotes;
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncorrectVotes1.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(wrapper, stubGameIncorrectVotes1.id, stubWolf, true, 200, game);

			game.activities!.at(-1)!.votes![stubVillager7.id] = stubWolf.id;
			game.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
			game.activities!.at(-1)!.evicted = null;
			mockWSLatest.value = {
				type: 'eviction',
				game: game,
				player: null,
			};
			await flushPromises();

			const button = wrapper.find('button');
			await button.trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('night-descends');
			const buttons = wrapper.findAll('button');
			expect(buttons.length).toBe(4);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has been found (for the villagers)',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameCorrectVotes));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameCorrectVotes);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + stubGameCorrectVotes.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const game = structuredClone(stubGameCorrectVotes);
			await triggerVote(wrapper, stubGameCorrectVotes.id, stubVillager6, true, 200, game);

			game.activities!.at(-1)!.votes![stubVillager6.id] = stubMayor.id;
			game.winner = 'village';
			mockWSLatest.value = {
				type: 'game-over',
				game: game,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(
				`congratulations-village {wolf: ${stubWolf.nickname}}  (${locale})`
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has been found (for the wolf)',
		async (locale: string) => {
			const game = structuredClone(stubGameCorrectVotes);
			const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = remainingVotes;
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(wrapper, game.id, stubWolf, true, 200, game);

			game.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
			game.winner = 'village';
			mockWSLatest.value = {
				type: 'game-over',
				game: game,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`you-lost-wolf (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has won (for the villagers)',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameWolfWin));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameWolfWin);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + stubGameWolfWin.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			// Fix the votes so the wolf is voted out
			const game = structuredClone(stubGameWolfWin);
			game.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			game.winner = 'wolf';
			await triggerVote(wrapper, stubGameWolfWin.id, stubMayor, true, 200, game);
			mockWSLatest.value = {
				type: 'game-over',
				game: game,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(
				`you-lost-village {wolf: ${stubWolf.nickname}}  (${locale})`
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has won (for the wolf)',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = remainingVotes;
			storeGame.set(structuredClone(game));
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			game.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			game.activities!.at(-1)!.votes![stubWolf.id] = stubHealer.id;
			game.winner = 'wolf';
			await triggerVote(wrapper, game.id, stubWolf, true, 200, game);

			mockWSLatest.value = {
				type: 'game-over',
				game: game,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`congratulations-wolf (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when refreshing on a completed game',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			game.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			game.winner = 'wolf';
			game.active = false;
			game.finished = new Date();
			storeGame.set(structuredClone(game));
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`congratulations-wolf (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should handle any errors submitting the choices',
		async (locale: string) => {
			const game = structuredClone(stubGameIncompleteActivity);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncompleteActivity);
			storePlayer.set(structuredClone(stubVillager7));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(
				wrapper,
				stubGameIncompleteActivity.id,
				stubVillager7,
				true,
				403,
				UnauthorisedErrorResponse
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('unexpected-error');
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if a choice is made for a non-existent game',
		async (locale: string) => {
			const game = structuredClone(stubGameIncompleteActivity);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncompleteActivity);
			storePlayer.set(structuredClone(stubVillager7));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			await triggerVote(
				wrapper,
				stubGameIncompleteActivity.id,
				stubVillager7,
				true,
				404,
				GameIdNotFoundErrorResponse
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('game-not-found');
		}
	);

	it.each(['en', 'de'])(
		'should only listen for the "eviction" or "game over" event at day-time',
		async (locale: string) => {
			const game = structuredClone(stubGameIncompleteActivity);
			game.stage = 'day';
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

			expect(async () => {
				mockWSLatest.value = {
					type: 'morning',
					game: game,
				};
				await flushPromises();
			}).not.toThrow();
			expect(wrapper.text()).toContain('you-are');
		}
	);
});
