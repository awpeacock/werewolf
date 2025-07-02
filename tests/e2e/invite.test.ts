import { v4 as uuidv4 } from 'uuid';

import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

declare global {
	interface Window {
		__copiedText?: string;
	}
}

test.describe('Invite players', () => {
	test.each(['en', 'de'])('Share link', async ({ locale, page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'share', {
				value: async (data: ShareData) => {
					const w = window as Window & { __sharedData?: ShareData };
					w.__sharedData = data;
					return Promise.resolve();
				},
				configurable: true,
			});
			Object.defineProperty(navigator, 'canShare', {
				configurable: true,
				enumerable: true,
				value: (_data: ShareData) => {
					return true;
				},
			});
		});

		const simulation = await simulate(page, locale, '/create');
		await simulation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);

		const share = page.getByTestId('share-icon');
		await expect(share).toBeVisible();
		await share.click();

		const sharedData = await page.evaluate(() => {
			const w = window as Window & { __sharedData?: ShareData };
			return w.__sharedData;
		});
		expect(sharedData).toBeDefined();
		expect(sharedData!.url).toContain(simulation.getDetails().invite);
	});

	test.each(['en', 'de'])('No Share link on incompatible browsers', async ({ locale, page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'canShare', {
				configurable: true,
				enumerable: true,
				value: (_data: ShareData) => {
					return false;
				},
			});
		});

		const simulation = await simulate(page, locale, '/create');
		await simulation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);

		const share = page.getByTestId('share-icon');
		await expect(share).not.toBeVisible();
	});

	test.each(['en', 'de'])('Email link', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/create');
		await simulation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);

		const email = page.getByTestId('email-icon');
		await expect(email).toBeVisible();
		const href = await email.getAttribute('href');
		expect(href).toMatch(/^mailto:/);
		expect(href).toContain(simulation.getDetails().invite);
	});

	test.each(['en', 'de'])('Copy link', async ({ locale, page, browser, context }) => {
		const isWebKit = browser.browserType().name() === 'webkit';
		if (!isWebKit) {
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		} else {
			// Some workaround contortions for iPhone
			await context.grantPermissions(['clipboard-read']);
			await page.addInitScript(() => {
				const originalQuery = navigator.permissions?.query;
				navigator.permissions.query = async (desc) => {
					if (desc.name === ('clipboard-write' as PermissionName)) {
						return {
							state: 'granted',
							onchange: null,
							addEventListener: () => {},
							removeEventListener: () => {},
							dispatchEvent: () => false,
							name: 'clipboard-write',
						};
					}
					return originalQuery?.(desc);
				};

				window.__copiedText = '';
				Object.defineProperty(navigator, 'clipboard', {
					value: {
						writeText: async (text: string) => {
							window.__copiedText = text;
						},
						readText: async () => window.__copiedText,
					},
					configurable: true,
				});
			});
		}

		const simulation = await simulate(page, locale, '/create');
		await simulation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);

		const copy = page.getByTestId('copy-icon');
		await expect(copy).toBeVisible();
		await copy.click();

		const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboardContent).toContain(simulation.getDetails().invite);
	});

	test.each(['en', 'de'])('No copy link on incompatible browsers', async ({ locale, page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', {
				value: undefined,
				configurable: true,
			});
		});

		const simulation = await simulate(page, locale, '/create');
		await simulation.createGame(
			{
				parameters: { nickname: 'Mayor' },
				result: { success: true },
			},
			true
		);

		const copy = page.getByTestId('copy-icon');
		await expect(copy).not.toBeVisible();
	});

	test.each(['en', 'de'])(
		'Handle invalid access to the invite page with the wrong player',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/create');
			await simulation.createGame(
				{
					parameters: { nickname: 'Mayor' },
					result: { success: true },
				},
				true
			);

			// Invalidate the player ID so the invite is not shown
			const id = uuidv4();
			await page.evaluate((id) => {
				const player = JSON.parse(sessionStorage.getItem('player')!);
				player.id = id;
				sessionStorage.setItem('player', JSON.stringify(player));
			}, id);
			await page.reload();
			await expect(page).toBeInvitePage();
			await expect(page).toHaveError('invite-not-mayor');
			await expect(page.getByText(simulation.getDetails().invite!)).not.toBeVisible();
		}
	);

	test.each(['en', 'de'])(
		'Handle invalid access to the invite page with no game',
		async ({ locale, page }) => {
			const simulation = await simulate(page, locale, '/create');
			await simulation.createGame(
				{
					parameters: { nickname: 'Mayor' },
					result: { success: true },
				},
				true
			);

			// Invalidate the game on the session
			await page.evaluate(() => {
				const game = JSON.parse(sessionStorage.getItem('game')!);
				game.id = '';
				sessionStorage.setItem('game', JSON.stringify(game));
			});
			await page.reload();
			await expect(page).toBeInvitePage();
			await expect(page).toHaveError('invite-no-game');
			await expect(page.getByText(simulation.getDetails().invite!)).not.toBeVisible();
		}
	);
});
