import { describe, expect, it } from 'vitest';

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
		const before: Game = stubGameNew;
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

	it('should successfully extract the mayor from a game', () => {
		const game: Game = stubGameNew;
		const mayor: Nullable<Player> = useGame(game).mayor();
		expect(mayor).toEqual(stubMayor);
	});

	it('should successfully return a player that exists in players array', () => {
		const game: Game = stubGameInactive;
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.nickname);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return a player that exists in pending array', () => {
		const game: Game = stubGamePending;
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager1.nickname);
		expect(villager).toEqual(stubVillager1);
	});

	it('should successfully return null if no player exists', () => {
		const game: Game = stubGamePending;
		const villager: Nullable<Player> = useGame(game).findPlayer(stubVillager2.nickname);
		expect(villager).toBeNull();
	});

	it('should successfully return true if a player exists in players array', () => {
		const game: Game = stubGameInactive;
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return true if a player exists in pending array', () => {
		const game: Game = stubGamePending;
		const exists: boolean = useGame(game).hasPlayer(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return false if no player exists', () => {
		const game: Game = stubGamePending;
		const exists: boolean = useGame(game).hasPlayer(stubVillager2.nickname);
		expect(exists).toBeFalsy();
	});

	it('should successfully return true if a player has been admitted', () => {
		const game: Game = stubGameInactive;
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.nickname);
		expect(exists).toBeTruthy();
	});

	it('should successfully return false if a player has not been admitted', () => {
		const game: Game = stubGamePending;
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager1.nickname);
		expect(exists).toBeFalsy();
	});

	it('should successfully return false if no player exists (when checking if admitted)', () => {
		const game: Game = stubGamePending;
		const exists: boolean = useGame(game).isPlayerAdmitted(stubVillager2.nickname);
		expect(exists).toBeFalsy();
	});
});
