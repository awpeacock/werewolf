import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubGameActive,
	stubGameDeadHealer,
	stubGameHealerOnly,
	stubGameIncorrectVotes1,
	stubGameWolfOnly,
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

test.describe('Play games (Night)', () => {
	test.each(['en', 'de'])(
		'Handle the wolf returning to the game where neither has chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
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
			await expect(page).toBeMakingDecision();
			game.activities = [{ wolf: stubHealer.id, healer: null, votes: {} }];
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({ session: page, parameters: { target: stubHealer.nickname } });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game having already chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameWolfOnly, stubWolf);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameWolfOnly.id}/`,
				200,
				JSON.stringify(stubGameWolfOnly),
				true
			);
			await simulation.go(`/play/${stubGameWolfOnly.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameWolfOnly.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toHaveMadeDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game where the healer has chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameHealerOnly);
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
			await expect(page).toBeMakingDecision();
			game.stage = 'day';
			game.activities!.at(-1)!.wolf = stubHealer.id;
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({ session: page, parameters: { target: stubHealer.nickname } });
			await expect(page).toBeDay();
			await expect(page).toHaveBeenKilled(stubHealer.nickname);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game where neither has chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
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
			await expect(page).toBeMakingDecision();
			game.activities = [{ wolf: null, healer: stubWolf.id, votes: {} }];
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({ session: page, parameters: { target: stubWolf.nickname } });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a healer returning to the game having already chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameHealerOnly, stubHealer);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameHealerOnly.id}/`,
				200,
				JSON.stringify(stubGameHealerOnly),
				true
			);
			await simulation.go(`/play/${stubGameHealerOnly.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameHealerOnly.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toHaveMadeDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game where the wolf has chosen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameWolfOnly);
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
			await expect(page).toBeMakingDecision();
			game.stage = 'day';
			game.activities!.at(-1)!.healer = stubVillager6.id;
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({
				session: page,
				parameters: { target: stubVillager6.nickname },
			});
			await expect(page).toBeDay();
			await expect(page).toHaveBeenKilled();
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game when dead',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameDeadHealer);
			const votes = game.activities!.at(-1)!.votes!;
			votes[stubVillager6.id] = stubWolf.id;
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
			await expect(page).toHaveEvicted();
			await simulation.progress(false, { session: page });

			await expect(page).toBeNight();
			await expect(page).not.toBeMakingDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game when evicted',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			const activity: Activity = {
				wolf: stubVillager6.id,
				healer: stubVillager6.id,
				evicted: stubHealer.id,
				votes: {},
			};
			activity.votes![stubMayor.id] = stubHealer.id;
			activity.votes![stubWolf.id] = stubHealer.id;
			activity.votes![stubHealer.id] = stubMayor.id;
			activity.votes![stubVillager6.id] = stubHealer.id;
			activity.votes![stubVillager7.id] = stubHealer.id;
			activity.votes![stubVillager8.id] = stubHealer.id;
			game.activities = [activity];
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
			await expect(page).toHaveBeenEvicted();
			await simulation.progress(false, { session: page });

			await expect(page).toBeNight();
			await expect(page).not.toBeMakingDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where the wolf has to choose',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameHealerOnly, stubVillager6);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameHealerOnly.id}/`,
				200,
				JSON.stringify(stubGameHealerOnly),
				true
			);
			await simulation.go(`/play/${stubGameHealerOnly.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameHealerOnly.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
			await expect(page).not.toBeMakingDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where the healer has to choose',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameWolfOnly, stubVillager6);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameWolfOnly.id}/`,
				200,
				JSON.stringify(stubGameWolfOnly),
				true
			);
			await simulation.go(`/play/${stubGameWolfOnly.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameWolfOnly.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
			await expect(page).not.toBeMakingDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where both the wolf and healer have to choose',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive, stubVillager6);
			await page.reload();
			await mockApi(
				page,
				`/api/games/${stubGameActive.id}/`,
				200,
				JSON.stringify(stubGameActive),
				true
			);
			await simulation.go(`/play/${stubGameActive.id}/`, {
				navigate: true,
				parameters: { button: 'resume-game' },
			});
			await expect(page).toBePlayPage(stubGameActive.id);
			await expect(page).toBeRolePage();
			await simulation.progress(false, { session: page });
			await expect(page).toBeNight();
			await expect(page).not.toBeMakingDecision();
		}
	);

	test.each(['en', 'de'])(
		'Handle a wolf/healer accessing the "night" screen without a new activity in place',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameIncorrectVotes1);
			game.stage = 'night';
			game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
			await simulation.inject(game, stubWolf);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);

			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();
			await expect(page).toHaveEvicted();
			await simulation.progress(false, { session: page });

			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a player accessing the "night" screen without all votes having been made',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameIncorrectVotes1;
			game.stage = 'night';
			await simulation.inject(game, stubMayor);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();
			await expect(page).toBeDay();
		}
	);

	test.each(['en', 'de'])('Handle a 404 error trying to vote', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');
		const game = structuredClone(stubGameIncorrectVotes1);
		await simulation.inject(game, stubVillager6);
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/play/${game.id}`);
		await simulation.rejoin();

		await expect(page).toBeDay();
		await mockApi(
			page,
			`/api/games/${game.id}/day`,
			404,
			JSON.stringify(GameIdNotFoundErrorResponse),
			true
		);
		await simulation.vote({
			session: page,
			parameters: { target: stubWolf.nickname },
			result: { success: false },
		});
		await expect(page).toBeDay();
		await expect(page).toHaveError('game-not-found');
	});

	test.each(['en', 'de'])('Handle a 500 error trying to vote', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');
		const game = structuredClone(stubGameIncorrectVotes1);
		await simulation.inject(game, stubVillager6);
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/play/${game.id}`);
		await simulation.rejoin();

		await expect(page).toBeDay();
		await mockApi(
			page,
			`/api/games/${game.id}/day`,
			500,
			JSON.stringify(UnexpectedErrorResponse),
			true
		);
		await simulation.vote({
			session: page,
			parameters: { target: stubWolf.nickname },
			result: { success: false },
		});
		await expect(page).toBeDay();
		await expect(page).toHaveError('unexpected-error');
	});
});
