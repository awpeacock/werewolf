import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { NicknameAlreadyExistsErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubGameInactive,
	stubMayor,
	stubGameNew,
	stubErrorNickname,
	stubGamePending,
	stubVillager1,
	stubVillager2,
	stubGameConcurrentFailure,
	stubGameConcurrentRetry,
	stubInvalidNicknames,
} from '@tests/common/stubs';
import { mockResponseStatus, runCommonApiFailureTests } from '@tests/unit/setup/api';
import { setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setMockRetries, setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Join API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const callback = (code: Undefinable<Nullable<string>>, action: boolean) => {
		stubParameters(code, action, 'Nickname');
	};

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

	it('should trim the end of a nickname', async () => {
		stubParameters(stubGameNew.id, true, stubVillager1.nickname + ' ');

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

	it('should trim the start of a nickname', async () => {
		stubParameters(stubGameNew.id, true, ' ' + stubVillager1.nickname);

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

	it('should trim both ends of a nickname', async () => {
		stubParameters(stubGameNew.id, true, ' ' + stubVillager1.nickname + ' ');

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

	it('should return an ErrorResponse (with validation messages) if the nickname is invalid', async () => {
		for (const name of stubInvalidNicknames) {
			stubParameters(stubGameNew.id, true, name.nickname);

			const error = structuredClone(stubErrorNickname);
			error.errors[0].message = name.error;
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect(response).toEqual(error);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
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

	runCommonApiFailureTests('join', handler, event, callback);
});
