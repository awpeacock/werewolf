import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { Role } from '@/types/enums';

import {
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubMayor,
	stubVillager1,
	stubVillager2,
} from '@tests/unit/setup/stubs';

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
		store.set(stubGameNew);

		// We can pass around games without a pending but the store will always
		// inject an empty one
		const expected = structuredClone(stubGameNew);
		expected.pending = [];

		expect(store.$state).toEqual(expected);
		expect(sessionStorage.setItem).toBeCalled();
		expect(sessionStorage.getItem('game')!).toEqual(JSON.stringify(expected));
	});

	it('should return the mayor of the stored game', async () => {
		store.set(stubGameNew);
		expect(store.mayor).toEqual(stubMayor);
	});

	it('should return null trying to return a mayor for a game without one', async () => {
		// Something will have to have gone seriously wrong, but ensure it's handled anyway
		store.set(stubGameNew);
		store.players = [{ id: '1234', nickname: 'Villager', role: Role.VILLAGER }];
		expect(store.mayor).toBeNull();
	});

	it('should return null trying to return a mayor for an empty game', async () => {
		store.$reset();
		expect(store.mayor).toBeNull();
	});

	it('should successfully return a player that exists in players array', () => {
		store.set(stubGameInactive);
		expect(store.findPlayer(stubVillager1.nickname)).toEqual(stubVillager1);
	});

	it('should successfully return a player that exists in pending array', () => {
		store.set(stubGameInactive);
		expect(store.findPlayer(stubVillager1.nickname)).toEqual(stubVillager1);
	});

	it('should successfully return null if no player exists', () => {
		store.set(stubGamePending);
		expect(store.findPlayer(stubVillager2.nickname)).toBeNull();
	});

	it('should successfully return true if a player exists in players array', () => {
		store.set(stubGameInactive);
		expect(store.hasPlayer(stubVillager1.nickname)).toBeTruthy();
	});

	it('should successfully return true if a player exists in pending array', () => {
		store.set(stubGamePending);
		expect(store.hasPlayer(stubVillager1.nickname)).toBeTruthy();
	});

	it('should successfully return false if no player exists', () => {
		store.set(stubGamePending);
		expect(store.hasPlayer(stubVillager2.nickname)).toBeFalsy();
	});

	it('should successfully return true if a player has been admitted', () => {
		store.set(stubGameInactive);
		expect(store.isPlayerAdmitted(stubVillager1.nickname)).toBeTruthy();
	});

	it('should successfully return false if a player has not been admitted', () => {
		store.set(stubGamePending);
		expect(store.isPlayerAdmitted(stubVillager1.nickname)).toBeFalsy();
	});

	it('should successfully return false if no player exists (when checking if admitted)', () => {
		store.set(stubGamePending);
		expect(store.isPlayerAdmitted(stubVillager2.nickname)).toBeFalsy();
	});

	it('should return an invite URL to join the stored game', async () => {
		store.set(stubGameNew);
		const mayor = store.mayor!;
		expect(store.invite).toEqual(`/join/${stubGameNew.id}?invite=${mayor.id}`);

		// The following code should never be reached but, hey, belts and braces
		store.players = [];
		expect(store.invite).toEqual(`/join/${stubGameNew.id}`);
	});

	it('should return a URL to play the stored game', async () => {
		store.set(stubGameNew);
		const url = store.url;
		expect(url).toEqual(`/play/${stubGameNew.id}`);
	});
});
