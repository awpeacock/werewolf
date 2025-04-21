import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { Role } from '@/types/enums';

import { stubInactiveGame, stubMayor } from '@tests/unit/setup/stubs';

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
		store.set(stubInactiveGame);
		expect(store.$state).toEqual(stubInactiveGame);
		expect(sessionStorage.setItem).toBeCalled();
		expect(sessionStorage.getItem('game')).toEqual(JSON.stringify(stubInactiveGame));
	});

	it('should return the mayor of the stored game', async () => {
		store.set(stubInactiveGame);
		expect(store.mayor).toEqual(stubMayor);
	});

	it('should return null trying to return a mayor for a game without one', async () => {
		// Something will have to have gone seriously wrong, but ensure it's handled anyway
		store.set(stubInactiveGame);
		store.players = [{ id: '1234', nickname: 'Villager', role: Role.VILLAGER }];
		expect(store.mayor).toBeNull();
	});

	it('should return null trying to return a mayor for an empty game', async () => {
		store.$reset();
		expect(store.mayor).toBeNull();
	});

	it('should return an invite URL to join the stored game', async () => {
		store.set(stubInactiveGame);
		const mayor = store.mayor!;
		expect(store.invite).toEqual(`/join/${stubInactiveGame.id}?invite=${mayor.id}`);

		// The following code should never be reached but, hey, belts and braces
		store.players = [];
		expect(store.invite).toEqual(`/join/${stubInactiveGame.id}`);
	});

	it('should return a URL to play the stored game', async () => {
		store.set(stubInactiveGame);
		const url = store.url;
		expect(url).toEqual(`/play/${stubInactiveGame.id}`);
	});
});
