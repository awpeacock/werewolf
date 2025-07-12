import type { Page } from '@playwright/test';

import { Role } from '@/types/enums';
import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubGameActive,
	stubGameReady,
	stubHealer,
	stubMayor,
	stubVillager1,
	stubVillager6,
	stubWolf,
} from '@tests/common/stubs';
import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import type { Simulation } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Play games (Start)', () => {
	const fail = async (
		simulation: Simulation,
		page: Page,
		code: number,
		response: APIErrorResponse,
		message: string,
		start?: boolean
	) => {
		const id = start ? stubGameReady.id : stubGameActive.id;
		const api = `/api/games/${id}/` + (start ? 'start' : '');
		await mockApi(page, api, code, JSON.stringify(response), true);
		if (start) {
			await simulation.start({ result: { success: false } });
			await expect(page).toHaveError(message);
		} else {
			await simulation.go(`/play/${stubGameActive.id}`);
			await expect(page).not.toHaveError(message);
		}
	};

	test.each(['en', 'de'])('Handle the mayor starting the game', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');
		const game = structuredClone(stubGameReady);
		await simulation.inject(game, stubMayor);
		await page.reload();
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/play/${game.id}/`, {
			navigate: true,
			parameters: { button: 'play-game' },
		});
		await expect(page).toBePlayPage(game.id);
		game.active = true;
		game.started = new Date();
		game.players[0].roles.push(Role.VILLAGER);
		await mockApi(page, `/api/games/${game.id}/start`, 200, JSON.stringify(game), true);
		await simulation.start({ result: { success: false } });
		await expect(page).toBeRolePage();
	});

	test.each(['en', 'de'])(
		'Handle the wolf returning to the game and being presented the correct role screen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive, stubWolf);
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
			await expect(page).toBeRolePage(Role.WOLF);
		}
	);

	test.each(['en', 'de'])(
		'Handle the healer returning to the game and being presented the correct role screen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive, stubHealer);
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
			await expect(page).toBeRolePage(Role.HEALER);
		}
	);

	test.each(['en', 'de'])(
		'Handle a villager returning to the game and being presented the correct role screen',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive, stubMayor);
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
			await expect(page).toBeRolePage(Role.VILLAGER);
		}
	);

	test.each(['en', 'de'])(
		'Handle a user trying to directly access a game without a code',
		async ({ locale, page }) => {
			await simulate(page, locale, '/play');
			await expect(page).toHaveError('you-must-come-here-with-a-valid-game-code');
		}
	);

	test.each(['en', 'de'])(
		'Handle a user trying to directly access a game with the wrong code',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive);
			await simulation.go(`/play/${stubGameReady.id}`);
			await expect(page).toHaveError('you-have-the-wrong-game-code');
		}
	);

	test.each(['en', 'de'])(
		'Handle a user trying to directly access a game without joining',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive);
			await simulation.go(`/play/${stubGameActive.id}`);
			await expect(page).toHaveError('you-have-not-yet-joined');
		}
	);

	test.each(['en', 'de'])(
		'Handle a player trying to access a game when not associated with the game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			await simulation.inject(stubGameActive, stubVillager1);
			await simulation.go(`/play/${stubGameActive.id}`);
			await expect(page).toHaveError('you-are-not-a-player-in-this-game');
		}
	);

	test.each(['en', 'de'])(
		'Handle a player trying to access a game when not accepted',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameActive;
			game.pending = [stubVillager1];
			await simulation.inject(game, stubVillager1);
			await simulation.go(`/play/${game.id}`);
			await expect(page).toHaveError('the-mayor-has-not-selected-you-to-play-in-this-game');
		}
	);

	test.each(['en', 'de'])(
		'Handle a user clicking "Play" and getting back a game without a stage',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = structuredClone(stubGameActive);
			game.stage = undefined;
			await simulation.inject(game, stubWolf);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await simulation.rejoin();
			await expect(page).toBeNight();
		}
	);

	test.each(['en', 'de'])(
		'Handle a 404 error trying to retrieve the latest game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameActive;
			await simulation.inject(game, stubVillager6);
			await fail(simulation, page, 404, GameIdNotFoundErrorResponse, 'game-not-found');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to retrieve the latest game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameActive;
			await simulation.inject(game, stubVillager6);
			await fail(simulation, page, 500, UnexpectedErrorResponse, 'unexpected-error');
		}
	);

	test.each(['en', 'de'])(
		'Handle a 404 error trying to start a game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameReady;
			await simulation.inject(game, stubMayor);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await expect(page).toBeReady();

			await fail(simulation, page, 404, GameIdNotFoundErrorResponse, 'game-not-found', true);
		}
	);

	test.each(['en', 'de'])(
		'Handle a 500 error trying to start a game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/');
			const game = stubGameReady;
			await simulation.inject(game, stubMayor);
			await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
			await simulation.go(`/play/${game.id}`);
			await expect(page).toBeReady();

			await fail(simulation, page, 500, UnexpectedErrorResponse, 'unexpected-error', true);
		}
	);
});
