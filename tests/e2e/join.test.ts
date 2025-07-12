import type { Page } from '@playwright/test';

import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubErrorCode,
	stubErrorCodeAndNickname,
	stubErrorNickname,
	stubGameInactive,
	stubGamePending,
	stubMayor,
	stubVillager1,
	stubVillager2,
} from '@tests/common/stubs';

import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import type { Simulation } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Join game', () => {
	const mockJoin = async (
		simulation: Simulation,
		page: Page,
		game: Game,
		player: Player,
		success?: boolean
	) => {
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.inject(game, player);
		await page.reload();

		if (success === false) {
			await expect(page).not.toHaveJoinedGame();
			await expect(page).toBeDenied();
		} else {
			await expect(page).toHaveJoinedGame();
			expect(await page.innerText('main')).toContain(player.nickname);
		}
	};

	test.each(['en', 'de'])('Join game manually', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		// First off, let's throw some invalid values to test validation
		await expect(page).not.toValidateNickname();
		await expect(page).not.toValidateCode();

		// Now confirm we still can successfully join
		await mockApi(
			page,
			`/api/games/${stubGamePending.id}/join`,
			200,
			JSON.stringify(stubGamePending)
		);
		await simulation.joinGame({
			parameters: { code: stubGamePending.id, nickname: stubVillager1.nickname },
			result: { success: true },
		});
		await expect(page).toHaveJoinedGame();
		expect(await page.innerText('main')).toContain(stubVillager1.nickname);
	});

	test.each(['en', 'de'])('Join game manually with pre-filled code', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');

		const game = structuredClone(stubGamePending);
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/join/${game.id}`);
		await expect(page).toBeJoinPage();

		// First off, let's throw some invalid values to test validation
		await expect(page).not.toValidateNickname();

		// Now, prove we can still join the game
		await mockApi(page, `/api/games/${game.id}/join`, 200, JSON.stringify(game), true);
		await simulation.joinGame({
			parameters: { nickname: stubVillager1.nickname },
			result: { success: true },
		});

		// Refresh the page and we should still be awaiting being let in
		await page.reload();
		await expect(page).toHaveJoinedGame();
		expect(await page.innerText('main')).toContain(stubVillager1.nickname);
	});

	test.each(['en', 'de'])('Join game with invite', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');

		const game = structuredClone(stubGameInactive);
		await mockApi(page, `/api/games/${game.id}/`, 200, JSON.stringify(game), true);
		await simulation.go(`/join/${game.id}?invite=${stubMayor.id}`);
		await expect(page).toBeJoinPage();

		// Code is pre-filled, but test invalidating nickname in this scenario too
		await expect(page).not.toValidateNickname();

		// Again, prove we can still join the game
		await mockApi(
			page,
			`/api/games/${game.id}/join?invite=${stubMayor.id}`,
			200,
			JSON.stringify(game),
			true
		);
		await simulation.joinGame({
			parameters: { nickname: stubVillager1.nickname },
			result: { success: true },
		});

		// Refresh the page and we should still be in
		await page.reload();
		await expect(page).toBePlayPage();

		// If, for some reason they return to the join page, they should still show as already admitted
		await page.goto(`/join/${game.id}?invite=${stubMayor.id}`);
		await page.reload();
		await expect(page).toBeAdmitted();
	});

	test.each(['en', 'de'])('Handle nothing having been entered', async ({ locale, page }) => {
		await simulate(page, locale, '/join');

		const button = page.getByTestId('join-button');
		await expect(button).toBeVisible();
		await button.click();

		await expect(page).not.toHaveSpinner();
		await expect(page).toHaveError('nickname-required');
		await expect(page).not.toHaveJoinedGame();
	});

	test.each(['en', 'de'])('Handle no code having been entered', async ({ locale, page }) => {
		await simulate(page, locale, '/join');

		await expect(page).not.toValidateNickname('New Player 10');
		const button = page.getByTestId('join-button');
		await expect(button).toBeVisible();
		await button.click();

		await expect(page).toHaveError('code-required');
		await expect(page).not.toHaveJoinedGame();
	});

	test.each(['en', 'de'])('Handle no nickname having been entered', async ({ locale, page }) => {
		await simulate(page, locale, '/join');

		await expect(page).toValidateCode('ABCD');
		const button = page.getByTestId('join-button');
		await expect(button).toBeVisible();
		await button.click();

		await expect(page).not.toHaveSpinner();
		await expect(page).toHaveError('nickname-required');
		await expect(page).not.toHaveJoinedGame();
	});

	test.each(['en', 'de'])('Handle coming back waiting', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const game = structuredClone(stubGamePending);
		await mockJoin(simulation, page, game, stubVillager1);
	});

	test.each(['en', 'de'])('Handle coming back admitted', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const game = structuredClone(stubGameInactive);
		await mockJoin(simulation, page, game, stubVillager1);
	});

	test.each(['en', 'de'])('Handle coming back denied', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const game = structuredClone(stubGameInactive);
		await mockJoin(simulation, page, game, stubVillager2, false);
	});

	test.each(['en', 'de'])(
		'Handle API validation errors on game code joining game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await mockApi(
				page,
				`/api/games/${stubGameInactive.id}/join`,
				400,
				JSON.stringify(stubErrorCode)
			);
			await simulation.joinGame({
				parameters: { code: stubGameInactive.id, nickname: 'New Player 10' },
				result: {
					success: false,
					message: stubErrorCode.errors.at(0)?.message,
				},
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle API validation errors on nickname joining game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await mockApi(
				page,
				`/api/games/${stubGameInactive.id}/join`,
				400,
				JSON.stringify(stubErrorNickname)
			);
			await simulation.joinGame({
				parameters: { code: stubGameInactive.id, nickname: 'New Player 11' },
				result: {
					success: false,
					message: stubErrorNickname.errors.at(0)?.message,
				},
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle API validation errors on both elements joining game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await mockApi(
				page,
				`/api/games/${stubGameInactive.id}/join`,
				400,
				JSON.stringify(stubErrorCodeAndNickname)
			);
			await simulation.joinGame({
				parameters: { code: stubGameInactive.id, nickname: 'New Player 12' },
				result: {
					success: false,
					message: stubErrorNickname.errors.at(0)?.message,
				},
			});
		}
	);

	test.each(['en', 'de'])(
		'Handle attempt to join game that does not exist',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await mockApi(
				page,
				`/api/games/${stubGameInactive.id}/join`,
				404,
				JSON.stringify(GameIdNotFoundErrorResponse)
			);
			await simulation.joinGame({
				parameters: { code: stubGameInactive.id, nickname: 'New Player 13' },
				result: {
					success: false,
					message: 'game-not-found',
				},
			});
		}
	);

	test.each(['en', 'de'])('Handle API server errors joining game', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		await mockApi(
			page,
			`/api/games/${stubGameInactive.id}/join`,
			500,
			JSON.stringify(UnexpectedErrorResponse)
		);
		await simulation.joinGame({
			parameters: { code: stubGameInactive.id, nickname: 'New Player 14' },
			result: {
				success: false,
				message: 'unexpected-error',
			},
		});
	});

	test.each(['en', 'de'])(
		'Handle when player not on game returned by API',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			const game = structuredClone(stubGameInactive);
			await mockApi(page, `/api/games/${game.id}/join`, 200, JSON.stringify(game), true);
			await simulation.joinGame({
				parameters: { code: game.id, nickname: 'New Player 15' },
				result: {
					success: false,
					message: 'unexpected-error',
				},
			});
		}
	);
});
