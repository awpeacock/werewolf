import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as dotenv from 'dotenv';

import { createDynamoDBWrapper } from '@/server/util/useDynamoDB';

import {
	stubGameActive,
	stubGameComplete,
	stubGameIdGetError,
	stubGameInactive,
	stubGameNew,
	stubMayor,
	stubVillager1,
} from '@tests/common/stubs';

let dynamo: DynamoDBWrapper;

describe('DynamoDB Integration', async () => {
	const game: Game = {
		id: stubGameComplete.id,
		created: new Date(),
		active: false,
		players: [stubMayor],
	};

	beforeAll(async () => {
		dotenv.config({ path: '@/' });
		const config: Record<string, string> = process.env as Record<string, string>;
		dynamo = createDynamoDBWrapper(config);
	});

	it('successfully writes and reads a game', async () => {
		await dynamo.put(game);

		const response = await dynamo.get(game.id);
		expect(response).not.toBeNull();
		expect(response).toEqualGame(game);
	});

	it('successfully returns null trying to retrieve a code not on the DB', async () => {
		const response = await dynamo.get(stubGameIdGetError);
		expect(response).toBeNull();
	});

	it('successfully updates a game', async () => {
		const before = await dynamo.get(game.id);

		await dynamo.update({
			...before!,
			active: true,
			pending: [stubVillager1],
			version: before!.version,
		});

		const after = await dynamo.get(game.id);
		expect(after?.version).toBe(before!.version! + 1);
		expect(after?.active).toBe(true);
		expect(after).toHavePending([stubVillager1]);

		const expected = structuredClone(stubGameComplete);
		expected.id = game.id; // Get rid of this when its working
		expected.version = after!.version;
		await dynamo.update(expected);

		const final = await dynamo.get(game.id);
		expect(final?.version).toBe(after!.version! + 1);
		expect(final).toEqualGame(expected);
	});

	it('throws an error trying to create a new game with an existing ID', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		let thrown = false;
		try {
			await dynamo.put(game);
		} catch (e) {
			expect((e as Error).message).toContain('The conditional request failed');
			thrown = true;
		}
		expect(thrown).toBeTruthy();
		// It bubbles up the errors and they are logged by the APIs
		expect(spyError).not.toHaveBeenCalled();
	});

	it('throws an error trying to update a game with the wrong version (ie concurrency issue)', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		let thrown = false;
		try {
			const g = structuredClone(stubGameNew);
			await dynamo.put(g);

			g.version = 0;
			g.pending = [stubVillager1];
			await dynamo.update(g);
		} catch (e) {
			expect((e as Error).message).toContain('The conditional request failed');
			thrown = true;
		}
		expect(thrown).toBeTruthy();
		// It bubbles up the errors and they are logged by the APIs
		expect(spyError).not.toHaveBeenCalled();

		// Now check it hasn't updated the database
		const retrieved = await dynamo.get(stubGameNew.id);
		expect(retrieved).toEqualGame(stubGameNew);
		expect(retrieved!.pending).toBeUndefined();
	});

	it('throws an error trying to update a game without a version', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		let thrown = false;
		try {
			const g = structuredClone(stubGameInactive);
			await dynamo.put(g);

			g.version = undefined;
			await dynamo.update(g);
		} catch (e) {
			expect((e as Error).message).toContain('Cannot update a game without a version');
			thrown = true;
		}
		expect(thrown).toBeTruthy();
		// It bubbles up the errors and they are logged by the APIs
		expect(spyError).not.toHaveBeenCalled();
	});

	it('throws an error trying to update a game that does not exist', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		let thrown = false;
		try {
			const g = structuredClone(stubGameActive);
			g.version = 1;
			await dynamo.update(g);
		} catch (e) {
			expect((e as Error).message).toContain('The conditional request failed');
			thrown = true;
		}
		expect(thrown).toBeTruthy();
		// It bubbles up the errors and they are logged by the APIs
		expect(spyError).not.toHaveBeenCalled();
	});
});
