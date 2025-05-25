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
		game: Game,
		player: Player,
		submit: boolean,
		responseCode?: number,
		responseData?: object
	) => {
		let body;
		server.use(
			http.put(url + game.id + '/day', async ({ request }) => {
				body = await request.json();
				spyApi(body);
				return HttpResponse.json(responseData, { status: responseCode });
			})
		);

		const button = wrapper.find('button');
		const name = button.text();
		let voting = false;
		for (const p of game.players) {
			if (p.nickname === name) {
				voting = true;
			}
		}
		expect(voting).toBeTruthy();
		button.trigger('click');
		await flushPromises();
		await nextTick();

		if (submit) {
			await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
			expect(spyApi).toHaveBeenCalled();
			const target = storeGame.findPlayer(button.text());
			expect(body).toEqual({ player: player.id, vote: target!.id });
			// Make sure we no longer have any voting options
			if (responseCode === 200) {
				const buttons = wrapper.findAll('button');
				for (const p of game.players) {
					const button = buttons.filter((b) => b.text().includes(p.nickname));
					expect(button.length).toBe(0);
				}
			}
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

	it.each(['en', 'de'])(
		'should display the correct day time page without voting options for the evicted players',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			const activity = game.activities?.at(-1);
			activity!.votes = {};
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + stubGameWolfWin.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain(`day-time (${locale})`);
			expect(wrapper.text()).toContain(
				`you-cannot-vote-as-you-have-been-evicted (${locale})`
			);
		}
	);

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
				await triggerVote(wrapper, game, game.players[p], true, 200, game);

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
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager7.id] = stubVillager6.id;
			result.activities!.at(-1)!.evicted = stubVillager6.id;
			await triggerVote(wrapper, game, stubVillager7, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
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
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			result.activities!.at(-1)!.evicted = null;
			await triggerVote(wrapper, game, stubVillager6, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
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
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			result.activities!.at(-1)!.evicted = stubVillager6.id;
			await triggerVote(wrapper, game, stubVillager6, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
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
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager7.id] = stubWolf.id;
			result.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
			result.activities!.at(-1)!.evicted = null;
			await triggerVote(wrapper, game, stubWolf, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
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
		'should override the state of the game for a standard villager if the wolf/healer have chosen',
		async (locale: string) => {
			const game = structuredClone(stubGameTie);
			game.activities!.at(-1)!.votes = structuredClone(stubVotesTie);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			result.activities!.at(-1)!.evicted = null;
			await triggerVote(wrapper, game, stubVillager6, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
				player: null,
			};
			await flushPromises();
			await nextTick();
			const button = wrapper.find('button');
			expect(button.text()).toEqual(`continue (${locale})`);

			// Simulate the wolf and healer choosing in the background
			const activity: Activity = {
				wolf: stubVillager6.id,
				healer: stubVillager6.id,
				votes: {},
			};
			result.activities!.push(activity);
			mockWSLatest.value = {
				type: 'morning',
				game: game,
			};
			await flushPromises();

			await wrapper.find('button').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('time-for-the-village-to-vote');
		}
	);

	it.each(['en', 'de'])(
		'should not override the state of the game for a villager if the wolf/healer have not chosen',
		async (locale: string) => {
			const game = structuredClone(stubGameTie);
			game.activities!.at(-1)!.votes = structuredClone(stubVotesTie);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			result.activities!.at(-1)!.evicted = null;
			await triggerVote(wrapper, game, stubVillager6, true, 200, result);

			mockWSLatest.value = {
				type: 'eviction',
				game: result,
				player: null,
			};
			await flushPromises();

			await wrapper.find('button').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('we-wait');
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has been found (for the villagers)',
		async (locale: string) => {
			const game = structuredClone(stubGameCorrectVotes);
			storeGame.set(structuredClone(game));
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubMayor.id;
			result.winner = 'village';
			await triggerVote(wrapper, game, stubVillager6, true, 200, result);

			mockWSLatest.value = {
				type: 'game-over',
				game: result,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`congratulations-village (${locale})`);
			expect(wrapper.text()).toContain(
				`the-wolf-was {wolf: ${stubWolf.nickname}}  (${locale})`
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

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
			result.winner = 'village';
			await triggerVote(wrapper, game, stubWolf, true, 200, result);

			mockWSLatest.value = {
				type: 'game-over',
				game: result,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`you-lost-wolf (${locale})`);
			expect(wrapper.text()).not.toContain(
				`the-wolf-was {wolf: ${stubWolf.nickname}}  (${locale})`
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has won (for the villagers)',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			storeGame.set(structuredClone(game));
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('button').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			result.winner = 'wolf';
			await triggerVote(wrapper, game, stubMayor, true, 200, result);
			mockWSLatest.value = {
				type: 'game-over',
				game: result,
			};
			await flushPromises();

			expect(wrapper.text()).toContain(`game-over (${locale})`);
			expect(wrapper.text()).toContain(`you-lost-village (${locale})`);
			expect(wrapper.text()).toContain(
				`the-wolf-was {wolf: ${stubWolf.nickname}}  (${locale})`
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
			await triggerVote(wrapper, game, stubWolf, true, 200, game);

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

			await triggerVote(wrapper, game, stubVillager7, true, 403, UnauthorisedErrorResponse);

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

			await triggerVote(wrapper, game, stubVillager7, true, 404, GameIdNotFoundErrorResponse);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('game-not-found');
		}
	);
});
