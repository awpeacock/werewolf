import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import type { NuxtApp } from '#app';
import { createPinia, setActivePinia } from 'pinia';

import plugin from '@/plugins/rehydrate.client';

import { stubGameInactive, stubPlayerBlank, stubVillager1 } from '@tests/common/stubs';
import { MockWebSocket, mockWSConnect } from '@tests/unit/setup/websocket';

const mockGame = {
	getLatest: vi.fn().mockReturnValue(stubGameInactive),
};
mockNuxtImport('useGame', () => {
	return () => mockGame;
});

describe('Session Rehydration Plugin', async () => {
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
	const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();
		MockWebSocket.instances = [];
		setActivePinia(createPinia());
	});

	it('restores game and player from session', async () => {
		useGameStore().$state = stubGameInactive;
		usePlayerStore().$state = stubVillager1;

		await plugin({} as NuxtApp);

		expect(mockGame.getLatest).toHaveBeenCalled();
		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining('Game state successfully retrieved - session updated')
		);
		expect(mockWSConnect).toHaveBeenCalledWith(
			expect.objectContaining({ id: stubGameInactive.id }),
			expect.objectContaining({ id: stubVillager1.id })
		);
		expect(spyInfo).toHaveBeenCalledWith(expect.stringContaining('Player found on session'));
	});

	it('restores game only from session', async () => {
		useGameStore().$state = stubGameInactive;
		usePlayerStore().$state = stubPlayerBlank;

		await plugin({} as NuxtApp);

		expect(mockGame.getLatest).toHaveBeenCalled();
		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining('Game state successfully retrieved - session updated')
		);
		expect(mockWSConnect).not.toHaveBeenCalled();
		expect(spyInfo).not.toHaveBeenCalledWith(
			expect.stringContaining('Player found on session')
		);
	});

	it('catches and logs an error retrieving the game/player from session', async () => {
		useGameStore().$state = stubGameInactive;
		mockGame.getLatest = vi.fn().mockImplementation(() => {
			throw new Error('Mocked error');
		});

		expect(async () => {
			await plugin({} as NuxtApp);
		}).not.toThrowError();

		expect(spyInfo).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('Existing game found on session')
		);
		expect(mockWSConnect).not.toHaveBeenCalled();
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('Unable to restore game/player state')
		);
		expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Mocked error'));
	});
});
