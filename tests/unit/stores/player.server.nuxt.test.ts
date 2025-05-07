import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { createPinia } from 'pinia';

import { stubVillager1 } from '@tests/unit/setup/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => false),
		};
	};
});

describe('Player Pinia Store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		sessionStorage.clear();
	});

	it('should NOT set the stored player on session storage in server mode', async () => {
		const pinia = createPinia();
		const store = usePlayerStore(pinia);
		store.set(stubVillager1);
		expect(sessionStorage.setItem).not.toBeCalled();
		expect(sessionStorage.getItem('player')).toBeNull();
	});
});
