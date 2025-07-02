import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Client-side Errors', () => {
	test.each(['en', 'de'])('Handle 404 errors', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/404');
		await expect(page).toBeErrorPage('page-not-found');
		await simulation.go('/', { navigate: true, parameters: { button: 'go-home' } });
		await expect(page).toBeHomePage();
		await simulation.go('/create', { navigate: true, parameters: { button: 'create-game' } });
		await expect(page).toBeCreatePage();
		await simulation.go('/', { navigate: true, parameters: { button: 'go-home' } });
		await expect(page).toBeHomePage();
		await simulation.go('/join', { navigate: true, parameters: { button: 'join-game' } });
		await expect(page).toBeJoinPage();
	});

	test.each(['en', 'de'])('Handle error refreshing page', async ({ locale, page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('create', 'This is not a JSON.');
		});
		await simulate(page, locale, '/create');
		await expect(page).toBeErrorPage('server-error');
	});
});
