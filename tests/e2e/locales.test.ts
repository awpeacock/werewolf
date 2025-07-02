import { expect } from '@tests/e2e/setup/expect';
import { test } from '@tests/e2e/setup/test';

test.describe('Locales', () => {
	test('Switch languages', async ({ page }) => {
		const { default: en } = await import(`@/i18n/locales/en.json`, {
			with: { type: 'json' },
		});
		const { default: de } = await import(`@/i18n/locales/de.json`, {
			with: { type: 'json' },
		});

		await page.goto('/', { waitUntil: 'networkidle' });
		await expect(page).toBeHomePage();

		const german = page.getByTestId('de');
		await german.click();
		await page.waitForURL('/de');
		await expect(page).toBeHomePage();

		const button = await page.getByRole('link', { name: de['join-game'] });
		await button.click();
		await page.waitForURL('/de/join');
		await expect(page).toBeJoinPage();

		const english = page.getByTestId('en');
		await english.click();
		await page.waitForURL('/join');
		await expect(page).toBeJoinPage();

		const home = await page.getByRole('link', { name: en['go-home'] });
		await home.click();
		await page.waitForURL('/');
		await expect(page).toBeHomePage();
	});
});
