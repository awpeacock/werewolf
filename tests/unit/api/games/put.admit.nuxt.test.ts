import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockResponseStatus } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import {
	stubGameInactive,
	stubMayor,
	stubGamePending,
	stubVillager1,
	stubGameNew,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubErrorCode,
	stubVillager2,
} from '@tests/unit/setup/stubs';
import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	PlayerAlreadyAdmittedErrorResponse,
	PlayerIdNotFoundErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Admit API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const stubParameters = (
		id: Nullable<Undefinable<string>>,
		action: boolean,
		auth?: Nullable<string>,
		villager?: Nullable<string>,
		admit?: boolean
	) => {
		vi.stubGlobal(
			'getRouterParam',
			vi.fn((_event, name) => {
				if (name === 'id') return id;
				if (name === 'action') return action ? 'admit' : undefined;
				return undefined;
			})
		);
		const body: AdmissionBody = { auth: auth!, villager: villager!, admit: admit! };
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request to admit a player', async () => {
		stubParameters(stubGamePending.id, true, stubMayor.id, stubVillager1.id, true);

		const response = await handler.default(event);
		expect(response).toEqual(
			expect.objectContaining({
				id: stubGamePending.id,
				active: false,
				players: stubGameInactive.players,
				pending: [],
			})
		);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGamePending.id,
				player: stubVillager1.id,
			},
			{
				type: 'admission',
				game: expect.objectContaining({
					id: stubGamePending.id,
					active: false,
					players: stubGameInactive.players,
					pending: [],
				}),
				response: true,
			}
		);
	});

	it('should take a valid request to deny a player', async () => {
		stubParameters(stubGamePending.id, true, stubMayor.id, stubVillager1.id, false);

		const response = await handler.default(event);
		expect(response).toEqual(
			expect.objectContaining({
				id: stubGamePending.id,
				active: false,
				players: stubGameNew.players,
				pending: [],
			})
		);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGamePending.id,
				player: stubVillager1.id,
			},
			{
				type: 'admission',
				game: expect.objectContaining({
					id: stubGamePending.id,
					active: false,
					players: stubGameNew.players,
					pending: [],
				}),
				response: false,
			}
		);
	});

	it('should reject a request to admit a player not in pending', async () => {
		stubParameters(stubGamePending.id, true, stubMayor.id, stubVillager2.id, true);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(PlayerIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should not throw an error admitting a player already admitted', async () => {
		stubParameters(stubGameInactive.id, true, stubMayor.id, stubVillager1.id, true);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(stubGameInactive);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should reject a request to deny a player already admitted', async () => {
		stubParameters(stubGameInactive.id, true, stubMayor.id, stubVillager1.id, false);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(PlayerAlreadyAdmittedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should reject any request without the correct mayor', async () => {
		stubParameters(stubGameInactive.id, true, stubVillager1.id, stubVillager1.id, true);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	it('should return an ErrorResponse (with validation messages) if the code is invalid', async () => {
		const codes = [
			null,
			undefined,
			'',
			'ABC',
			'ABCDE',
			'AB-C',
			'A BC',
			'AB<1',
			"AB'1",
			'AB,1',
			'AB;1',
		];
		const errors = [
			'code-required',
			'code-required',
			'code-required',
			'code-no-spaces',
			'code-max',
			'code-invalid',
			'code-no-spaces',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
		];
		for (let c = 0; c < codes.length; c++) {
			stubParameters(codes[c], true, stubMayor.id);

			const error = structuredClone(stubErrorCode);
			error.errors[0].message = errors[c];
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect((response as APIErrorResponse).errors).toEqual(
				expect.arrayContaining(error.errors)
			);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		stubParameters(stubGameIdNotFound, true, stubMayor.id, stubVillager1.id, true);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		stubParameters(stubGameNew.id, false, stubMayor.id, stubVillager1.id, false);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		stubParameters(stubGameIdUpdateError, true, stubMayor.id, stubVillager1.id);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
