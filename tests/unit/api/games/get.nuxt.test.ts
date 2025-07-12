import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	GameIdNotFoundErrorResponse,
	InvalidGameIdErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import { stubGameIdGetError, stubGameIdNotFound, stubGameNew } from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';

describe('Games API (GET)', async () => {
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	// Do NOT import the handler here - it MUST always be imported AFTER
	// we mock UUID so that the mock is fired rather than the real method
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a request with an existing ID, and return the game', async () => {
		vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(stubGameNew.id));

		const handler = await import('@/server/api/games/[id]/index.get');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(
			expect.objectContaining({
				id: stubGameNew.id,
				active: false,
				players: stubGameNew.players,
			})
		);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should return a 404 if the code is not found', async () => {
		vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(stubGameIdNotFound));

		const handler = await import('@/server/api/games/[id]/index.get');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if the code is not valid', async () => {
		const codes = [undefined, 'AB1', 'AB1CD', 'AB-1', 'AB<1', "AB'1", 'AB,1', 'AB;1'];

		const handler = await import('@/server/api/games/[id]/index.get');
		for (const code of codes) {
			vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(code));

			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(InvalidGameIdErrorResponse);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(stubGameIdGetError));
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const handler = await import('@/server/api/games/[id]/index.get');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
