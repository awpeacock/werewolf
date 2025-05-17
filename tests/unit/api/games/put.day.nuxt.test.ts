import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AttemptToVoteOutsideDayErrorResponse,
	CannotVoteForDeadPlayerErrorReponse,
	CannotVoteForEvictedPlayerErrorReponse,
	CannotVoteTwiceErrorReponse,
	CannotVoteUntilActivityCompleteErrorReponse,
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import { mockResponseStatus } from '@tests/unit/setup/api';
import { mockDynamoResponse, setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import {
	stubActivityIncorrectVotes1,
	stubErrorCode,
	stubGameActive,
	stubGameCorrectVotes,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubGameIncorrectVotes1,
	stubGameTie,
	stubGameUpdateFailure,
	stubGameWolfWin,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/unit/setup/stubs';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Day API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const stubParameters = (
		id: Nullable<Undefinable<string>>,
		action: boolean,
		player: string,
		vote: string
	) => {
		vi.stubGlobal(
			'getRouterParam',
			vi.fn((_event, name) => {
				if (name === 'id') return id;
				if (name === 'action') return action ? 'day' : undefined;
				return undefined;
			})
		);
		const body: VoteBody = { player: player, vote: vote };
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid vote submission from an alive player', async () => {
		const game = structuredClone(stubGameActive);
		game.stage = 'day';
		game.activities?.push({ wolf: stubVillager7.id, healer: stubVillager8.id });
		mockDynamoResponse(game);
		const vote: Votes = {};
		vote[stubVillager6.id] = stubVillager8.id;

		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager8.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toMatchObject({
			id: stubGameActive.id,
			active: true,
			stage: 'day',
			players: expect.arrayContaining(
				stubGameActive.players.map((p) =>
					expect.objectContaining({
						id: p.id,
						nickname: p.nickname,
					})
				)
			),
		});
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		expect(response.activities?.at(-1)).toEqual(
			expect.objectContaining({
				wolf: stubVillager7.id,
				healer: stubVillager8.id,
				votes: vote,
			})
		);
	});

	it('should move the game on to eviction if all votes are in, and the game is not over', async () => {
		const game = structuredClone(stubGameIncorrectVotes1);
		mockDynamoResponse(game);
		stubParameters(stubGameActive.id, true, stubVillager6.id, stubWolf.id);

		await handler.default(event);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		const activity = structuredClone(stubActivityIncorrectVotes1);
		activity.votes![stubVillager6.id] = stubWolf.id;
		activity.evicted = stubVillager6.id;
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGameIncorrectVotes1.id,
			},
			expect.objectContaining({
				type: 'eviction',
				game: expect.objectContaining({
					id: stubGameIncorrectVotes1.id,
					active: true,
					activities: expect.arrayContaining([activity]),
				}),
				player: stubVillager6,
			})
		);
		expect(activity.evicted).toEqual(stubVillager6.id);
	});

	it('should mark nobody as evicted if the result of a vote is a tie', async () => {
		const game = structuredClone(stubGameTie);
		mockDynamoResponse(game);
		stubParameters(stubGameTie.id, true, stubVillager6.id, stubWolf.id);

		await handler.default(event);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		const activity = game.activities!.at(-1)!;
		activity.votes![stubVillager6.id] = stubWolf.id;
		expect(mockWSSend).toHaveBeenCalled();
		expect(activity.evicted).toBeUndefined();
	});

	it('should finish the game if all votes are in, and the wolf has been found', async () => {
		const game = structuredClone(stubGameCorrectVotes);
		mockDynamoResponse(game);
		stubParameters(stubGameActive.id, true, stubVillager6.id, stubWolf.id);

		await handler.default(event);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGameCorrectVotes.id,
			},
			expect.objectContaining({
				type: 'game-over',
				game: expect.objectContaining({
					id: stubGameCorrectVotes.id,
					active: false,
					winner: 'village',
				}),
			})
		);
	});

	it('should finish the game if all votes are in, and the wolf has won', async () => {
		const game = structuredClone(stubGameWolfWin);
		mockDynamoResponse(game);
		stubParameters(stubGameWolfWin.id, true, stubMayor.id, stubHealer.id);

		await handler.default(event);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGameWolfWin.id,
			},
			expect.objectContaining({
				type: 'game-over',
				game: expect.objectContaining({
					id: stubGameWolfWin.id,
					active: false,
					winner: 'wolf',
				}),
			})
		);
	});

	it('should not allow a dead player to vote', async () => {
		const game = structuredClone(stubGameIncorrectVotes1);
		mockDynamoResponse(game);
		stubParameters(stubGameIncorrectVotes1.id, true, stubVillager8.id, stubVillager7.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	it('should not allow an evicted player to vote', async () => {
		const game = structuredClone(stubGameWolfWin);
		mockDynamoResponse(game);
		stubParameters(stubGameWolfWin.id, true, stubVillager6.id, stubWolf.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	it('should not allow a player to vote for a dead villager', async () => {
		const game = structuredClone(stubGameIncorrectVotes1);
		mockDynamoResponse(game);
		stubParameters(stubGameIncorrectVotes1.id, true, stubVillager6.id, stubVillager8.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(CannotVoteForDeadPlayerErrorReponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote for an evicted villager', async () => {
		const game = structuredClone(stubGameWolfWin);
		mockDynamoResponse(game);
		stubParameters(stubGameWolfWin.id, true, stubWolf.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(CannotVoteForEvictedPlayerErrorReponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote outside day time', async () => {
		const game = structuredClone(stubGameActive);
		mockDynamoResponse(game);
		const vote: Votes = {};
		vote[stubVillager6.id] = stubVillager7.id;

		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager7.id);

		const response = await handler.default(event);
		expect(response).toMatchObject(AttemptToVoteOutsideDayErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	// This *SHOULD* never happen (shouldn't get to "day" without both choices),
	// but let's code defensively to be on the safe side
	it('should not allow a player to vote if the wolf choice has not been made', async () => {
		const game = structuredClone(stubGameActive);
		game.stage = 'day';
		game.activities?.push({ healer: stubVillager7.id });
		mockDynamoResponse(game);
		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager7.id);

		const response = await handler.default(event);
		expect(response).toEqual(CannotVoteUntilActivityCompleteErrorReponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote if the healer choice has not been made', async () => {
		const game = structuredClone(stubGameActive);
		game.stage = 'day';
		game.activities?.push({ wolf: stubVillager7.id });
		mockDynamoResponse(game);
		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager7.id);

		const response = await handler.default(event);
		expect(response).toEqual(CannotVoteUntilActivityCompleteErrorReponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote twice', async () => {
		const game = structuredClone(stubGameIncorrectVotes1);
		mockDynamoResponse(game);
		stubParameters(stubGameIncorrectVotes1.id, true, stubVillager7.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(CannotVoteTwiceErrorReponse);
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
			stubParameters(codes[c], true, stubWolf.id, stubVillager6.id);

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
		stubParameters(stubGameIdNotFound, true, stubWolf.id, stubVillager6.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		stubParameters(stubGameActive.id, false, stubWolf.id, stubVillager6.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const game = structuredClone(stubGameUpdateFailure);
		game.stage = 'day';
		game.activities = [{ wolf: stubVillager7.id, healer: stubVillager7.id }];
		mockDynamoResponse(game);
		stubParameters(stubGameIdUpdateError, true, stubWolf.id, stubVillager6.id);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);

		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
