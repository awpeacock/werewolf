import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { NoUniqueIdErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { stubInactiveGame, stubMayor, stubNicknameError } from '@tests/unit/setup/stubs';

let mockRetries: Nullable<number> = 5;
mockNuxtImport('useRuntimeConfig', () => {
	return () => {
		return {
			AWS_REGION: 'AWS_REGION',
			AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
			AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
			AWS_DYNAMODB_TABLE: 'AWS_DYNAMODB_TABLE',
			CREATE_MAX_RETRIES: mockRetries,
		};
	};
});

vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin);
vi.stubGlobal('defineEventHandler', (func: unknown) => func);

describe('Games API (POST)', async () => {
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	// Do NOT import the handler here - it MUST always be imported AFTER
	// we mock UUID so that the mock is fired rather than the real method
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request, store the game and return the ID', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: stubMayor.nickname }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue(stubMayor.id),
		}));

		const handler = await import('@/server/api/games/index.post');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(
			expect.objectContaining({
				id: stubInactiveGame.id,
				active: false,
				players: stubInactiveGame.players,
			})
		);
	});

	it('should return an ErrorResponse (with validation messages) if the values are invalid', async () => {
		const handler = await import('@/server/api/games/index.post');

		const names = ['Jim', 'Jim James Jimmy Jameson', 'Jim-Bob'];
		const errors = ['nickname-min', 'nickname-max', 'nickname-invalid'];
		for (let n = 0; n < names.length; n++) {
			vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: names[n] }));

			const error = stubNicknameError;
			error.errors[0].message = errors[n];
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(error);
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: 'Mayoral Name' }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValueOnce('FAIL'),
		}));
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const handler = await import('@/server/api/games/index.post');
		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(spyError).toBeCalled();
	});

	it('should return an ErrorResponse (with unexpected error) if it hits the max retry limit', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ mayor: 'Mayoral Name' }));
		vi.doMock('uuid', () => ({
			v4: vi.fn().mockReturnValue('DUPE'),
		}));
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const retries: Array<Nullable<number>> = [null, 5];
		for (const r of retries) {
			mockRetries = r;

			const handler = await import('@/server/api/games/index.post');
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(NoUniqueIdErrorResponse);
			expect(spyError).toBeCalled();
		}
	});
});
