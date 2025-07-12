import { beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';

import { NoUniqueIdErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubGameNew,
	stubMayor,
	stubErrorNickname,
	stubGameIdDuplicateError,
	stubGameIdPutError,
	stubInvalidNicknames,
} from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setMockRetries, setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';

describe('Games API (POST)', async () => {
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	// Do NOT import the handler here - it MUST always be imported AFTER
	// we mock UUID so that the mock is fired rather than the real method
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const expectNewGame = async () => {
		const handler = await import('@/server/api/games/index.post');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqualGame(stubGameNew);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request, store the game and return the ID', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: stubMayor.nickname }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubMayor.id),
		}));
		expectNewGame();
	});

	it('should trim the end of a nickname', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: stubMayor.nickname + ' ' }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubMayor.id),
		}));
		expectNewGame();
	});

	it('should trim the start of a nickname', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: ' ' + stubMayor.nickname }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubMayor.id),
		}));
		expectNewGame();
	});

	it('should trim both ends of a nickname', async () => {
		vi.stubGlobal(
			'readBody',
			vi.fn().mockResolvedValue({ mayor: ' ' + stubMayor.nickname + ' ' })
		);
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubMayor.id),
		}));
		expectNewGame();
	});

	it('should return an ErrorResponse (with validation messages) if the values are invalid', async () => {
		const handler = await import('@/server/api/games/index.post');

		for (const name of stubInvalidNicknames) {
			vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: name.nickname }));

			const error = stubErrorNickname;
			error.errors[0].message = name.error;
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(error);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: 'Mayoral Name' }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValueOnce(stubGameIdPutError),
		}));
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const handler = await import('@/server/api/games/index.post');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});

	it('should return an ErrorResponse (with unexpected error) if it hits the max retry limit', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: 'Mayoral Name' }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubGameIdDuplicateError),
		}));
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const retries: Array<Undefinable<number>> = [undefined, 5];
		for (const r of retries) {
			setMockRetries(r);

			const handler = await import('@/server/api/games/index.post');
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(NoUniqueIdErrorResponse);
			expect(mockResponseStatus).toBeCalledWith(event, 500);
			expect(spyError).toBeCalled();
		}
	});
});
