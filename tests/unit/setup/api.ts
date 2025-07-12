import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setupServer } from 'msw/node';

import type { H3Event, EventHandlerRequest } from 'h3';
import { createFetch } from 'ofetch';
import {
	stubErrorCode,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubGameNew,
	stubGameUpdateFailure,
	stubInvalidCodes,
	stubVillager7,
} from '@tests/common/stubs';
import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { mockDynamoResponse } from '@tests/unit/setup/dynamodb';

export const server = setupServer();
export const spyApi = vi.fn();

beforeAll(() => {
	// If we set any default handlers ALL responses will be processed by that.
	// But... if we don't MSW complains that there is no handler registered, so
	// we have to set this to bypass all the squawking.
	server.listen({
		onUnhandledRequest: 'bypass',
	});
	// Needed to make MSW work with Nuxt's implementation of fetch
	globalThis.$fetch = createFetch({
		fetch: globalThis.fetch,
		Headers: globalThis.Headers,
	}) as typeof $fetch;
});
afterAll(() => {
	server.close();
});

vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin);
vi.stubGlobal('defineEventHandler', (func: unknown) => func);

export const mockResponseStatus = vi.fn();
mockNuxtImport('setResponseStatus', () => (event: H3Event<EventHandlerRequest>, code: string) => {
	mockResponseStatus(event, code);
});

type Handler = (_event: H3Event) => Promise<Game | APIErrorResponse>;
type HandlerType = { default: Handler };

export const runCommonApiFailureTests = async (
	action: PutAction,
	handler: HandlerType,
	event: H3Event<EventHandlerRequest>,
	callback: (_code: Undefinable<Nullable<string>>, _action: boolean) => void
) => {
	it('should return an ErrorResponse (with validation messages) if the code is invalid', async () => {
		for (const code of stubInvalidCodes) {
			callback(code.code, true);

			const error = structuredClone(stubErrorCode);
			error.errors[0].message = code.error;
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect((response as APIErrorResponse).errors).toEqual(
				expect.arrayContaining(error.errors)
			);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		callback(stubGameIdNotFound, true);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		callback(stubGameNew.id, false);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const game = structuredClone(stubGameUpdateFailure);
		if (action === 'night') {
			game.stage = 'night';
		} else if (action === 'day') {
			game.stage = 'day';
			game.activities = [{ wolf: stubVillager7.id, healer: stubVillager7.id }];
		}
		mockDynamoResponse(game);
		callback(stubGameIdUpdateError, true);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);

		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});

	it('should return an ErrorResponse (with unexpected error) if something other than DynamoDB fails', async () => {
		const game = structuredClone(stubGameNew);
		mockDynamoResponse(game);
		// @ts-expect-error Type '{ id: string; }' is not assignable to type 'string'.
		callback({ id: 'Invalid' }, true);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
};
