import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { stubInactiveGame } from '@tests/unit/setup/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => true),
		};
	};
});

describe('Game Pinia Store', () => {
	const store = useGameStore();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		sessionStorage.clear();
	});

	it('should successfully setup the default state', async () => {
		expect(store.$state).toEqual(
			expect.objectContaining({
				id: '',
				active: false,
				players: [],
			})
		);
	});

	it('should set the stored game on session storage in client mode', async () => {
		store.set(stubInactiveGame);
		expect(store.$state).toEqual(stubInactiveGame);
		expect(sessionStorage.setItem).toBeCalled();
		expect(sessionStorage.getItem('game')).toEqual(JSON.stringify(stubInactiveGame));
	});

	it('should return a URL to play the stored game', async () => {
		store.set(stubInactiveGame);
		const url = store.url;
		expect(url).toEqual(`/play/${stubInactiveGame.id}`);
	});
});
