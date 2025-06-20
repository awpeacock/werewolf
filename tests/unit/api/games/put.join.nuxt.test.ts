import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NicknameAlreadyExistsErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubGameIdNotFound,
	stubGameInactive,
	stubMayor,
	stubGameNew,
	stubErrorNickname,
	stubGamePending,
	stubVillager1,
	stubVillager2,
	stubGameIdUpdateError,
	stubErrorCode,
	stubGameUpdateFailure,
	stubGameConcurrentFailure,
	stubGameConcurrentRetry,
} from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';
import { mockDynamoResponse, setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setMockRetries, setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Join API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const stubParameters = (
		id: Nullable<Undefinable<string>>,
		action: boolean,
		nickname?: Nullable<string>,
		invite?: string
	) => {
		vi.stubGlobal(
			'getRouterParam',
			vi.fn((_event, name) => {
				if (name === 'id') return id;
				if (name === 'action') return action ? 'join' : undefined;
				return undefined;
			})
		);
		if (invite) {
			vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ invite: invite }));
		} else {
			vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
		}
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ villager: nickname }));
	};

	const expectPending = (
		response: Game,
		original: Game,
		countPlayers: number,
		countPending: number,
		player?: Player
	) => {
		expect(response).toEqual(
			expect.objectContaining({
				id: original.id,
				active: original.active,
				players: original.players,
			})
		);
		expect(response.players.length).toEqual(countPlayers);
		expect(response.pending).not.toBeUndefined();
		expect(response.pending!.length).toEqual(countPending);
		expect(response.pending).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nickname: stubVillager1.nickname,
					roles: [],
				}),
			])
		);
		if (player) {
			expect(response.pending).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nickname: player.nickname,
						roles: [],
					}),
				])
			);
		}
	};

	const expectInactive = (
		response: Game,
		original: Game,
		countPlayers: number,
		countPending: number,
		player?: Player
	) => {
		expect(response).toEqual(
			expect.objectContaining({
				id: original.id,
				active: original.active,
			})
		);
		expect(response.players.length).toEqual(countPlayers);
		expect(response.players).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nickname: stubMayor.nickname,
					roles: stubMayor.roles,
				}),
				expect.objectContaining({
					nickname: stubVillager1.nickname,
					roles: stubVillager1.roles,
				}),
			])
		);
		if (player) {
			expect(response.players).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nickname: player.nickname,
						roles: player.roles,
					}),
				])
			);
		}
		if (countPending > 0) {
			expect(response.pending).not.toBeUndefined();
			expect(response.pending!.length).toEqual(countPending);
		} else {
			expect(response.pending).toBeUndefined();
		}
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request without an invite, update and return the revised game (where no pending players already exist)', async () => {
		stubParameters(stubGameNew.id, true, stubVillager1.nickname);

		const response = await handler.default(event);
		const game = response as Game;
		expectPending(game, stubGameNew, 1, 1);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: game.id,
				player: stubMayor.id,
			},
			{
				type: 'join-request',
				game: game,
				player: game.pending![0],
			}
		);
	});

	it('should take a valid request without an invite, update and return the revised game (where pending players already exist)', async () => {
		stubParameters(stubGamePending.id, true, stubVillager2.nickname);

		const response = await handler.default(event);
		expectPending(response as Game, stubGamePending, 1, 2, stubVillager2);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should take a valid request without an invite, but update nothing if the player is already there and return a validation error', async () => {
		stubParameters(stubGamePending.id, true, stubVillager1.nickname);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(NicknameAlreadyExistsErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should take a valid request with an invite, update and return the revised game (where no admitted players already exist)', async () => {
		stubParameters(stubGameNew.id, true, stubVillager1.nickname, stubMayor.id);

		const response = await handler.default(event);
		expectInactive(response as Game, stubGameNew, 2, 0);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should take a valid request with an invite, update and return the revised game (where admitted players already exist)', async () => {
		stubParameters(stubGameInactive.id, true, stubVillager2.nickname, stubMayor.id);

		const response = await handler.default(event);
		expectInactive(response as Game, stubGameInactive, 3, 0, stubVillager2);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should take a valid request with an invite, but not update if the player is already there and return a validation message', async () => {
		stubParameters(stubGameInactive.id, true, stubVillager1.nickname, stubMayor.id);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(NicknameAlreadyExistsErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should take a valid request with an invalid invite, update and return the revised game', async () => {
		stubParameters(stubGameNew.id, true, stubVillager1.nickname, stubVillager1.id);

		const response = await handler.default(event);
		expectPending(response as Game, stubGameNew, 1, 1);
		expect(mockResponseStatus).toBeCalledWith(event, 200);
	});

	it('should retry if two requests arrive at the same time and attempt to update the DB concurrently', async () => {
		stubParameters(stubGameConcurrentRetry.id, true, stubVillager2.nickname);
		const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => null);

		const retries: Array<Undefinable<number>> = [undefined, 5];
		for (const r of retries) {
			setMockRetries(r);

			const response = await handler.default(event);
			expectPending(response as Game, stubGameConcurrentRetry, 6, 2);
			expect(mockResponseStatus).toBeCalledWith(event, 200);
			expect(spyWarn).toBeCalled();
		}
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
			stubParameters(codes[c], true, 'Nickname');

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

	it('should return an ErrorResponse (with validation messages) if the nickname is invalid', async () => {
		const names = [null, undefined, '', 'Jim', 'Jim James Jimmy Jameson', 'Jim-Bob'];
		const errors = [
			'nickname-required',
			'nickname-required',
			'nickname-required',
			'nickname-min',
			'nickname-max',
			'nickname-invalid',
		];
		for (let n = 0; n < names.length; n++) {
			stubParameters(stubGameNew.id, true, names[n]);

			const error = structuredClone(stubErrorNickname);
			error.errors[0].message = errors[n];
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(error);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		stubParameters(stubGameIdNotFound, true, stubVillager1.nickname);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		stubParameters(stubGameNew.id, false, stubVillager1.nickname);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse if too many concurrent attempts are made to update DynamoDB', async () => {
		stubParameters(stubGameConcurrentFailure.id, true, stubVillager2.nickname);
		const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => null);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const retries: Array<Undefinable<number>> = [undefined, 5];
		for (const r of retries) {
			setMockRetries(r);

			const response = await handler.default(event);
			expect(response).not.toBeNull();
			expect(response).toEqual(UnexpectedErrorResponse);
			expect(mockResponseStatus).toBeCalledWith(event, 500);
			expect(spyError).toBeCalled();
			expect(spyWarn).toBeCalled();
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const game = structuredClone(stubGameUpdateFailure);
		mockDynamoResponse(game);
		stubParameters(stubGameIdUpdateError, true, 'NewNickname');
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});

	it('should return an ErrorResponse (with unexpected error) if something other than DynamoDB fails', async () => {
		const game = structuredClone(stubGameNew);
		mockDynamoResponse(game);
		// @ts-expect-error Type '{ id: string; }' is not assignable to type 'string'.
		stubParameters({ id: 'Invalid' }, true, 'NewNickname');
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
