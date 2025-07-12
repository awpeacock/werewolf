import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	stubGameInactive,
	stubMayor,
	stubGamePending,
	stubVillager1,
	stubGameNew,
	stubVillager2,
} from '@tests/common/stubs';
import { mockResponseStatus, runCommonApiFailureTests } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import {
	PlayerAlreadyAdmittedErrorResponse,
	PlayerIdNotFoundErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Admit API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const callback = (code: Undefinable<Nullable<string>>, action: boolean) => {
		stubParameters(code, action, stubMayor.id, stubVillager1.id);
	};

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

		const response: Game = (await handler.default(event)) as Game;
		expect(response).not.toBeNull();
		expect(response.players).toMatchObject(stubGameInactive.players);
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

	runCommonApiFailureTests('admit', handler, event, callback);
});
