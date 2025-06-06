import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NitroApp } from 'nitropack';
import type { H3Event, EventHandlerRequest } from 'h3';

import {
	mockDynamoGet,
	mockDynamoPut,
	mockDynamoResponse,
	mockDynamoUpdate,
} from '@tests/unit/setup/dynamodb';
import {
	stubActivityIncorrectVotes1,
	stubGameActive,
	stubGameIdGetError,
	stubGameIdNotFound,
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubGamePutFailure,
	stubGameUpdateFailure,
} from '@tests/unit/setup/stubs';

vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin);

describe('DynamoDB Nitro Plugin', async () => {
	const plugin = await import('@/server/plugins/dynamodb');
	const event: H3Event<EventHandlerRequest> = {
		context: {},
	} as Partial<H3Event> as H3Event;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should attach the DynamoDB wrapper to the event context', async () => {
		// This is to catch the initialisation message
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

		let callback: (_e: H3Event<EventHandlerRequest>) => void = () => {};
		const mockHook: NitroApp['hooks']['hook'] = vi.fn((name, cb) => {
			if (name === 'request') {
				callback = cb;
			}
			return () => {};
		});
		const mockNitro = {
			hooks: {
				hook: mockHook,
			},
		} as unknown as NitroApp;

		plugin.default(mockNitro);

		callback(event);

		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(dynamo).toBeDefined();
		expect(dynamo).toHaveProperty('put');
		expect(dynamo).toHaveProperty('update');
		expect(dynamo).toHaveProperty('get');
		expect(typeof dynamo.get).toBe('function');
		expect(typeof dynamo.update).toBe('function');
		expect(typeof dynamo.put).toBe('function');
		expect(spyLog).toBeCalled();
	});

	it('should generate a DynamoDB wrapper to add to the database', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			await dynamo.put(stubGameNew);
			expect(mockDynamoPut).toHaveBeenCalled();
			expect(mockDynamoPut).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					Item: expect.objectContaining({
						Id: stubGameNew.id,
					}),
				})
			);
			const args = mockDynamoPut.mock.calls[0][0];
			expect(args.Item.Id).toBe(stubGameNew.id);
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper to update the database with an inactive game', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			await dynamo.update(stubGameInactive);
			expect(mockDynamoUpdate).toHaveBeenCalled();
			expect(mockDynamoUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					ExpressionAttributeValues: expect.objectContaining({
						':players': stubGameInactive.players,
					}),
				})
			);
			const args = mockDynamoUpdate.mock.calls[0][0];
			expect(args.Key.Id).toBe(stubGameInactive.id);
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper to update the database with an active game', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			const game = structuredClone(stubGameActive);
			game.activities!.push(stubActivityIncorrectVotes1);
			await dynamo.update(game);
			expect(mockDynamoUpdate).toHaveBeenCalled();
			expect(mockDynamoUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					ExpressionAttributeValues: expect.objectContaining({
						':started': (stubGameActive.started as Date).toISOString(),
						':stage': stubGameActive.stage,
						':players': stubGameActive.players,
						':activities': [stubActivityIncorrectVotes1],
					}),
				})
			);
			const args = mockDynamoUpdate.mock.calls[0][0];
			expect(args.Key.Id).toBe(stubGameActive.id);
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper to retrieve from the database', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			const game: Game = (await dynamo.get(stubGameNew.id)) as Game;
			expect(mockDynamoGet).toHaveBeenCalled();
			expect(mockDynamoGet).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					Key: { Id: stubGameNew.id },
				})
			);
			const args = mockDynamoGet.mock.calls[0][0];
			expect(args.Key.Id).toBe(stubGameNew.id);

			expect(game.active).toBeFalsy();
			expect(game.players).toEqual(stubGameNew.players);

			mockDynamoResponse(stubGameActive);
			const active: Game = (await dynamo.get(stubGameActive.id)) as Game;
			expect(mockDynamoGet).toHaveBeenCalled();
			expect(mockDynamoGet).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					Key: { Id: stubGameActive.id },
				})
			);

			expect(active.started).toEqual(stubGameActive.started);
			expect(active.active).toBeTruthy();
			expect(active.players).toEqual(stubGameActive.players);
			expect(active.stage).toEqual(stubGameActive.stage);
			expect(active.activities).toEqual(stubGameActive.activities);

			const pending = await dynamo.get(stubGamePending.id);
			expect(pending!.pending).toEqual(stubGamePending.pending);

			const nothing = await dynamo.get(stubGameIdNotFound);
			expect(nothing).toBeNull();
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper that logs and bubbles up errors', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		const log = vi.spyOn(console, 'error').mockImplementation(() => null);

		// These no longer log, but rather purely bubble up (to prevent duplicate messages in the logs)
		await expect(dynamo.put(stubGamePutFailure)).rejects.toThrow('Simulated "put" failure');
		expect(log).not.toHaveBeenCalled();

		await expect(dynamo.update(stubGameUpdateFailure)).rejects.toThrow(
			'Simulated "update" failure'
		);
		expect(log).not.toHaveBeenCalled();

		await expect(dynamo.get(stubGameIdGetError)).rejects.toThrow('Simulated "get" failure');
		expect(log).not.toHaveBeenCalled();
	});
});
