import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NotEnoughPlayersErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { Role } from '@/types/enums';

import { mockResponseStatus } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import {
	stubMayor,
	stubGameReady,
	stubErrorCode,
	stubGameIdNotFound,
	stubGameNew,
	stubGameIdUpdateError,
	stubGameInactive,
	stubVillager1,
} from '@tests/unit/setup/stubs';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Start API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const stubParameters = (
		id: Nullable<Undefinable<string>>,
		action: boolean,
		auth?: Nullable<string>
	) => {
		vi.stubGlobal(
			'getRouterParam',
			vi.fn((_event, name) => {
				if (name === 'id') return id;
				if (name === 'action') return action ? 'start' : undefined;
				return undefined;
			})
		);
		const body: StartGameBody = { auth: auth! };
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));
	};

	const expectAllocation = (game: Game) => {
		// Test that wolf and healer have been distributed correctly
		const count = { wolf: 0, healer: 0, villager: 0 };
		for (const player of game.players) {
			expect(player.roles.length).not.toBeGreaterThan(2);
			if (player.roles.length === 2) {
				expect(player.roles).toContain(Role.MAYOR);
			}
			if (player.roles.includes(Role.WOLF)) {
				count.wolf++;
			}
			if (player.roles.includes(Role.HEALER)) {
				count.healer++;
			}
			if (player.roles.includes(Role.VILLAGER)) {
				count.villager++;
			}
		}
		expect(count.wolf).toBe(1);
		expect(count.healer).toBe(1);
		expect(count.villager).toBe(4);
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request to start a game', async () => {
		stubParameters(stubGameReady.id, true, stubMayor.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toMatchObject({
			id: stubGameReady.id,
			active: true,
			players: expect.arrayContaining(
				stubGameReady.players.map((p) =>
					expect.objectContaining({
						id: p.id,
						nickname: p.nickname,
					})
				)
			),
		});
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		expectAllocation(response);

		// Test that the web socket notification is published
		for (const player of stubGameReady.players) {
			expect(mockWSSend).toHaveBeenCalledWith(
				{
					game: stubGameReady.id,
					player: player.id,
				},
				expect.objectContaining({
					type: 'start-game',
					game: expect.objectContaining({
						id: stubGameReady.id,
						active: true,
					}),
					role: expect.toBeOneOf([Role.VILLAGER, Role.WOLF, Role.HEALER]),
				})
			);
		}
	});

	it('should assign wolf and healer in all random scenarios', async () => {
		stubParameters(stubGameReady.id, true, stubMayor.id);

		const numbers = [
			[0.1, 0.1, 0, 1],
			[0.9, 0.9, 5, 0],
			[0.3, 0.7, 1, 4],
			[0.6, 0.4, 3, 2],
		];
		for (const n of numbers) {
			vi.spyOn(Math, 'random').mockReturnValueOnce(n[0]).mockReturnValueOnce(n[1]);
			const response = (await handler.default(event)) as Game;
			expect(mockResponseStatus).toBeCalledWith(event, 200);
			expectAllocation(response);
			expect(response.players[n[2]].roles).toContain(Role.WOLF);
			expect(response.players[n[3]].roles).toContain(Role.HEALER);
		}
	});

	it('should reject any request without the correct mayor', async () => {
		stubParameters(stubGameInactive.id, true, stubVillager1.id);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	it('should reject any request where the game does not have enough players', async () => {
		stubParameters(stubGameInactive.id, true, stubMayor.id);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(NotEnoughPlayersErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
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
		stubParameters(stubGameIdNotFound, true, stubMayor.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		stubParameters(stubGameNew.id, false, stubMayor.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		stubParameters(stubGameIdUpdateError, true, stubMayor.id);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);

		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
