import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server, spyApi } from '@tests/unit/setup/api';
import {
	stubMayor,
	stubGameNew,
	stubGamePending,
	stubGameInactive,
	stubVillager1,
	stubVillager2,
} from '@tests/unit/setup/stubs';

describe('useGame', () => {
	it('should successfully parse a string based JSON', () => {
		const created = new Date();
		const before: Game = structuredClone(stubGameNew);
		before.created = created.toISOString();
		const after: Game = useGame(before).parse();
		expect(after).toEqual(
			expect.objectContaining({
				id: stubGameNew.id,
				created: created,
				active: false,
				players: stubGameNew.players,
			})
		);
	});

	it('should successfully retrieve the most up-to-date state of the game', async () => {
		server.use(
			http.get('/api/games/' + stubGamePending.id + '/', async (request) => {
				spyApi(request);
				return HttpResponse.json(stubGameInactive, { status: 200 });
			})
		);
		const game = useGame(structuredClone(stubGamePending));
		const latest = await game.getLatest();
		expect(spyApi).toBeCalled();
		expect(latest).toEqual(stubGameInactive);
	});

	it('should throw an error if unable to retrieve the most up-to-date state of the game', async () => {
		server.use(
			http.get('/api/games/' + stubGamePending.id + '/', async (request) => {
				spyApi(request);
				return HttpResponse.json({}, { status: 404 });
			})
		);
		const game = useGame(structuredClone(stubGamePending));
		await expect(game.getLatest()).rejects.toThrow('Unable to retrieve game');
	});

	it('should successfully extract the mayor from a game', () => {
		const game: Game = structuredClone(stubGameNew);
		game.players.unshift(stubVillager1);
		const mayor: Nullable<Player> = useGame(game).mayor();
		expect(mayor).toEqual(stubMayor);
	});

	it('should successfully return null if a game has no mayor', () => {
		const game: Game = {
			id: '0000',
			created: new Date(),
			active: false,
			players: [],
		};
		const mayor: Nullable<Player> = useGame(game).mayor();
		expect(mayor).toBeNull();
	});

	it('should successfully return a player that exists in players array (based on nickname)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.nickname);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return a player that exists in players array (based on ID)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.id);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return a player that exists in pending array (based on nickname)', () => {
		const game: Game = structuredClone(stubGamePending);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.nickname);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return a player that exists in pending array (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.id);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return null if no such player exists (based on nickname)', () => {
		const game: Game = structuredClone(stubGameNew);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.nickname);
		expect(villager).toBeNull();
	});

	it('should successfully return null if no such player exists (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager2.id);
		expect(villager).toBeNull();
	});

	it('should successfully return true if a player exists in players array (based on nickname)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return true if a player exists in players array (based on ID)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.id);
		expect(exists).toBeTruthy();
	});

	it('should successfully return true if a player exists in pending array (based on nickname)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return true if a player exists in pending array (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.id);
		expect(exists).toBeTruthy();
	});

	it('should successfully return false if no player exists (based on nickname)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).hasPlayer(stubVillager2.nickname);
		expect(exists).toBeFalsy();
	});

	it('should successfully return false if no player exists (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).hasPlayer(stubVillager2.id);
		expect(exists).toBeFalsy();
	});

	it('should successfully return true if a player has been admitted (based on nickname)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return true if a player has been admitted (based on ID)', () => {
		const game: Game = structuredClone(stubGameInactive);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.id);
		expect(exists).toBeTruthy();
	});

	it('should successfully return false if a player has not been admitted (based on nickname)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.nickname);
		expect(exists).toBeFalsy();
	});

	it('should successfully return false if a player has not been admitted (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.id);
		expect(exists).toBeFalsy();
	});

	it('should successfully return false if no player exists when checking if admitted (based on nickname)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager2.nickname);
		expect(exists).toBeFalsy();
	});

	it('should successfully move a player from pending to the players array', () => {
		const game: Game = structuredClone(stubGamePending);
		const admitted = useGame(game).admitPlayer(stubVillager1.id);
		expect(admitted.players).toEqual(
			expect.arrayContaining([expect.objectContaining(stubVillager1)])
		);
		expect(admitted.pending!.length).toBe(0);
	});

	it('should throw an error if an attempt is made to admit a player from an empty pending list', () => {
		const game: Game = structuredClone(stubGameNew);
		expect(() => {
			useGame(game).admitPlayer(stubVillager1.id);
		}).toThrowError('Attempt to admit player from an empty pending list');
	});

	it('should throw an error if an attempt is made to admit a player not on the pending list', () => {
		const game: Game = structuredClone(stubGamePending);
		expect(() => {
			useGame(game).admitPlayer(stubVillager2.id);
		}).toThrowError('Attempt to admit player that is not on pending list');
	});

	it('should successfully remove a player from the pending array', () => {
		const game: Game = structuredClone(stubGamePending);
		const admitted = useGame(game).removePlayer(stubVillager1.id);
		expect(admitted.players).not.toContain(stubVillager1);
		expect(admitted.pending!.length).toBe(0);
	});

	it('should throw an error if an attempt is made to remove a player from an empty pending list', () => {
		const game: Game = structuredClone(stubGameNew);
		expect(() => {
			useGame(game).removePlayer(stubVillager1.id);
		}).toThrowError('Attempt to remove player from an empty pending list');
	});

	it('should throw an error if an attempt is made to remove a player not on the pending list', () => {
		const game: Game = structuredClone(stubGamePending);
		expect(() => {
			useGame(game).removePlayer(stubVillager2.id);
		}).toThrowError('Attempt to remove player that is not on pending list');
	});
});
