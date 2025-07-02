import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { Role } from '@/types/enums';

import { stubHealer, stubVillager1, stubVillager6, stubWolf } from '@tests/common/stubs';

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => true),
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
				roles: [],
			})
		);
	});

	it('should set the stored game on session storage in client mode', async () => {
		store.set(stubVillager1);

		expect(store.$state).toEqual(stubVillager1);
		expect(sessionStorage.setItem).toBeCalled();
		expect(sessionStorage.getItem('player')!).toEqual(JSON.stringify(stubVillager1));
	});

	it('should successfully add a role to a player', async () => {
		store.set(stubVillager1);

		store.addRole(Role.VILLAGER);
		expect(store.roles).toContain(Role.VILLAGER);
	});

	it('should return the designated role of a player', async () => {
		const players = [stubVillager6, stubWolf, stubHealer];
		const roles = ['villager', 'wolf', 'healer'];
		for (let p = 0; p < players.length; p++) {
			store.set(players[p]);

			expect(store.$state).toEqual(players[p]);
			expect(store.role).toEqual(roles[p]);
		}
	});
});
