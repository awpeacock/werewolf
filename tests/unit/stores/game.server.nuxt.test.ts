import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { stubGameNew } from '@tests/unit/setup/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => false),
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

	it('should NOT set the stored game on session storage in server mode', async () => {
		store.set(stubGameNew);
		expect(sessionStorage.setItem).not.toBeCalled();
		expect(sessionStorage.getItem('game')).toBeNull();
	});
});
