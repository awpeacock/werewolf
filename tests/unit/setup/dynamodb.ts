import { vi } from 'vitest';

import type { NitroApp } from 'nitropack';
import type { H3Event, EventHandlerRequest } from 'h3';
import {
	ConditionalCheckFailedException,
	type DynamoDBServiceException,
} from '@aws-sdk/client-dynamodb';

import { stubInactiveGame } from './stubs';

vi.mock('@aws-sdk/client-dynamodb', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@aws-sdk/client-dynamodb')>();

	return {
		...actual,
		ConditionalCheckFailedException: class ConditionalCheckFailedException extends actual.DynamoDBServiceException {
			constructor(message: string) {
				super({
					name: 'ConditionalCheckFailedException',
					$fault: 'client',
					message,
					$metadata: {},
				});
			}
		},
	};
});

export const mockDynamoPut = vi.fn().mockImplementation(function (this: { input: unknown }, input) {
	this.input = input;
});
export const mockDynamoGet = vi.fn().mockImplementation(function (this: { input: unknown }, input) {
	this.input = input;
});
vi.mock('@aws-sdk/lib-dynamodb', () => {
	return {
		DynamoDBDocumentClient: {
			from: vi.fn().mockReturnValue({
				send: vi.fn((command) => {
					if (command instanceof mockDynamoPut) {
						if (command.input?.Item?.Id === 'FAIL') {
							return Promise.reject(new Error('Simulated "put" failure'));
						}
						if (command.input?.Item?.Id === 'DUPE') {
							return Promise.reject(
								new ConditionalCheckFailedException({
									message: 'Simulated "put" failure',
									$metadata: {} as DynamoDBServiceException['$metadata'],
								})
							);
						}
						return Promise.resolve({});
					}
					if (command instanceof mockDynamoGet) {
						if (command.input?.Key?.Id === 'EMPTY') {
							return Promise.resolve({ Item: undefined });
						}
						if (command.input?.Key?.Id === 'FAIL') {
							return Promise.reject(new Error('Simulated "get" failure'));
						}
						return Promise.resolve({
							Item: {
								Id: stubInactiveGame.id,
								Created: stubInactiveGame.created,
								Active: stubInactiveGame.active,
								Players: stubInactiveGame.players,
							},
						});
					}
				}),
			}),
		},
		GetCommand: mockDynamoGet,
		PutCommand: mockDynamoPut,
	};
});
export const stubDynamoWrapper: DynamoDBWrapper = {
	put: (_game: Game) => {
		return Promise.resolve();
	},
	get: (_id: string) => {
		return Promise.resolve(null);
	},
};
export const setupDynamoWrapperForEvent = async (): Promise<H3Event<EventHandlerRequest>> => {
	const plugin = await import('@/server/plugins/dynamodb');
	const event: H3Event<EventHandlerRequest> = {
		context: {},
	} as Partial<H3Event> as H3Event;
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
	return event;
};
