import type { Page } from '@playwright/test';

import { mockApi } from '@tests/e2e/setup/api';
import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import type { Simulation } from '@tests/e2e/setup/simulate';

export const setup = async (
	page: Page,
	locale: string,
	game: Game,
	player: Player
): Promise<[Simulation, Game]> => {
	const simulation = await simulate(page, locale, '/');
	const clone = structuredClone(game);
	await simulation.inject(clone, player);
	await page.reload();
	await mockApi(page, `/api/games/${clone.id}/`, 200, JSON.stringify(clone), true);
	await simulation.go(`/play/${clone.id}/`, {
		navigate: true,
		parameters: { button: 'resume-game' },
	});
	await expect(page).toBePlayPage(clone.id);
	await expect(page).toBeRolePage();
	await simulation.progress(false, { session: page });
	return [simulation, clone];
};

export const expectNight = async (page: Page, action: 'deciding' | 'decided', not: boolean) => {
	await expect(page).toBeNight();
	if (action === 'deciding') {
		if (not) {
			await expect(page).not.toBeMakingDecision();
		} else {
			await expect(page).toBeMakingDecision();
		}
	} else if (action === 'decided') {
		await expect(page).toHaveMadeDecision();
	}
};

export const expectDay = async (page: Page, action: 'voting' | 'voted', not: boolean) => {
	await expect(page).toBeDay();
	if (action === 'voting') {
		if (not) {
			await expect(page).not.toBeVoting();
		} else {
			await expect(page).toBeVoting();
		}
	} else if (action === 'voted') {
		await expect(page).toHaveVoted();
	}
};
