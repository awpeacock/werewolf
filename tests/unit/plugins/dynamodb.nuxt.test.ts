import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NitroApp } from 'nitropack';
import type { H3Event, EventHandlerRequest } from 'h3';

import { mockDynamoGet, mockDynamoPut } from '@tests/unit/setup/dynamodb';
import { stubFailureGame, stubInactiveGame } from '@tests/unit/setup/stubs';

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
		expect(dynamo).toHaveProperty('get');
		expect(typeof dynamo.get).toBe('function');
		expect(typeof dynamo.put).toBe('function');
		expect(spyLog).toBeCalled();
	});

	it('should generate a DynamoDB wrapper to add to the database', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			await dynamo.put(stubInactiveGame);
			expect(mockDynamoPut).toHaveBeenCalled();
			expect(mockDynamoPut).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					Item: expect.objectContaining({
						Id: stubInactiveGame.id,
					}),
				})
			);
			const args = mockDynamoPut.mock.calls[0][0];
			expect(args.Item.Id).toBe(stubInactiveGame.id);
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper to retrieve from the database', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		expect(async () => {
			const game: Game = (await dynamo.get(stubInactiveGame.id)) as Game;
			expect(mockDynamoGet).toHaveBeenCalled();
			expect(mockDynamoGet).toHaveBeenCalledWith(
				expect.objectContaining({
					TableName: expect.any(String),
					Key: { Id: stubInactiveGame.id },
				})
			);
			const args = mockDynamoGet.mock.calls[0][0];
			expect(args.Key.Id).toBe(stubInactiveGame.id);

			expect(game.active).not.toBeTruthy();
			expect(game.players).toEqual(stubInactiveGame.players);

			const nothing = await dynamo.get('EMPTY');
			expect(nothing).toBeNull();
		}).not.toThrow();
	});

	it('should generate a DynamoDB wrapper that logs and bubbles up errors', async () => {
		const dynamo: DynamoDBWrapper = event.context.dynamo;

		const log = vi.spyOn(console, 'error').mockImplementation(() => null);

		await expect(dynamo.put(stubFailureGame)).rejects.toThrow();
		expect(log).toHaveBeenLastCalledWith('Unable to save game: Simulated "put" failure');

		await expect(dynamo.get(stubFailureGame.id)).rejects.toThrow();
		expect(log).toHaveBeenLastCalledWith('Unable to retrieve game: Simulated "get" failure');
	});
});
