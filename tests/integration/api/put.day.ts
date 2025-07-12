import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import {
	AttemptToVoteOutsideDayErrorResponse,
	CannotVoteForDeadPlayerErrorResponse,
	CannotVoteForEvictedPlayerErrorResponse,
	CannotVoteTwiceErrorResponse,
	CannotVoteUntilActivityCompleteErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';

import {
	stubWolf,
	stubVillager6,
	stubVillager8,
	stubGameIncompleteActivity,
	stubVillager7,
	stubGameIncorrectVotes1,
	stubVotesIncorrect1,
	stubGameTie,
	stubVotesTie,
	stubGameCorrectVotes,
	stubGameWolfWin,
	stubMayor,
	stubHealer,
	stubVotesWolf2,
	stubActivitiesWolfWin,
	stubVotesCorrect,
	stubGameActive,
	stubGameHealerOnly,
	stubGameWolfOnly,
} from '@tests/common/stubs';
import { runCommonApiFailureTests } from '@tests/integration/setup/api';

describe('PUT /api/games/:code/day', async () => {
	const callback = async (
		code: Undefinable<Nullable<string>>,
		action: boolean
	): Promise<Response> => {
		return await fetchDay(code, stubWolf.id, stubVillager6.id, action);
	};

	const fetchDay = async (
		code: string | null | undefined,
		player: string,
		vote: string,
		action?: boolean
	) => {
		let url = `/api/games/${code}/`;
		if (action !== false) {
			url += 'day';
		}
		const json = JSON.stringify({ player: player, vote: vote });
		const response = await fetch(url, {
			method: 'PUT',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid vote submission from an alive player', async () => {
		const response = await fetchDay(
			stubGameIncompleteActivity.id,
			stubVillager7.id,
			stubVillager8.id
		);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		const activity: Activity = { wolf: stubVillager6.id, healer: stubVillager7.id, votes: {} };
		activity.votes![stubVillager7.id] = stubVillager8.id;
		expect(game).toHaveActivity(activity);
	});

	it('should move the game on to eviction if all votes are in, and the game is not over', async () => {
		const response = await fetchDay(stubGameIncorrectVotes1.id, stubVillager6.id, stubWolf.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		const votes: Votes = structuredClone(stubVotesIncorrect1);
		votes[stubVillager6.id] = stubWolf.id;
		const activity: Activity = {
			wolf: stubVillager8.id,
			healer: stubVillager7.id,
			votes: votes,
			evicted: stubVillager6.id,
		};
		expect(game).toHaveActivity(activity);
	});

	it('should mark nobody as evicted if the result of a vote is a tie', async () => {
		const response = await fetchDay(stubGameTie.id, stubVillager6.id, stubWolf.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		const votes: Votes = structuredClone(stubVotesTie);
		votes[stubVillager6.id] = stubWolf.id;
		const activity: Activity = {
			wolf: stubVillager7.id,
			healer: stubVillager7.id,
			votes: votes,
			evicted: null,
		};
		expect(game).toHaveActivity(activity);
	});

	it('should finish the game if all votes are in, and the wolf has been found', async () => {
		const response = await fetchDay(stubGameCorrectVotes.id, stubVillager6.id, stubWolf.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		const votes: Votes = structuredClone(stubVotesCorrect);
		votes[stubVillager6.id] = stubWolf.id;
		const activity: Activity = {
			wolf: stubVillager7.id,
			healer: stubVillager8.id,
			votes: votes,
			evicted: stubWolf.id,
		};
		expect(game).toHaveActivity(activity);
		expect(game.active).toBeFalsy();
		expect(game.winner).toEqual('village');
	});

	it('should finish the game if all votes are in, and the wolf has won', async () => {
		const response = await fetchDay(stubGameWolfWin.id, stubMayor.id, stubHealer.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		const votes: Votes = structuredClone(stubVotesWolf2);
		votes[stubMayor.id] = stubHealer.id;
		const activity: Activity = {
			wolf: stubVillager8.id,
			healer: stubWolf.id,
			votes: votes,
			evicted: stubHealer.id,
		};
		expect(game).toHaveActivity(stubActivitiesWolfWin[0]);
		expect(game).toHaveActivity(stubActivitiesWolfWin[1]);
		expect(game).toHaveActivity(activity);
		expect(game.active).toBeFalsy();
		expect(game.winner).toEqual('wolf');
	});

	it('should not allow a dead player to vote', async () => {
		const response = await fetchDay(
			stubGameIncorrectVotes1.id,
			stubVillager8.id,
			stubVillager7.id
		);
		expect(response.status).toBe(403);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnauthorisedErrorResponse);
	});

	it('should not allow an evicted player to vote', async () => {
		const response = await fetchDay(stubGameWolfWin.id, stubVillager6.id, stubWolf.id);
		expect(response.status).toBe(403);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnauthorisedErrorResponse);
	});

	it('should not allow a player to vote for a dead villager', async () => {
		const response = await fetchDay(
			stubGameIncorrectVotes1.id,
			stubVillager6.id,
			stubVillager8.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteForDeadPlayerErrorResponse);
	});

	it('should not allow a player to vote for an evicted villager', async () => {
		const response = await fetchDay(stubGameWolfWin.id, stubWolf.id, stubVillager6.id);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteForEvictedPlayerErrorResponse);
	});

	it('should not allow a player to vote outside day time', async () => {
		const response = await fetchDay(stubGameActive.id, stubVillager6.id, stubVillager7.id);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(AttemptToVoteOutsideDayErrorResponse);
	});

	it('should not allow a player to vote if the wolf choice has not been made', async () => {
		const response = await fetchDay(
			stubGameWolfOnly.id.substring(0, 3) + 'D',
			stubVillager6.id,
			stubVillager7.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteUntilActivityCompleteErrorResponse);
	});

	it('should not allow a player to vote if the healer choice has not been made', async () => {
		const response = await fetchDay(
			stubGameHealerOnly.id.substring(0, 3) + 'D',
			stubVillager6.id,
			stubVillager7.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteUntilActivityCompleteErrorResponse);
	});

	it('should not allow a player to vote twice', async () => {
		const response = await fetchDay(
			stubGameIncorrectVotes1.id,
			stubVillager7.id,
			stubVillager6.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteTwiceErrorResponse);
	});

	runCommonApiFailureTests('day', callback);
});
