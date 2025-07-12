import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

import BouncingDots from '@/components/BouncingDots.vue';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';

import {
	stubActivityIncorrectVotes1,
	stubGameCorrectVotes,
	stubGameHealerOnly,
	stubGameIncompleteActivity,
	stubGameIncorrectVotes1,
	stubGameIncorrectVotes2,
	stubGameTie,
	stubGameWolfOnly,
	stubGameWolfWin,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubVotesTie,
	stubWolf,
} from '@tests/common/stubs';
import { mockGame } from '@tests/unit/setup/game';
import { setupPage, triggerAction } from '@tests/unit/setup/page';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSLatest } from '@tests/unit/setup/websocket';

setupRuntimeConfigForApis();

describe('Play Game (Day time) page', () => {
	const storeGame = useGameStore();
	const storePlayer = usePlayerStore();

	const injectSession = async (
		locale: string,
		game: Game,
		player: Player
	): Promise<[VueWrapper, Game]> => {
		const clone = structuredClone(game);
		storeGame.set(clone);
		mockGame.getLatest = vi.fn().mockReturnValue(clone);
		storePlayer.set(structuredClone(player));
		const wrapper = await setupPage(locale, '/play/' + clone.id);

		await wrapper.find('a').trigger('click');
		await flushPromises();
		return [wrapper, clone];
	};

	const triggerEvictionVillager = async (locale: string): Promise<[VueWrapper, Game]> => {
		const [wrapper, game] = await injectSession(locale, stubGameIncorrectVotes2, stubVillager7);
		const result = structuredClone(game);
		result.activities!.at(-1)!.votes![stubVillager7.id] = stubVillager6.id;
		result.activities!.at(-1)!.evicted = stubVillager6.id;
		await triggerAction(wrapper, 'vote', game, stubVillager7, true, 200, result);

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
		return [wrapper, result];
	};

	const triggerEvictionWolf = async (locale: string): Promise<[VueWrapper, Game]> => {
		const game = structuredClone(stubGameIncorrectVotes1);
		const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
		game.activities!.at(-1)!.votes = remainingVotes;
		const [wrapper, result] = await injectSession(locale, game, stubWolf);

		result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
		result.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
		result.activities!.at(-1)!.evicted = stubVillager6.id;
		await triggerAction(wrapper, 'vote', game, stubWolf, true, 200, result);

		mockWSLatest.value = {
			type: 'eviction',
			game: result,
			player: stubVillager6, // null,
		};
		await flushPromises();
		return [wrapper, game];
	};

	const triggerTie = async (locale: string): Promise<VueWrapper> => {
		const game = structuredClone(stubGameTie);
		game.activities!.at(-1)!.votes = structuredClone(stubVotesTie);
		const [wrapper, result] = await injectSession(locale, game, stubVillager6);

		result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
		result.activities!.at(-1)!.evicted = null;
		await triggerAction(wrapper, 'vote', game, stubVillager6, true, 200, result);

		mockWSLatest.value = {
			type: 'eviction',
			game: result,
			player: null,
		};
		await flushPromises();
		return wrapper;
	};

	const triggerEndGame = async (
		locale: string,
		game: Game,
		player: Player,
		target: Player,
		winner: 'wolf' | 'village',
		ws: boolean
	) => {
		const [wrapper, result] = await injectSession(locale, game, player);

		result.activities!.at(-1)!.votes![player.id] = target.id;
		result.active = false;
		result.winner = winner;
		result.finished = new Date();
		await triggerAction(wrapper, 'vote', game, player, true, 200, result);

		if (ws) {
			mockWSLatest.value = {
				type: 'game-over',
				game: result,
			};
			await flushPromises();
		}

		expect(wrapper.text()).toContain(`game-over (${locale})`);
		if (player.id !== stubWolf.id) {
			if (winner === 'village') {
				expect(wrapper.text()).toContain(`congratulations-village (${locale})`);
			} else {
				expect(wrapper.text()).toContain(`you-lost-village (${locale})`);
			}
			expect(wrapper.text()).toContain(
				`the-wolf-was {wolf: ${stubWolf.nickname}}  (${locale})`
			);
		} else {
			if (winner === 'village') {
				expect(wrapper.text()).toContain(`you-lost-wolf (${locale})`);
			} else {
				expect(wrapper.text()).toContain(`congratulations-wolf (${locale})`);
			}
			expect(wrapper.text()).not.toContain(
				`the-wolf-was {wolf: ${stubWolf.nickname}}  (${locale})`
			);
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
			for (const player of players) {
				storePlayer.set(structuredClone(player));
				const wrapper = await setupPage(locale, '/play/' + stubGameIncompleteActivity.id);

				await wrapper.find('a').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`day-time (${locale})`);
				expect(wrapper.text()).toContain(`time-for-the-village-to-vote (${locale})`);

				const buttons = wrapper.findAll('a');
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
			for (const player of players) {
				storePlayer.set(structuredClone(player));
				const wrapper = await setupPage(locale, '/play/' + stubGameWolfWin.id);

				await wrapper.find('a').trigger('click');
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

			await wrapper.find('a').trigger('click');
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

				await wrapper.find('a').trigger('click');
				await flushPromises();

				// Have them vote for the mayor as that will be the first button
				// (as triggered in triggerVote)
				game.activities!.at(-1)!.votes = {};
				game.activities!.at(-1)!.votes![stubGameIncompleteActivity.players[p].id] =
					stubMayor.id;
				await triggerAction(wrapper, 'vote', game, game.players[p], true, 200, game);

				expect(wrapper.text()).toContain(`you-have-voted (${locale})`);
				expect(wrapper.findComponent(BouncingDots).exists()).toBeTruthy();
			}
		}
	);

	it.each(['en', 'de'])(
		'should move the screen on for the last player to vote (without the need for a socket event) where the game is not over',
		async (locale: string) => {
			const game = structuredClone(stubGameIncorrectVotes1);
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameIncorrectVotes1);
			storePlayer.set(structuredClone(stubVillager6));
			const wrapper = await setupPage(locale, '/play/' + stubGameIncorrectVotes1.id);

			await wrapper.find('a').trigger('click');
			await flushPromises();

			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubMayor.id;
			game.activities!.at(-1)!.evicted = stubVillager6.id;
			await triggerAction(wrapper, 'vote', game, stubVillager6, true, 200, game);

			expect(wrapper.text()).toContain(`you-have-been-evicted (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when all votes are in and the game is still on (with an eviction)',
		async (locale: string) => {
			await triggerEvictionVillager(locale);
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when all votes are in and the game is still on (with no eviction)',
		async (locale: string) => {
			const wrapper = await triggerTie(locale);

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

			await wrapper.find('a').trigger('click');
			await flushPromises();

			const result = structuredClone(game);
			result.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			result.activities!.at(-1)!.evicted = stubVillager6.id;
			await triggerAction(wrapper, 'vote', game, stubVillager6, true, 200, result);

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
			const [wrapper] = await triggerEvictionWolf(locale);

			const button = wrapper.find('a');
			await button.trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('night-descends');
			const buttons = wrapper.findAll('a');
			expect(buttons.length).toBe(3);
		}
	);

	it.each(['en', 'de'])(
		'should handle an empty activity when the screen is moved on to the next night',
		async (locale: string) => {
			const [wrapper, game] = await triggerEvictionWolf(locale);

			game.activities = [];
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));

			const button = wrapper.find('a');
			await button.trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('night-descends');
		}
	);

	it.each(['en', 'de'])(
		'should handle an incomplete activity when the screen is moved on to the next night',
		async (locale: string) => {
			const [wrapper, game] = await triggerEvictionWolf(locale);

			game.activities = [stubActivityIncorrectVotes1];
			storeGame.set(game);
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubWolf));

			const button = wrapper.find('a');
			await button.trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('night-descends');
		}
	);

	it.each(['en', 'de'])(
		'should override the state of the game for a standard villager if the wolf/healer have chosen',
		async (locale: string) => {
			const [wrapper, result] = await triggerEvictionVillager(locale);
			const button = wrapper.find('a');
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
				game: result, //game,
			};
			await flushPromises();

			await wrapper.find('a').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('time-for-the-village-to-vote');
		}
	);

	it.each(['en', 'de'])(
		'should not override the state of the game for a villager if the wolf/healer have not chosen',
		async (locale: string) => {
			const wrapper = await triggerTie(locale);

			await wrapper.find('a').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain('we-wait');
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen for the last voter (without the need for a socket event) and the wolf has been found (for the villagers)',
		async (locale: string) => {
			await triggerEndGame(
				locale,
				stubGameCorrectVotes,
				stubVillager6,
				stubMayor,
				'village',
				false
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has been found (for the villagers)',
		async (locale: string) => {
			await triggerEndGame(
				locale,
				stubGameCorrectVotes,
				stubVillager6,
				stubMayor,
				'village',
				true
			);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has been found (for the wolf)',
		async (locale: string) => {
			const game = structuredClone(stubGameCorrectVotes);
			const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = remainingVotes;
			await triggerEndGame(locale, game, stubWolf, stubVillager6, 'village', true);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen for the last voter (without the need for a socket event) and the wolf has won (for the villagers)',
		async (locale: string) => {
			await triggerEndGame(locale, stubGameWolfWin, stubMayor, stubHealer, 'wolf', false);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has won (for the villagers)',
		async (locale: string) => {
			await triggerEndGame(locale, stubGameWolfWin, stubMayor, stubHealer, 'wolf', true);
		}
	);

	it.each(['en', 'de'])(
		'should present the end screen when all votes are in and the wolf has won (for the wolf)',
		async (locale: string) => {
			const game = structuredClone(stubGameWolfWin);
			const { [stubWolf.id]: _, ...remainingVotes } = game.activities!.at(-1)!.votes!;
			remainingVotes[stubMayor.id] = stubHealer.id;
			game.activities!.at(-1)!.votes = remainingVotes;
			await triggerEndGame(locale, game, stubWolf, stubHealer, 'wolf', true);
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
		`should handle the wolf accessing the "day" screen without having chosen`,
		async (locale: string) => {
			const original = structuredClone(stubGameHealerOnly);
			original.stage = 'day';
			const [wrapper] = await injectSession(locale, original, stubWolf);

			expect(wrapper.text()).toContain(`night-time (${locale})`);
			expect(wrapper.text()).toContain(`make-your-decision-the-wolf (${locale})`);

			const buttons = wrapper.findAll('a');
			expect(buttons.length).toBe(5);
		}
	);

	it.each(['en', 'de'])(
		`should handle the healer accessing the "day" screen without having chosen`,
		async (locale: string) => {
			const original = structuredClone(stubGameWolfOnly);
			original.stage = 'day';
			const [wrapper] = await injectSession(locale, original, stubHealer);

			expect(wrapper.text()).toContain(`night-time (${locale})`);
			expect(wrapper.text()).toContain(`make-your-decision-the-healer (${locale})`);

			const buttons = wrapper.findAll('a');
			expect(buttons.length).toBe(5);
		}
	);

	it.each(['en', 'de'])(
		`should handle a villager accessing the "day" screen without the healer and werewolf having chosen`,
		async (locale: string) => {
			const original = structuredClone(stubGameHealerOnly);
			original.stage = 'day';
			const [wrapper] = await injectSession(locale, original, stubVillager6);

			expect(wrapper.text()).toContain(`night-time (${locale})`);
			expect(wrapper.text()).toContain(`we-wait (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should handle any errors submitting the choices',
		async (locale: string) => {
			const [wrapper, game] = await injectSession(
				locale,
				stubGameIncompleteActivity,
				stubVillager7
			);

			await triggerAction(
				wrapper,
				'vote',
				game,
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
			const [wrapper, game] = await injectSession(
				locale,
				stubGameIncompleteActivity,
				stubVillager7
			);

			await triggerAction(
				wrapper,
				'vote',
				game,
				stubVillager7,
				true,
				404,
				GameIdNotFoundErrorResponse
			);

			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('game-not-found');
		}
	);
});
