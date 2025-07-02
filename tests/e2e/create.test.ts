import { UnexpectedErrorResponse } from '@/types/constants';

import { stubErrorNickname } from '@tests/common/stubs';
import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Create game', () => {
	test.each(['en', 'de'])('Create new game', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/create');

		// First off, let's throw some invalid values to test validation
		await expect(page).not.toValidateNickname();

		// Now confirm we still can successfully create
		await simulation.createGame({
			parameters: { nickname: 'Mayor 1' },
			result: { success: true },
		});
		const details = simulation.getDetails();

		// Refresh the page and we should still have the created game
		await page.reload();
		await expect(page).toHaveCreatedGame(details.code);
	});

	test.each(['en', 'de'])('Return to create (persisting game)', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/create');

		await simulation.createGame({
			parameters: { nickname: 'Mayor 2' },
			result: { success: true },
		});
		const details = simulation.getDetails();

		// Refresh the page and we should still have the created game
		await simulation.go('/');
		await simulation.go('/create', { navigate: true, parameters: { button: 'create-game' } });
		await expect(page).toBeCreatePage();
		await expect(page).toHaveCreatedGame(details.code);
	});

	test.each(['en', 'de'])(
		'Handle API validation errors creating new game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/create');

			await mockApi(page, '/api/games', 400, JSON.stringify(stubErrorNickname));
			await simulation.createGame({
				parameters: { nickname: 'Mayor 3' },
				result: {
					success: false,
					message: stubErrorNickname.errors.at(0)?.message,
				},
			});
			await expect(page).not.toHaveCreatedGame();
			// Again, confirm we can still successfully create after this error
			await simulation.createGame({
				parameters: { nickname: 'Mayor 4' },
				result: {
					success: true,
				},
			});
			await expect(page).toHaveCreatedGame();
		}
	);

	test.each(['en', 'de'])(
		'Handle API server errors creating new game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/create');

			await mockApi(page, '/api/games', 500, JSON.stringify(UnexpectedErrorResponse));
			await simulation.createGame({
				parameters: { nickname: 'Mayor 5' },
				result: {
					success: false,
					message: 'unexpected-error',
				},
			});
			await expect(page).not.toHaveCreatedGame();
			// And again, make sure we can still successfully create after this error
			await simulation.createGame({
				parameters: { nickname: 'Mayor 6' },
				result: {
					success: true,
				},
			});
			await expect(page).toHaveCreatedGame();
		}
	);

	test.each(['en', 'de'])(
		'Reset stage tracker if session values do not match',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/create');

			await simulation.createGame({
				parameters: { nickname: 'Mayor 7' },
				result: {
					success: true,
				},
			});

			// Clear the code and check we've been reset to stage 1
			await page.evaluate(() => {
				sessionStorage.setItem('create', JSON.stringify({ stage: 2, code: null }));
			});
			await page.reload();
			await expect(page).toBeCreatePage();
		}
	);
});
