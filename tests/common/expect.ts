import { expect, expectTypeOf } from 'vitest';

//TODO: Retrofit to the unit tests
expect.extend({
	toEqualGame(received: Game, expected: Game) {
		expectTypeOf(received).toEqualTypeOf<Game>();
		expect(received).toEqual(
			expect.objectContaining({
				id: expected.id,
				active: expected.active,
			})
		);
		if (expected.stage) {
			expect(received.stage).toEqual(expected.stage);
		}
		expect(received).toHavePending(expected.pending);
		expect(received).toHavePlayers(expected.players);
		if (expected.activities) {
			for (const activity of expected.activities) {
				expect(received).toHaveActivity(activity);
			}
		} else {
			if (received.activities) {
				return {
					pass: false,
					message: () =>
						'Game is NOT a match due to unexpected activities - ' +
						JSON.stringify(received.activities),
				};
			}
		}
		return {
			pass: true,
			message: () => 'Game is a match for that provided',
		};
	},
	toHavePending(received: Game, players?: Array<Player>) {
		expectTypeOf(received).toEqualTypeOf<Game>();
		if (received.pending === undefined && players === undefined) {
			return {
				pass: true,
				message: () => 'Pending list is empty',
			};
		} else {
			if (received.pending === undefined || players === undefined) {
				return {
					pass: false,
					message: () =>
						'Pending list does NOT match that provided - expected: ' +
						JSON.stringify(players) +
						'; received: ' +
						JSON.stringify(received.pending),
				};
			}
		}
		expect(received.pending!.length).toBe(players.length);
		for (let p = 0; p < players.length; p++) {
			expect(received.pending!.at(p)!).toEqual(
				expect.objectContaining({
					nickname: players[p].nickname,
					roles: [],
				})
			);
		}
		return {
			pass: true,
			message: () => 'Pending list contains players provided',
		};
	},
	toHavePlayers(received: Game, players: Array<Player>) {
		expectTypeOf(received).toEqualTypeOf<Game>();
		expect(received.players.length).toBe(players.length);
		for (let p = 0; p < players.length; p++) {
			const player = received.players!.at(p)!;
			expectTypeOf(player).toEqualTypeOf<Player>();
			expect(player.nickname).toEqual(players[p].nickname);
			for (const role of players[p].roles) {
				expect(player.roles).toContain(role);
			}
		}
		return {
			pass: true,
			message: () => 'Players list contains players provided',
		};
	},
	toHaveActivity(received: Game, activity: Activity) {
		expectTypeOf(received).toEqualTypeOf<Game>();
		let match = false;
		for (const a of received.activities!) {
			expectTypeOf(a).toEqualTypeOf<Activity>();
			const matchWolf =
				a.wolf === activity.wolf ||
				((a.wolf === null || a.wolf === undefined) &&
					(activity.wolf === null || activity.wolf === undefined));
			const matchHealer =
				a.healer === activity.healer ||
				((a.healer === null || a.healer === undefined) &&
					activity.healer === null &&
					activity.healer === undefined);
			let matchVotes = false;
			if (a.votes!.length === activity.votes!.length) {
				matchVotes = true;
				for (const key of Object.keys(a.votes!)) {
					if (a.votes![key] !== activity.votes![key]) {
						matchVotes = false;
					}
				}
			}
			const matchEvicted =
				a.evicted === activity.evicted ||
				((a.evicted === null || a.evicted === undefined) &&
					activity.evicted === null &&
					activity.evicted === undefined);
			if (matchWolf && matchHealer && matchVotes && matchEvicted) {
				match = true;
			}
		}
		return {
			pass: match,
			message: () => 'Activity ' + (match ? '' : 'NOT ') + 'found on game',
		};
	},
	async toHaveError(received: APIErrorResponse, message?: string) {
		expectTypeOf(received).toEqualTypeOf<APIErrorResponse>();
		if (message) {
			expect(JSON.stringify(received)).toContain(message);
		}
		return {
			pass: true,
			message: () => 'Expected error found',
		};
	},
});
