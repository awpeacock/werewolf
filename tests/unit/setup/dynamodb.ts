import { vi } from 'vitest';

import type { NitroApp } from 'nitropack';
import type { H3Event, EventHandlerRequest } from 'h3';
import {
	ConditionalCheckFailedException,
	type DynamoDBServiceException,
} from '@aws-sdk/client-dynamodb';

import {
	stubGameIdDuplicateError,
	stubGameIdGetError,
	stubGameIdNotFound,
	stubGameIdPutError,
	stubGameIdUpdateError,
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubGameReady,
} from '@tests/unit/setup/stubs';

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
export const mockDynamoUpdate = vi.fn().mockImplementation(function (
	this: { input: unknown },
	input
) {
	this.input = input;
});
export const mockDynamoGet = vi.fn().mockImplementation(function (this: { input: unknown }, input) {
	this.input = input;
});

let stubDynamoGame = stubGameNew;
export const mockDynamoResponse = (game: Game): void => {
	stubDynamoGame = game;
};

vi.mock('@aws-sdk/lib-dynamodb', () => {
	return {
		DynamoDBDocumentClient: {
			from: vi.fn().mockReturnValue({
				send: vi.fn((command) => {
					if (command instanceof mockDynamoPut) {
						if (command.input?.Item?.Id === stubGameIdPutError) {
							return Promise.reject(new Error('Simulated "put" failure'));
						}
						if (command.input?.Item?.Id === stubGameIdDuplicateError) {
							return Promise.reject(
								new ConditionalCheckFailedException({
									message: 'Simulated "put" failure',
									$metadata: {} as DynamoDBServiceException['$metadata'],
								})
							);
						}
						return Promise.resolve({});
					}
					if (command instanceof mockDynamoUpdate) {
						if (command.input?.Key?.Id === stubGameIdUpdateError) {
							return Promise.reject(new Error('Simulated "update" failure'));
						}
						return Promise.resolve({});
					}
					if (command instanceof mockDynamoGet) {
						if (command.input?.Key?.Id === stubGameIdNotFound) {
							return Promise.resolve({ Item: undefined });
						}
						if (command.input?.Key?.Id === stubGameIdGetError) {
							return Promise.reject(new Error('Simulated "get" failure'));
						}
						let response: Game;
						switch (command.input?.Key?.Id) {
							case stubGameInactive.id: {
								response = stubGameInactive;
								break;
							}
							case stubGamePending.id: {
								response = stubGamePending;
								break;
							}
							case stubGameReady.id: {
								response = stubGameReady;
								break;
							}
							default: {
								response = stubDynamoGame;
								break;
							}
						}
						return Promise.resolve({
							Item: {
								Id: structuredClone(response.id),
								Created: structuredClone(response.created),
								Started: structuredClone(response.started),
								Active: structuredClone(response.active),
								Players: structuredClone(response.players),
								Pending: structuredClone(response.pending),
								Stage: structuredClone(response.stage),
								Activities: structuredClone(response.activities),
							},
						});
					}
				}),
			}),
		},
		GetCommand: mockDynamoGet,
		UpdateCommand: mockDynamoUpdate,
		PutCommand: mockDynamoPut,
	};
});
export const stubDynamoWrapper: DynamoDBWrapper = {
	put: (_game: Game) => {
		return Promise.resolve();
	},
	update: (_game: Game) => {
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
