import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
	stubMayor,
	stubGameNew,
	stubGamePending,
	stubGameInactive,
	stubVillager1,
	stubVillager2,
	stubGameActive,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubHealer,
	stubWolf,
	stubActivityNotSaved1,
	stubActivitySaved1,
	stubActivityNotSaved2,
	stubActivitySaved2,
	stubActivityBlank,
	stubGameIncompleteActivity,
	stubGameIncorrectVotes1,
	stubGameBlank,
	stubGameWolfWin,
	stubActivityTie,
	stubActivityIncorrectVotes1,
} from '@tests/common/stubs';
import { server, spyApi } from '@tests/unit/setup/api';

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
		// Move the mayor out to test that the code successfully ignores a non-mayor
		game.players.unshift(stubVillager1);
		const mayor: Nullable<Player> = useGame(game).getMayor();
		expect(mayor).toEqual(stubMayor);
	});

	it('should successfully return null if a game has no mayor', () => {
		const game: Game = structuredClone(stubGameBlank);
		const mayor: Nullable<Player> = useGame(game).getMayor();
		expect(mayor).toBeNull();
	});

	it('should successfully extract the wolf from a game (when set)', () => {
		const game: Game = structuredClone(stubGameActive);
		const wolf: Nullable<Player> = useGame(game).getWolf();
		expect(wolf).toEqual(stubWolf);
	});

	it('should successfully return null if trying to extract the wolf from a game before it has been set', () => {
		const game: Game = structuredClone(stubGameInactive);
		const wolf: Nullable<Player> = useGame(game).getWolf();
		expect(wolf).toBeNull();
	});

	it('should successfully extract the healer from a game (when set)', () => {
		const game: Game = structuredClone(stubGameActive);
		const healer: Nullable<Player> = useGame(game).getHealer();
		expect(healer).toEqual(stubHealer);
	});

	it('should successfully return null if trying to extract the healer from a game before it has been set', () => {
		const game: Game = structuredClone(stubGameNew);
		const healer: Nullable<Player> = useGame(game).getHealer();
		expect(healer).toBeNull();
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

	it('should successfully return false if no player exists when checking if admitted (based on ID)', () => {
		const game: Game = structuredClone(stubGamePending);
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager2.id);
		expect(exists).toBeFalsy();
	});

	it('should successfully return true if a player is dead (based on nickname)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push({ wolf: stubVillager6.id, healer: stubVillager7.id, votes: {} });
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.nickname);
		expect(dead).toBeTruthy();
	});

	it('should successfully return true if a player is dead (based on ID)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push({ wolf: stubVillager6.id, healer: stubVillager7.id, votes: {} });
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.id);
		expect(dead).toBeTruthy();
	});

	it('should successfully return false if a player is not dead due to no activity (based on nickname)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.nickname);
		expect(dead).toBeFalsy();
	});

	it('should successfully return false if a player is not dead due to no activity (based on ID)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.id);
		expect(dead).toBeFalsy();
	});

	it('should successfully return false if a player is not dead when not attacked (based on nickname)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivityNotSaved1);
		const dead: boolean = useGame(game).isPlayerDead(stubVillager8.nickname);
		expect(dead).toBeFalsy();
	});

	it('should successfully return false if a player is not dead when not attacked (based on ID)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivityNotSaved1);
		const dead: boolean = useGame(game).isPlayerDead(stubVillager8.id);
		expect(dead).toBeFalsy();
	});

	it('should successfully return false if a player is not dead, when saved (based on nickname)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push({ wolf: stubVillager6.id, healer: stubVillager6.id, votes: {} });
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.nickname);
		expect(dead).toBeFalsy();
	});

	it('should successfully return false if a player is not dead, when saved (based on ID)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivitySaved1);
		const dead: boolean = useGame(game).isPlayerDead(stubVillager6.id);
		expect(dead).toBeFalsy();
	});

	it('should successfully retrieve a list of all the dead players for a game', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivityNotSaved1);
		game.activities?.push(stubActivitySaved2);
		game.activities?.push(stubActivityNotSaved2);
		const dead: Array<Player> = useGame(game).getDeadPlayers();
		expect(dead).toEqual([stubVillager6, stubVillager8]);
	});

	it('should successfully retrieve an empty list of dead players for an unstarted game', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const dead: Array<Player> = useGame(game).getDeadPlayers();
		expect(dead).toEqual([]);
	});

	it('should successfully retrieve an empty list of dead players for a game with a saved vilager', () => {
		const game: Game = structuredClone(stubGameInactive);
		game.activities?.push(stubActivitySaved1);
		const dead: Array<Player> = useGame(game).getDeadPlayers();
		expect(dead).toEqual([]);
	});

	it('should successfully return true if a player has been evicted (based on nickname)', () => {
		const game: Game = structuredClone(stubGameWolfWin);
		const activity: Activity = game.activities!.at(1)!;
		activity.votes![stubWolf.id] = stubMayor.id;
		activity.evicted = stubMayor.id;
		const evicted: boolean = useGame(game).isPlayerEvicted(stubMayor.nickname);
		expect(evicted).toBeTruthy();
	});

	it('should successfully return true if a player has been evicted (based on ID)', () => {
		const game: Game = structuredClone(stubGameWolfWin);
		const activity: Activity = game.activities!.at(1)!;
		activity.votes![stubWolf.id] = stubMayor.id;
		activity.evicted = stubMayor.id;
		const evicted: boolean = useGame(game).isPlayerEvicted(stubMayor.id);
		expect(evicted).toBeTruthy();
	});

	it('should successfully return false if a player is not evicted due to no activity (based on nickname)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const evicted: boolean = useGame(game).isPlayerEvicted(stubWolf.nickname);
		expect(evicted).toBeFalsy();
	});

	it('should successfully return false if a player is not evicted due to no activity (based on ID)', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const evicted: boolean = useGame(game).isPlayerEvicted(stubWolf.nickname);
		expect(evicted).toBeFalsy();
	});

	it('should successfully return false if a player has not been evicted (based on nickname)', () => {
		const game: Game = structuredClone(stubGameWolfWin);
		const evicted: boolean = useGame(game).isPlayerEvicted(stubWolf.nickname);
		expect(evicted).toBeFalsy();
	});

	it('should successfully return false if a player has not been evicted (based on ID)', () => {
		const game: Game = structuredClone(stubGameWolfWin);
		const evicted: boolean = useGame(game).isPlayerDead(stubWolf.id);
		expect(evicted).toBeFalsy();
	});

	it('should successfully retrieve a list of all the evicted players for a game', () => {
		const game: Game = structuredClone(stubGameWolfWin);
		game.activities!.at(-1)!.votes![stubVillager8.id] = stubHealer.id;
		game.activities!.at(-1)!.evicted = stubHealer.id;
		const evicted: Array<Player> = useGame(game).getEvictedPlayers();
		expect(evicted).toEqual([stubVillager6, /*stubMayor, */ stubHealer]);
	});

	it('should successfully retrieve an empty list of evicted players for an unstarted game', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities = undefined;
		const evicted: Array<Player> = useGame(game).getEvictedPlayers();
		expect(evicted).toEqual([]);
	});

	it('should successfully retrieve an empty list of evicted players for a tied game', () => {
		const game: Game = structuredClone(stubGameInactive);
		game.activities?.push(stubActivityTie);
		const evicted: Array<Player> = useGame(game).getEvictedPlayers();
		expect(evicted).toEqual([]);
	});

	it('should successfully retrieve a list of all the remaining live players for a game with deaths', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivityNotSaved1);
		game.activities?.push(stubActivitySaved2);
		game.activities?.push(stubActivityNotSaved2);
		const live: Array<Player> = useGame(game).getAlivePlayers();
		expect(live).toEqual([stubMayor, stubVillager7, stubWolf, stubHealer]);
	});

	it('should successfully retrieve a list of all the remaining live players for a game with deaths and evictions', () => {
		const game: Game = structuredClone(stubGameActive);
		const activity: Activity = structuredClone(stubActivityIncorrectVotes1);
		activity!.votes![stubVillager6.id] = stubWolf.id;
		game.activities?.push(activity);
		const live: Array<Player> = useGame(game).getAlivePlayers();
		expect(live).toEqual(
			expect.arrayContaining([stubMayor, stubVillager7, stubWolf, stubHealer])
		);
	});

	it('should successfully retrieve a full list of alive players for an unstarted game', () => {
		const game: Game = structuredClone(stubGameInactive);
		game.activities = undefined;
		const live: Array<Player> = useGame(game).getAlivePlayers();
		expect(live).toEqual(stubGameInactive.players);
	});

	it('should successfully retrieve a full list of alive players for a game with a saved villager', () => {
		const game: Game = structuredClone(stubGameActive);
		game.activities?.push(stubActivitySaved1);
		const live: Array<Player> = useGame(game).getAlivePlayers();
		expect(live).toEqual(stubGameActive.players);
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

	it('should return the correct latest activity for an active game with only one', () => {
		const game: Game = structuredClone(stubGameIncompleteActivity);
		const activity: Activity = useGame(game).getCurrentActivity();
		expect(activity).toEqual(stubActivityNotSaved1);
	});

	it('should return an empty Activity as the "current" for an inactive game', () => {
		const game: Game = structuredClone(stubGameInactive);
		game.activities = undefined;
		const activity: Activity = useGame(game).getCurrentActivity();
		expect(activity).toEqual(stubActivityBlank);
	});

	it('should return an empty Activity as the "current" for an active game', () => {
		const game: Game = structuredClone(stubGameActive);
		const activity: Activity = useGame(game).getCurrentActivity();
		expect(activity).toEqual(stubActivityBlank);
	});

	it('should return an empty Activity as the "current" for an active game with a completed activity', () => {
		const game: Game = structuredClone(stubGameIncorrectVotes1);
		game.activities!.at(-1)!.votes![stubVillager6.id] = stubWolf.id;
		const activity: Activity = useGame(game).getCurrentActivity();
		expect(activity).toEqual(stubActivityBlank);
	});

	it('should mark an activity with no wolf choice as incomplete', () => {
		const game: Game = structuredClone(stubGameActive);
		let activity: Activity = { healer: stubMayor.id };
		let complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeFalsy();
		activity = { wolf: null, healer: stubMayor.id };
		complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeFalsy();
	});

	it('should mark an activity with no healer choice as incomplete', () => {
		const game: Game = structuredClone(stubGameActive);
		let activity: Activity = { wolf: stubMayor.id };
		let complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeFalsy();
		activity = { wolf: stubMayor.id, healer: null };
		complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeFalsy();
	});

	it('should mark an activity with no votes as incomplete', () => {
		const game: Game = structuredClone(stubGameActive);
		const activity: Activity = { wolf: stubMayor.id, healer: stubMayor.id };
		const complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeFalsy();
	});

	it('should mark an activity without enough votes as incomplete', () => {
		const game: Game = structuredClone(stubGameActive);
		const complete = useGame(game).isActivityComplete(stubActivityIncorrectVotes1);
		expect(complete).toBeFalsy();
	});

	it('should mark a complete activity as such', () => {
		const game: Game = structuredClone(stubGameIncorrectVotes1);
		const activity: Activity = stubActivityIncorrectVotes1;
		activity.votes![stubVillager6.id] = stubWolf.id;
		const complete = useGame(game).isActivityComplete(activity);
		expect(complete).toBeTruthy();
	});
});
