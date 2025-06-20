import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

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

import {
	stubGameNew,
	stubGameIdNotFound,
	stubWolf,
	stubVillager6,
	stubVillager8,
	stubGameIncompleteActivity,
	stubVillager7,
	stubGameIdUpdateErrorDay,
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

describe('PUT /api/games/:code/day', async () => {
	const fetchDay = async (code: string | null | undefined, player: string, vote: string) => {
		const url = `/api/games/${code}/day`;
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
		expect(error).toEqual(CannotVoteForDeadPlayerErrorReponse);
	});

	it('should not allow a player to vote for an evicted villager', async () => {
		const response = await fetchDay(stubGameWolfWin.id, stubWolf.id, stubVillager6.id);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteForEvictedPlayerErrorReponse);
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
		expect(error).toEqual(CannotVoteUntilActivityCompleteErrorReponse);
	});

	it('should not allow a player to vote if the healer choice has not been made', async () => {
		const response = await fetchDay(
			stubGameHealerOnly.id.substring(0, 3) + 'D',
			stubVillager6.id,
			stubVillager7.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteUntilActivityCompleteErrorReponse);
	});

	it('should not allow a player to vote twice', async () => {
		const response = await fetchDay(
			stubGameIncorrectVotes1.id,
			stubVillager7.id,
			stubVillager6.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(CannotVoteTwiceErrorReponse);
	});

	it('should return an ErrorResponse (with validation messages) if the code is invalid', async () => {
		const codes = [
			null,
			undefined,
			'',
			'ABC',
			'ABCDE',
			'abcd',
			'AB-C',
			'A BC',
			'AB<1',
			"AB'1",
			'AB,1',
			'AB;1',
		];
		const errors = [
			'code-invalid',
			'code-invalid',
			'code-required',
			'code-no-spaces',
			'code-max',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
		];
		for (let c = 0; c < codes.length; c++) {
			const response = await fetchDay(codes[c], stubWolf.id, stubVillager6.id);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[c]);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetchDay(stubGameIdNotFound, stubWolf.id, stubVillager6.id);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await fetch(`/api/games/${stubGameNew.id}`, {
			method: 'PUT',
			body: JSON.stringify({
				player: stubWolf.id,
				vote: stubVillager6.id,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		});
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(InvalidActionErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetchDay(stubGameIdUpdateErrorDay, stubWolf.id, stubVillager6.id);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
