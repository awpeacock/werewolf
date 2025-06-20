import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { createPinia } from 'pinia';

import { stubGameNew } from '@tests/common/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => false),
		};
	};
});

describe('Game Pinia Store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		sessionStorage.clear();
	});

	it('should NOT set the stored game on session storage in server mode', async () => {
		const pinia = createPinia();
		const store = useGameStore(pinia);
		store.set(stubGameNew);
		expect(sessionStorage.setItem).not.toBeCalled();
		expect(sessionStorage.getItem('game')).toBeNull();
	});
});
