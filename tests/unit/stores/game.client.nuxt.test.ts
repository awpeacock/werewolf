import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { Role } from '@/types/enums';

import {
	stubGameActive,
	stubGameBlank,
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubHealer,
	stubMayor,
	stubVillager1,
	stubVillager2,
	stubWolf,
} from '@tests/common/stubs';

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
		expected.stage = undefined;
		expected.activities = [];

		expect(store.$state).toEqual(expected);
		// Removed due to pinia-plugin-persistedstate v4 using a delayed write to storage
		// expect(sessionStorage.setItem).toBeCalled();
		// const stored = JSON.parse(sessionStorage.getItem('game')!);
		// expect(stored).toEqualGame(expected);
	});

	it('should return the mayor of the stored game', async () => {
		store.set(stubGameNew);
		expect(store.mayor).toEqual(stubMayor);
	});

	it('should return null trying to return a mayor for a game without one', async () => {
		// Something will have to have gone seriously wrong, but ensure it's handled anyway
		store.set(stubGameNew);
		store.players = [{ id: '1234', nickname: 'Villager', roles: [Role.VILLAGER] }];
		expect(store.mayor).toBeNull();
	});

	it('should return null trying to return a mayor for an empty game', async () => {
		store.$reset();
		expect(store.mayor).toBeNull();
	});

	it('should return the wolf of the stored game', async () => {
		store.set(stubGameActive);
		expect(store.wolf).toEqual(stubWolf);
	});

	it('should return null trying to return a wolf for a game without one', async () => {
		store.set(stubGameNew);
		expect(store.wolf).toBeNull();
	});

	it('should return null trying to return a wolf for an empty game', async () => {
		store.$reset();
		expect(store.wolf).toBeNull();
	});

	it('should return the healer of the stored game', async () => {
		store.set(stubGameActive);
		expect(store.healer).toEqual(stubHealer);
	});

	it('should return null trying to return a healer for a game without one', async () => {
		store.set(stubGameNew);
		expect(store.healer).toBeNull();
	});

	it('should return null trying to return a healer for an empty game', async () => {
		store.$reset();
		expect(store.healer).toBeNull();
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

	it('should return an empty string instead of a URL if the game is not setup', async () => {
		store.set(stubGameBlank);
		const url = store.url;
		expect(url).toEqual('');
	});
});
