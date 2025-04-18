import { describe, expect, it } from 'vitest';

import { stubInactiveGame } from '@tests/unit/setup/stubs';

describe('Game utilities', () => {
	it('should successfully parse a string based JSON', () => {
		const created = new Date();
		const before: Game = stubInactiveGame;
		before.created = created.toISOString();
		const after: Game = parseGame(before);
		expect(after).toEqual(
			expect.objectContaining({
				id: stubInactiveGame.id,
				created: created,
				active: false,
				players: stubInactiveGame.players,
			})
		);
	});
});
