import type { BrowserContext, Page } from '@playwright/test';

import { UnexpectedErrorResponse } from '@/types/constants';

import { stubGameNew } from '@tests/common/stubs';
import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate, type GameDetails, type Simulation } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';
import { wsListener, type WebSocketListener } from '@tests/e2e/setup/websocket';

test.describe('Admit/Deny Players', () => {
	let context: BrowserContext;
	let session: Page;
	let listener: WebSocketListener;
	let creation: Simulation;
	let details: GameDetails;

	test.beforeEach(async ({ locale, browser }) => {
		context = await browser.newContext();
		session = await context.newPage();
		listener = wsListener(session, 'join-request');

		creation = await simulate(session, locale, '/create');
		await creation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);
		details = creation.getDetails() as GameDetails;
	});

	test.afterEach(async () => {
		listener.dispose();
	});

	test.each(['en', 'de'])(
		'Be granted access (while on join screen)',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			const ws = wsListener(page, 'admission');
			await simulation.joinGame({
				parameters: { code: details!.code, nickname: 'New Player 1' },
				result: { success: true },
			});
			await listener.receive();

			await simulation.admitPlayer({
				session: session,
				parameters: { name: 'New Player 1' },
			});
			await ws.receive();
			ws.dispose();

			await expect(page).toBeAdmitted();
		}
	);

	test.each(['en', 'de'])('Be granted access (offscreen)', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const ws = wsListener(page, 'admission');
		await simulation.joinGame({
			parameters: { code: details!.code, nickname: 'New Player 2' },
			result: { success: true },
		});
		await listener.receive();

		await simulation.go('/');
		await simulation.admitPlayer({ session: session, parameters: { name: 'New Player 2' } });
		await ws.receive();
		ws.dispose();

		await simulation.go('/join');
		await expect(page).toBeAdmitted();
	});

	test.each(['en', 'de'])('Be denied access (while on join screen)', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const ws = wsListener(page, 'admission');
		await simulation.joinGame({
			parameters: { code: details!.code, nickname: 'New Player 3' },
			result: { success: true },
		});
		await listener.receive();

		await simulation.denyPlayer({ session: session, parameters: { name: 'New Player 3' } });
		await ws.receive();

		await expect(page).not.toBeAdmitted();
		// Now do it all over again, to prove we can still get in
		await simulation.joinGame({
			parameters: { code: details!.code, nickname: 'New Player 4' },
			result: { success: true },
		});
		await ws.receive();
		ws.dispose();

		await expect(page).toHaveJoinedGame();
		// And, as ever, double check we're still in if the user refreshes
		await page.reload();
		await expect(page).toHaveJoinedGame();
	});

	test.each(['en', 'de'])('Be denied access (offscreen)', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/join');

		const ws = wsListener(page, 'admission');
		await simulation.joinGame({
			parameters: { code: details!.code, nickname: 'New Player 5' },
			result: { success: true },
		});
		await listener.receive();

		await simulation.go('/');
		await simulation.denyPlayer({ session: session, parameters: { name: 'New Player 5' } });
		await ws.receive();

		await simulation.go('/join');
		await expect(page).not.toBeAdmitted();
		// Now do it all over again, to prove we can still get in
		await simulation.joinGame({
			parameters: { code: details!.code, nickname: 'New Player 6' },
			result: { success: true },
		});
		await ws.receive();
		ws.dispose();

		await expect(page).toHaveJoinedGame();
		// And, as ever, double check we're still in if the user refreshes
		await page.reload();
		await expect(page).toHaveJoinedGame();
	});

	test.each(['en', 'de'])(
		'Handle API server errors admitting players',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await simulation.joinGame({
				parameters: { code: details!.code, nickname: 'New Player 7' },
				result: { success: true },
			});

			await mockApi(
				session,
				`/api/games/${details.code}/admit`,
				500,
				JSON.stringify(UnexpectedErrorResponse)
			);
			await session.reload();
			await expect(session).toBeAwaitingAdmittance('New Player 7');
			await simulation.admitPlayer({
				session: session,
				parameters: { name: 'New Player 7' },
				result: { success: false },
			});
			await expect(session).toBeAwaitingAdmittance('New Player 7');
			await expect(session).toHaveError('unexpected-error');
			// Now prove we can clear the error
			const clear = session.getByTestId('admit-error');
			await expect(clear).toBeVisible();
			await clear.click();
			await expect(session).not.toHaveError('unexpected-error');
		}
	);

	test.each(['en', 'de'])(
		'Handle when player not on game returned by API',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/join');

			await mockApi(
				page,
				`/api/games/${details.code}/join`,
				200,
				JSON.stringify(stubGameNew)
			);
			await simulation.joinGame({
				parameters: { code: details.code, nickname: 'New Player 8' },
				result: {
					success: false,
					message: 'unexpected-error',
				},
			});
		}
	);
});
