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
import { test } from '@tests/e2e/setup/test';

test.describe('Play games (Day)', () => {
	test.each(['en', 'de'])(
		'Handle the wolf returning to the game and needing to vote',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncompleteActivity);
			await simulation.inject(game, stubWolf);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.activities!.at(-1)!.votes = {};
			game.activities!.at(-1)!.votes![stubWolf.id] = stubVillager7.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager7.nickname },
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game and needing to vote',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncompleteActivity);
			await simulation.inject(game, stubHealer);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.activities!.at(-1)!.votes = {};
			game.activities!.at(-1)!.votes![stubHealer.id] = stubVillager7.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager7.nickname },
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game and needing to vote',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncompleteActivity);
			await simulation.inject(game, stubVillager8);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.activities!.at(-1)!.votes = {};
			game.activities!.at(-1)!.votes![stubVillager8.id] = stubVillager7.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager7.nickname },
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (tie)',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameTie);
			await simulation.inject(game, stubVillager6);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubVillager7.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager7.nickname },
			});
			await expect(page).toHaveVoted();
			await expect(page).not.toHaveBeenEvicted();
			await expect(page).toHaveEvicted();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (voter evicted)',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncorrectVotes1);
			await simulation.inject(game, stubVillager6);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubVillager7.id;
			game.activities!.at(-1)!.evicted = stubVillager6.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager7.nickname },
			});
			await expect(page).toHaveVoted();
			await expect(page).toHaveBeenEvicted();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager voting and completing the votes for the day (other person evicted)',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncorrectVotes2);
			await simulation.inject(game, stubVillager7);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager7.id] = stubVillager6.id;
			game.activities!.at(-1)!.evicted = stubVillager6.id;
			await mockApi(page, `/api/games/${game.id}/day`, 200, JSON.stringify(game), true);
			await simulation.vote({
				session: page,
				parameters: { target: stubVillager6.nickname },
			});
			await expect(page).toHaveVoted();
			await expect(page).not.toHaveBeenEvicted();
			await expect(page).toHaveEvicted(stubVillager6.nickname);
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf voting and completing the votes for the day (wolf evicted)',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameCorrectVotes);
			const { [stubWolf.id]: _removed, ...votes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = votes;
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			await simulation.inject(game, stubWolf);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
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
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameCorrectVotes);
			await simulation.inject(game, stubVillager6);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
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
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfWin);
			const { [stubWolf.id]: _removed, ...votes } = game.activities!.at(-1)!.votes!;
			game.activities!.at(-1)!.votes = votes;
			game.activities!.at(-1)!.votes![stubMayor.id] = stubHealer.id;
			await simulation.inject(game, stubWolf);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
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
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfWin);
			await simulation.inject(game, stubMayor);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toBeVoting();
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
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameIncompleteActivity, stubVillager6);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameIncompleteActivity.id}/`,
				200,
				JSON.stringify(stubGameIncompleteActivity),
				true
			);
			await simulation.go(`/play/${stubGameIncompleteActivity.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameIncompleteActivity.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).not.toBeVoting();
		}
	);

	test.each(['en', 'de'])(
		'Handle an evicted player returning to the game and not being allowed to vote',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfWin);
			await simulation.inject(game, stubVillager6);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).not.toBeVoting();
		}
	);

	test.each(['en', 'de'])(
		'Handle a player returning to the game and having already voted',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncorrectVotes1);
			await simulation.inject(game, stubVillager7);
			await page.reload();
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(game.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeDay();
			await expect(page).toHaveVoted();
		}
	);

	test.each(['en', 'de'])(
		'Handle a user accessing the "day" screen without a votes object in place',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			game.stage = 'day';
			game.activities = [{ wolf: stubVillager6.id, healer: stubVillager6.id }];
			await simulation.inject(game, stubWolf);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();
			await expect(page).toBeDay();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf accessing the "day" screen without having chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameHealerOnly);
			game.stage = 'day';
			await simulation.inject(game, stubWolf);
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
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer accessing the "day" screen without having chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfOnly);
			game.stage = 'day';
			await simulation.inject(game, stubHealer);
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

	test.each(['en', 'de'])(
		'Handle a 404 error trying to choose a victim',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			await simulation.inject(game, stubWolf);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();

			await expect(page).toBeNight();
			await mockApi(
				page,
				`/api/games/${game.id}/night`,
				404,
				JSON.stringify(GameIdNotFoundErrorResponse),
				true
			);
			await simulation.choose({
				session: page,
				parameters: {
					target: stubVillager6.nickname,
				},
				result: { success: false },
			});
			await expect(page).toBeNight();
			await expect(page).toHaveError('game-not-found');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 404 error trying to save a player',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			await simulation.inject(game, stubHealer);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();

			await expect(page).toBeNight();
			await mockApi(
				page,
				`/api/games/${game.id}/night`,
				404,
				JSON.stringify(GameIdNotFoundErrorResponse),
				true
			);
			await simulation.choose({
				session: page,
				parameters: {
					target: stubVillager6.nickname,
				},
				result: { success: false },
			});
			await expect(page).toBeNight();
			await expect(page).toHaveError('game-not-found');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to choose a victim',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			await simulation.inject(game, stubWolf);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();

			await expect(page).toBeNight();
			await mockApi(
				page,
				`/api/games/${game.id}/night`,
				500,
				JSON.stringify(UnexpectedErrorResponse),
				true
			);
			await simulation.choose({
				session: page,
				parameters: {
					target: stubVillager6.nickname,
				},
				result: { success: false },
			});
			await expect(page).toBeNight();
			await expect(page).toHaveError('unexpected-error');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to save a player',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			await simulation.inject(game, stubHealer);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();

			await expect(page).toBeNight();
			await mockApi(
				page,
				`/api/games/${game.id}/night`,
				500,
				JSON.stringify(UnexpectedErrorResponse),
				true
			);
			await simulation.choose({
				session: page,
				parameters: {
					target: stubVillager6.nickname,
				},
				result: { success: false },
			});
			await expect(page).toBeNight();
			await expect(page).toHaveError('unexpected-error');
		}
	);
});
