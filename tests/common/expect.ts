import { expect, expectTypeOf } from 'vitest';
import type { Mock } from 'vitest';

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
		} else if (received.activities) {
			return {
				pass: false,
				message: () =>
					'Game is NOT a match due to unexpected activities - ' +
					JSON.stringify(received.activities),
			};
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
		} else if (received.pending === undefined || players === undefined) {
			return {
				pass: false,
				message: () =>
					'Pending list does NOT match that provided - expected: ' +
					JSON.stringify(players) +
					'; received: ' +
					JSON.stringify(received.pending),
			};
		}
		expect(received.pending.length).toBe(players.length);
		for (let p = 0; p < players.length; p++) {
			expect(received.pending.at(p)!).toEqual(
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
		for (let p = 0; p < players.length; p++) {
			const player = received.players.at(p)!;
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
			try {
				expectTypeOf(a).toEqualTypeOf<Activity>();
				expect(a).toHaveChoices(activity);
				expect(a).toHaveVotes(activity);
				expect(a).toHaveEvicted(activity.evicted);
				match = true;
				break;
			} catch {
				// Intentionally ignored - we only care if none of them match
			}
		}
		return {
			pass: match,
			message: () => (match ? 'Activity found on game' : 'Activity NOT found on game'),
		};
	},
	toHaveChoices(received: Activity, activity: Activity) {
		const matchWolf =
			received.wolf === activity.wolf ||
			((received.wolf === null || received.wolf === undefined) &&
				(activity.wolf === null || activity.wolf === undefined));
		const matchHealer =
			received.healer === activity.healer ||
			((received.healer === null || received.healer === undefined) &&
				activity.healer === null &&
				activity.healer === undefined);
		return {
			pass: matchWolf && matchHealer,
			message: () => 'Choices match those found on activity',
		};
	},
	toHaveVotes(received: Activity, activity: Activity) {
		let match = false;
		if (
			received.votes &&
			activity.votes &&
			Object.keys(received.votes).length === Object.keys(activity.votes).length
		) {
			match = true;
			for (const key of Object.keys(received.votes)) {
				if (received.votes[key] !== activity.votes[key]) {
					match = false;
				}
			}
		} else if (received.votes && activity.votes) {
			match = true;
		} else if (!received.votes && !activity.votes) {
			match = true;
		} else if (
			(!received.votes && activity.votes && Object.keys(activity.votes).length === 0) ||
			(received.votes && Object.keys(received.votes).length === 0 && !activity.votes)
		) {
			match = true;
		}
		return {
			pass: match,
			message: () =>
				match
					? 'Votes match those found on activity'
					: 'Votes do NOT match those found on activity',
		};
	},
	toHaveEvicted(received: Activity, name: Undefinable<Nullable<string>>) {
		const match =
			received.evicted === name ||
			((received.evicted === null || received.evicted === undefined) &&
				name === null &&
				name === undefined);
		return {
			pass: match,
			message: () => 'Eviction matches that on activity',
		};
	},
	toHaveError(received: APIErrorResponse, message?: string) {
		expectTypeOf(received).toEqualTypeOf<APIErrorResponse>();
		if (message) {
			expect(JSON.stringify(received)).toContain(message);
		}
		return {
			pass: true,
			message: () => 'Expected error found',
		};
	},
	toBeSocketCall(received: Mock, type: string, game) {
		expect(received).toHaveBeenCalledWith(
			{
				game: game.id,
			},
			expect.objectContaining({
				type: type,
				game: expect.toEqualGame(game),
			})
		);
		return {
			pass: true,
			message: () => 'WebSocket call matches expected call',
		};
	},
});
