import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

import BouncingDots from '@/components/BouncingDots.vue';
import { GameIdNotFoundErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';
import { Role } from '@/types/enums';

import {
	stubActivitiesComplete,
	stubGameActive,
	stubGameDeadHealer,
	stubGameIncorrectVotes1,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/common/stubs';
import { waitFor } from '@tests/unit/setup/global';
import { mockGame } from '@tests/unit/setup/game';
import { setupPage, triggerAction, handleError } from '@tests/unit/setup/page';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSLatest } from '@tests/unit/setup/websocket';

setupRuntimeConfigForApis();

describe('Play Game (Night time) page', () => {
	const storeGame = useGameStore();
	const storePlayer = usePlayerStore();

	const expectNoHealer = async (locale: string, game: Game, message: string, reason: string) => {
		storeGame.set(game);
		mockGame.getLatest = vi.fn().mockReturnValue(game);
		storePlayer.set(structuredClone(stubHealer));
		const wrapper = await setupPage(locale, '/play/' + game.id);

		await wrapper.find('a').trigger('click');
		await flushPromises();

		// New step - now, for people coming back in fresh we remind them of any previous evictions
		expect(wrapper.text()).toContain(`${message} (${locale})`);
		await wrapper.find('a').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain(`night-time (${locale})`);
		expect(wrapper.text()).toContain(`you-cannot-heal-because-${reason} (${locale})`);
		expect(wrapper.text()).toContain(`we-wait (${locale})`);
	};

	const makeChoice = async (locale: string, complete: boolean, ws?: boolean, same?: boolean) => {
		storeGame.set(structuredClone(stubGameActive));
		mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
		const players = ws ? stubGameActive.players : [stubWolf, stubHealer];
		const roles: Array<'wolf' | 'healer'> = ['wolf', 'healer'];
		for (let p = 0; p < players.length; p++) {
			storePlayer.set(structuredClone(players[p]));
			const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

			await wrapper.find('a').trigger('click');
			await flushPromises();
			await nextTick();

			const game = structuredClone(stubGameActive);
			if (complete) {
				game.stage = 'day';
			}
			const choices = [0, !ws || same ? 0 : 1];
			game.activities?.push({
				wolf:
					complete || roles[p] === 'wolf'
						? stubGameActive.players.at(choices[0])!.id
						: null,
				healer:
					complete || roles[p] === 'healer'
						? stubGameActive.players.at(choices[1])!.id
						: null,
			});

			if (ws) {
				await expectWsReactivity(wrapper, locale, game, same!);
			} else {
				await expectApiReactivity(wrapper, locale, game, players[p], roles[p], complete);
			}
		}
	};

	const expectWsReactivity = async (
		wrapper: VueWrapper,
		locale: string,
		game: Game,
		same: boolean
	) => {
		mockWSLatest.value = {
			type: 'morning',
			game: game,
		};
		await flushPromises();
		await nextTick();

		if (same) {
			await waitFor(() => wrapper.text().includes(`activity-summary-saved (${locale})`));
		} else {
			await waitFor(() =>
				wrapper
					.text()
					.includes(
						`activity-summary-not-saved {victim: ${stubGameActive.players.at(0)!.nickname}}  (${locale})`
					)
			);
		}
	};

	const expectApiReactivity = async (
		wrapper: VueWrapper,
		locale: string,
		game: Game,
		player: Player,
		role: 'wolf' | 'healer',
		complete: boolean
	) => {
		await triggerAction(wrapper, role, stubGameActive, player, true, 200, game);
		if (complete) {
			expect(wrapper.text()).toContain(`activity-summary-saved (${locale})`);
			expect(wrapper.text()).toContain(`time-for-the-village-to-vote (${locale})`);
		} else {
			const waitingFor = role === 'wolf' ? 'the healer' : 'the wolf';
			expect(wrapper.text()).toContain(
				`you-have-chosen {wait: ${waitingFor} (${locale})}  (${locale})`
			);
			expect(wrapper.findComponent(BouncingDots).exists()).toBeTruthy();
		}
	};

	beforeEach(() => {
		sessionStorage.clear();
		useGameStore().$reset();
		usePlayerStore().$reset();
		mockWSLatest.value = null;
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
		'should display the correct night time choice page',
		async (locale: string) => {
			storeGame.set(structuredClone(stubGameActive));
			mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
			const players = [stubWolf, stubHealer];
			const roles = ['the-wolf', 'the-healer'];
			for (let p = 0; p < players.length; p++) {
				storePlayer.set(structuredClone(players[p]));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('a').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`night-time (${locale})`);
				expect(wrapper.text()).toContain(`make-your-decision-${roles[p]} (${locale})`);

				const buttons = wrapper.findAll('a');
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
			for (const player of players) {
				storePlayer.set(structuredClone(player));
				const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

				await wrapper.find('a').trigger('click');
				await flushPromises();

				expect(wrapper.text()).toContain(`night-time (${locale})`);
				expect(wrapper.text()).toContain(`we-wait (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should NOT display the night time page for the healer if they are dead',
		async (locale: string) => {
			const game = structuredClone(stubGameDeadHealer);
			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubVillager7.id;

			await expectNoHealer(locale, game, 'you-have-not-chosen-the-wolf', 'you-are-dead');
		}
	);

	it.each(['en', 'de'])(
		'should NOT display the night time page for the healer if they are evicted',
		async (locale: string) => {
			const game = structuredClone(stubGameActive);
			game.stage = 'night';
			game.activities = [stubActivitiesComplete[0]];

			await expectNoHealer(locale, game, 'you-have-been-evicted', 'you-have-been-evicted');
		}
	);

	it.each(['en', 'de'])(
		'should submit the choices for the wolf and the healer individually and present the wait screen',
		async (locale: string) => {
			await makeChoice(locale, false);
		}
	);

	it.each(['en', 'de'])(
		'should move the game on for the wolf/healer directly (without the need for a socket event) when they are last to choose',
		async (locale: string) => {
			await makeChoice(locale, true);
		}
	);

	it.each(['en', 'de'])(
		'should present the results for all players when both have chosen the same',
		async (locale: string) => {
			await makeChoice(locale, true, true, true);
		},
		10000
	);

	it.each(['en', 'de'])(
		'should present the results for all players when the wolf and healer have chosen differently',
		async (locale: string) => {
			await makeChoice(locale, true, true, false);
		},
		10000
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
				for (const player of stubGameActive.players) {
					storePlayer.set(structuredClone(player));
					const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

					await wrapper.find('a').trigger('click');
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
		},
		10000
	);

	it.each(['en', 'de'])(
		`should handle a player accessing the "night" screen without all votes having been made`,
		async (locale: string) => {
			const game = structuredClone(stubGameIncorrectVotes1);
			game.stage = 'night';
			storeGame.set(structuredClone(game));
			mockGame.getLatest = vi.fn().mockReturnValue(game);
			storePlayer.set(structuredClone(stubMayor));
			const wrapper = await setupPage(locale, '/play/' + game.id);

			await wrapper.find('a').trigger('click');
			await flushPromises();

			expect(wrapper.text()).toContain(`day-time (${locale})`);
			expect(wrapper.text()).toContain(`time-for-the-village-to-vote (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should handle any errors submitting the choices',
		async (locale: string) => {
			await handleError(locale, 403, UnauthorisedErrorResponse, 'unexpected-error');
		}
	);

	it.each(['en', 'de'])(
		'should handle the error if a choice is made for a non-existent game',
		async (locale: string) => {
			await handleError(locale, 404, GameIdNotFoundErrorResponse, 'game-not-found');
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
