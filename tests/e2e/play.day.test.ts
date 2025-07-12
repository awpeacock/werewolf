import type { Page } from '@playwright/test';

import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubGameActive,
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
	stubWolf,
} from '@tests/common/stubs';
import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import type { Simulation } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';
import { setup, expectDay } from '@tests/e2e/play.common';

test.describe('Play games (Day)', () => {
	const vote = async (
		simulation: Simulation,
		page: Page,
		game: Game,
		player: Player,
		target: Player,
		init: boolean,
		evicted?: Player
	) => {
		if (init) {
			game.activities!.at(-1)!.votes = {};
		}
		game.activities!.at(-1)!.votes![player.id] = target.id;
		if (evicted) {
			game.activities!.at(-1)!.evicted = stubVillager6.id;
		}
		await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
		await simulation.vote({
			session: page,
			parameters: { target: target.nickname },
		});
		await expect(page).toHaveVoted();
	};

	const fail = async (
		simulation: Simulation,
		page: Page,
		game: Game,
		target: Player,
		code: number,
		response: APIErrorResponse,
		message: string
	) => {
		await mockApi(page, `/api/games/${game.id}/day`, code, JSON.stringify(response), true);
		await simulation.vote({
			session: page,
			parameters: { target: target.nickname },
			result: { success: false },
		});
		await expect(page).toBeDay();
		await expect(page).toHaveError(message);
	};

	const choose = async (simulation: Simulation, page: Page, game: Game, player: Player) => {
		await simulation.inject(game, player);
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/play/${game.id}`);
		await simulation.rejoin();
		await expect(page).toBeNight();

		// Check it still allows us to choose
		game.activities = [{ wolf: stubVillager6.id, healer: stubVillager6.id }];
		await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
		await simulation.choose({
			session: page,
			parameters: {
				target: stubVillager6.nickname,
			},
			result: { success: true },
		});
		await expect(page).toBeDay();
	};

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game and needing to vote',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameIncompleteActivity,
				stubWolf
			);
			await expectDay(page, 'voting', false);
			await vote(simulation, page, game, stubWolf, stubVillager7, true);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game and needing to vote',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameIncompleteActivity,
				stubHealer
			);
			await expectDay(page, 'voting', false);
			await vote(simulation, page, game, stubHealer, stubVillager7, true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game and needing to vote',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameIncompleteActivity,
				stubVillager8
			);
			await expectDay(page, 'voting', false);
			await vote(simulation, page, game, stubVillager8, stubVillager7, true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (tie)',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameTie, stubVillager6);
			await expectDay(page, 'voting', false);
			game.stage = 'night';
			await vote(simulation, page, game, stubVillager6, stubVillager7, false);
			await expect(page).not.toHaveBeenEvicted();
			await expect(page).toHaveEvicted();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (voter evicted)',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameIncorrectVotes1,
				stubVillager6
			);
			await expectDay(page, 'voting', false);
			game.stage = 'night';
			await vote(simulation, page, game, stubVillager6, stubVillager7, false, stubVillager6);
			await expect(page).toHaveBeenEvicted();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (other person evicted)',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameIncorrectVotes2,
				stubVillager7
			);
			await expectDay(page, 'voting', false);
			game.stage = 'night';
			await vote(simulation, page, game, stubVillager7, stubVillager6, false, stubVillager6);
			await expect(page).not.toHaveBeenEvicted();
			await expect(page).toHaveEvicted(stubVillager6.nickname);
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf voting and completing the votes for the day (wolf evicted)',
		async ({ locale, page }) => {
			const original = structuredClone(stubGameCorrectVotes);
			const { [stubWolf.id]: _removed, ...votes } = original.activities!.at(-1)!.votes!;
			original.activities!.at(-1)!.votes = votes;
			original.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			const [simulation, game] = await setup(page, locale, original, stubWolf);
			await expectDay(page, 'voting', false);
			game.active = false;
			game.winner = 'village';
			game.finished = new Date();
			game.activities!.at(-1)!.votes![stubWolf.id] = stubVillager6.id;
			game.activities!.at(-1)!.evicted = stubWolf.id;
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager6.nickname },
			});
			await expect(page).toHaveVoted();
			await expect(page).toBeFinished();
			await expect(page).not.toHaveWon('wolf', stubWolf.nickname);
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (wolf evicted)',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(
				page,
				locale,
				stubGameCorrectVotes,
				stubVillager6
			);
			await expectDay(page, 'voting', false);
			game.active = false;
			game.winner = 'village';
			game.finished = new Date();
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			game.activities!.at(-1)!.evicted = stubWolf.id;
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({ session: page, parameters: { target: stubWolf.nickname } });
			await expect(page).toHaveVoted();
			await expect(page).toBeFinished();
			await expect(page).toHaveWon('village', stubWolf.nickname);
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf voting and completing the votes for the day (wolf wins)',
		async ({ locale, page }) => {
			const original = structuredClone(stubGameWolfWin);
			const { [stubWolf.id]: _removed, ...votes } = original.activities!.at(-1)!.votes!;
			original.activities!.at(-1)!.votes = votes;
			original.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			const [simulation, game] = await setup(page, locale, original, stubWolf);
			await expectDay(page, 'voting', false);
			game.active = false;
			game.winner = 'wolf';
			game.finished = new Date();
			game.activities!.at(-1)!.votes![stubWolf.id] = stubHealer.id;
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({ session: page, parameters: { target: stubHealer.nickname } });
			await expect(page).toHaveVoted();
			await expect(page).toBeFinished();
			await expect(page).toHaveWon('wolf');
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (wolf wins)',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameWolfWin, stubMayor);
			await expectDay(page, 'voting', false);
			game.active = false;
			game.winner = 'wolf';
			game.finished = new Date();
			game.activities!.at(-1)!.votes = {};
			game.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({ session: page, parameters: { target: stubHealer.nickname } });
			await expect(page).toHaveVoted();
			await expect(page).toBeFinished();
			await expect(page).not.toHaveWon('village', stubWolf.nickname);
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Handle a dead player returning to the game and not being allowed to vote',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameIncompleteActivity, stubVillager6);
			await expectDay(page, 'voting', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle an evicted player returning to the game and not being allowed to vote',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameWolfWin, stubVillager6);
			await expectDay(page, 'voting', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a player returning to the game and having already voted',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameIncorrectVotes1, stubVillager7);
			await expectDay(page, 'voted', false);
		}
	);

	test.each(['en', 'de'])(
		'Handle a user accessing the "day" screen without a votes object in place',
		async ({ locale, page }) => {
			const game = structuredClone(stubGameActive);
			game.stage = 'day';
			game.activities = [{ wolf: stubVillager6.id, healer: stubVillager6.id }];
			await setup(page, locale, game, stubWolf);
			await expectDay(page, 'voting', false);
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf accessing the "day" screen without having chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameHealerOnly);
			game.stage = 'day';
			await choose(simulation, page, game, stubWolf);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer accessing the "day" screen without having chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfOnly);
			game.stage = 'day';
			await choose(simulation, page, game, stubHealer);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager accessing the "day" screen without the healer and werewolf having chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			game.stage = 'day';
			game.activities = [{ healer: stubVillager6.id }];
			await simulation.inject(game, stubMayor);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])('Handle a 404 error trying to vote', async ({ locale, page }) => {
		const [simulation, game] = await setup(
			page,
			locale,
			stubGameIncorrectVotes1,
			stubVillager6
		);
		await expectDay(page, 'voting', false);
		await fail(
			simulation,
			page,
			game,
			stubWolf,
			404,
			GameIdNotFoundErrorResponse,
			'game-not-found'
		);
	});

	test.each(['en', 'de'])('Handle a 500 error trying to vote', async ({ locale, page }) => {
		const [simulation, game] = await setup(
			page,
			locale,
			stubGameIncorrectVotes1,
			stubVillager6
		);
		await expectDay(page, 'voting', false);
		await fail(
			simulation,
			page,
			game,
			stubWolf,
			500,
			UnexpectedErrorResponse,
			'unexpected-error'
		);
	});
});
