import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { Role } from '@/types/enums';

import { stubVillager1 } from '@tests/unit/setup/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => true),
		};
	};
});

const mockPort = vi.fn().mockReturnValue(443);
mockNuxtImport('useRequestURL', () => {
	return () => {
		return {
			hostname: 'www.werewolf.com',
			protocol: 'https',
			port: mockPort,
		};
	};
});

describe('Player Pinia Store', () => {
	const store = usePlayerStore();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		sessionStorage.clear();
	});

	it('should successfully setup the default state', async () => {
		expect(store.$state).toEqual(
			expect.objectContaining({
				id: '',
				nickname: '',
				role: Role.VILLAGER,
			})
		);
	});

	it('should set the stored game on session storage in client mode', async () => {
		store.set(stubVillager1);

		expect(store.$state).toEqual(stubVillager1);
		expect(sessionStorage.setItem).toBeCalled();
		expect(sessionStorage.getItem('player')!).toEqual(JSON.stringify(stubVillager1));
	});
});
