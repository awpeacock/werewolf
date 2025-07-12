import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AttemptToVoteOutsideDayErrorResponse,
	CannotVoteForDeadPlayerErrorResponse,
	CannotVoteForEvictedPlayerErrorResponse,
	CannotVoteTwiceErrorResponse,
	CannotVoteUntilActivityCompleteErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';

import {
	stubGameActive,
	stubGameCorrectVotes,
	stubGameIncorrectVotes1,
	stubGameTie,
	stubGameWolfWin,
	stubHealer,
	stubMayor,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/common/stubs';
import { mockResponseStatus, runCommonApiFailureTests } from '@tests/unit/setup/api';
import { mockDynamoResponse, setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Day API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const callback = (code: Undefinable<Nullable<string>>, action: boolean) => {
		stubParameters(code, action, stubWolf.id, stubVillager6.id);
	};

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
		const votes: Votes = {};
		votes[stubVillager6.id] = stubVillager8.id;

		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager8.id);

		const response = (await handler.default(event)) as Game;
		game.activities!.at(-1)!.votes = votes;
		expect(response).toEqualGame(game);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		expect(response.activities?.at(-1)).toEqual(
			expect.objectContaining({
				wolf: stubVillager7.id,
				healer: stubVillager8.id,
				votes: votes,
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
		game.stage = 'night';
		const activity = game.activities!.at(-1)!;
		activity.votes![stubVillager6.id] = stubWolf.id;
		activity.evicted = stubVillager6.id;
		expect(mockWSSend).toBeSocketCall('eviction', game);
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
		game.active = false;
		const activity = game.activities!.at(-1)!;
		activity.votes![stubVillager6.id] = stubWolf.id;
		activity.evicted = stubWolf.id;
		expect(mockWSSend).toBeSocketCall('game-over', game);
	});

	it('should finish the game if all votes are in, and the wolf has won', async () => {
		const game = structuredClone(stubGameWolfWin);
		mockDynamoResponse(game);
		stubParameters(stubGameWolfWin.id, true, stubMayor.id, stubHealer.id);

		await handler.default(event);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		// Test that the web socket notification is published
		game.active = false;
		const activity = game.activities!.at(-1)!;
		activity.votes![stubMayor.id] = stubHealer.id;
		activity.evicted = stubHealer.id;
		expect(mockWSSend).toBeSocketCall('game-over', game);
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
		expect(response).toEqual(CannotVoteForDeadPlayerErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote for an evicted villager', async () => {
		const game = structuredClone(stubGameWolfWin);
		mockDynamoResponse(game);
		stubParameters(stubGameWolfWin.id, true, stubWolf.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(CannotVoteForEvictedPlayerErrorResponse);
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
		expect(response).toEqual(CannotVoteUntilActivityCompleteErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote if the healer choice has not been made', async () => {
		const game = structuredClone(stubGameActive);
		game.stage = 'day';
		game.activities?.push({ wolf: stubVillager7.id });
		mockDynamoResponse(game);
		stubParameters(stubGameActive.id, true, stubVillager6.id, stubVillager7.id);

		const response = await handler.default(event);
		expect(response).toEqual(CannotVoteUntilActivityCompleteErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should not allow a player to vote twice', async () => {
		const game = structuredClone(stubGameIncorrectVotes1);
		mockDynamoResponse(game);
		stubParameters(stubGameIncorrectVotes1.id, true, stubVillager7.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toEqual(CannotVoteTwiceErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	runCommonApiFailureTests('day', handler, event, callback);
});
