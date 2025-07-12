import type { Page } from '@playwright/test';

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
import type { Simulation } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';
import { setup, expectNight } from '@tests/e2e/play.common';

test.describe('Play games (Night)', () => {
	const fail = async (
		simulation: Simulation,
		page: Page,
		game: Game,
		code: number,
		response: APIErrorResponse,
		message: string
	) => {
		await mockApi(page, `/api/games/${game.id}/night`, code, JSON.stringify(response), true);
		await simulation.choose({
			session: page,
			parameters: {
				target: stubVillager6.nickname,
			},
			result: { success: false },
		});
		await expect(page).toBeNight();
		await expect(page).toHaveError(message);
	};

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game where neither has chosen',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameActive, stubWolf);
			await expectNight(page, 'deciding', false);
			game.activities = [{ wolf: stubHealer.id, healer: null, votes: {} }];
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({ session: page, parameters: { target: stubHealer.nickname } });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game having already chosen',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameWolfOnly, stubWolf);
			await expectNight(page, 'decided', false);
		}
	);

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game where the healer has chosen',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameHealerOnly, stubWolf);
			await expectNight(page, 'deciding', false);
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
			const [simulation, game] = await setup(page, locale, stubGameActive, stubHealer);
			await expectNight(page, 'deciding', false);
			game.activities = [{ wolf: null, healer: stubWolf.id, votes: {} }];
			await mockApi(page, `/api/games/${game.id}/night`, 200, JSON.stringify(game), true);
			await simulation.choose({ session: page, parameters: { target: stubWolf.nickname } });
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a healer returning to the game having already chosen',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameHealerOnly, stubHealer);
			await expectNight(page, 'deciding', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game where the wolf has chosen',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameWolfOnly, stubHealer);
			await expectNight(page, 'deciding', false);
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
			const original = structuredClone(stubGameDeadHealer);
			const votes = original.activities!.at(-1)!.votes!;
			votes[stubVillager6.id] = stubWolf.id;
			const [simulation] = await setup(page, locale, original, stubHealer);
			await expect(page).toHaveEvicted();
			await simulation.progress(false, { session: page });
			await expectNight(page, 'deciding', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game when evicted',
		async ({ locale, page }) => {
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
			const [simulation] = await setup(page, locale, game, stubHealer);
			await expect(page).toHaveBeenEvicted();
			await simulation.progress(false, { session: page });
			await expectNight(page, 'deciding', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where the wolf has to choose',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameHealerOnly, stubVillager6);
			await expectNight(page, 'deciding', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where the healer has to choose',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameWolfOnly, stubVillager6);
			await expectNight(page, 'deciding', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game where both the wolf and healer have to choose',
		async ({ locale, page }) => {
			await setup(page, locale, stubGameActive, stubVillager6);
			await expectNight(page, 'deciding', true);
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

	test.each(['en', 'de'])(
		'Handle a 404 error trying to choose a victim',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameActive, stubWolf);
			await expectNight(page, 'deciding', false);
			await fail(simulation, page, game, 404, GameIdNotFoundErrorResponse, 'game-not-found');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 404 error trying to save a player',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameActive, stubHealer);
			await expectNight(page, 'deciding', false);
			await fail(simulation, page, game, 404, GameIdNotFoundErrorResponse, 'game-not-found');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to choose a victim',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameActive, stubWolf);
			await expectNight(page, 'deciding', false);
			await fail(simulation, page, game, 500, UnexpectedErrorResponse, 'unexpected-error');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to save a player',
		async ({ locale, page }) => {
			const [simulation, game] = await setup(page, locale, stubGameActive, stubHealer);
			await expectNight(page, 'deciding', false);
			await fail(simulation, page, game, 500, UnexpectedErrorResponse, 'unexpected-error');
		}
	);
});
