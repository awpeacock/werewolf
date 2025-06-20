import { describe, expect, expectTypeOf, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NicknameAlreadyExistsErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubMayor,
	stubVillager1,
	stubGamePending,
	stubVillager2,
	stubGameNew,
	stubGameInactive,
	stubGameIdNotFound,
	stubGameIdUpdateError,
} from '@tests/common/stubs';

describe('PUT /api/games/:code/join', async () => {
	const fetchJoin = async (code?: string | null, name?: string | null, invite?: string) => {
		const url = `/api/games/${code}/join` + (invite ? `?invite=${invite}` : '');
		const json = JSON.stringify({ villager: name });
		const response = await fetch(url, {
			method: 'PUT',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid request without an invite, update and return the revised game (where no pending players already exist)', async () => {
		const response = await fetchJoin(stubGameNew.id, stubVillager1.nickname);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1]);
	});

	it('should take a valid request without an invite, update and return the revised game (where pending players already exist)', async () => {
		const response = await fetchJoin(stubGamePending.id, stubVillager2.nickname);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expectTypeOf(game).toEqualTypeOf<Game>();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1, stubVillager2]);
	});

	it('should take a valid request without an invite, but update nothing if the player is already there and return a validation error', async () => {
		const response = await fetchJoin(stubGamePending.id, stubVillager1.nickname);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(NicknameAlreadyExistsErrorResponse);
	});

	it('should take a valid request with an invite, update and return the revised game (where no admitted players already exist)', async () => {
		const response = await fetchJoin(stubGameNew.id, stubVillager1.nickname, stubMayor.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor, stubVillager1]);
	});

	it('should take a valid request with an invite, update and return the revised game (where admitted players already exist)', async () => {
		const response = await fetchJoin(stubGameInactive.id, stubVillager2.nickname, stubMayor.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor, stubVillager1, stubVillager2]);
	});

	it('should take a valid request with an invite, but not update if the player is already there and return a validation message', async () => {
		const response = await fetchJoin(stubGameInactive.id, stubVillager1.nickname, stubMayor.id);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(NicknameAlreadyExistsErrorResponse);
	});

	it('should take a valid request with an invalid invite, update and return the revised game', async () => {
		const response = await fetchJoin(stubGameNew.id, stubVillager1.nickname, stubVillager1.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expectTypeOf(game).toEqualTypeOf<Game>();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1]);
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
			const response = await fetchJoin(codes[c], 'Nickname');
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[c]);
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
			const response = await fetchJoin(stubGameNew.id, names[n]);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[n]);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetchJoin(stubGameIdNotFound, stubVillager1.nickname);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await fetch(`/api/games/${stubGameNew.id}`, {
			method: 'PUT',
			body: JSON.stringify({ villager: stubVillager1.nickname }),
			headers: {
				'Content-Type': 'application/json',
			},
		});
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(InvalidActionErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetchJoin(stubGameIdUpdateError, stubVillager2.nickname);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
