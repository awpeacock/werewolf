import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Static Pages', () => {
	test.each(['en', 'de'])('How to Play', async ({ locale, page }) => {
		const simulation = await simulate(page, locale, '/');
		await expect(page).toBeHomePage();

		await simulation.go('/instructions', {
			navigate: true,
			parameters: { button: 'how-to-play' },
		});
		await expect(page).toBeInstructionsPage();
	});
});
