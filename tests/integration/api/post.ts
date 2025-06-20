import { describe, it, expect, expectTypeOf } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { Role } from '@/types/enums';
import { NoUniqueIdErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import { stubMayor, stubNameDuplicate, stubNameError } from '@tests/common/stubs';

describe('POST /api/games', () => {
	const fetchPost = async (name?: string | null) => {
		const url = `/api/games`;
		const json = JSON.stringify({ mayor: name });
		const response = await fetch(url, {
			method: 'POST',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid request, store the game and return the ID', async () => {
		const response = await fetchPost(stubMayor.nickname);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
	});

	it('should successfully return a Game object if it succeeds before the retry limit is exceeded', async () => {
		const response = await fetchPost(stubNameDuplicate + ' 2');
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expectTypeOf(game).toEqualTypeOf<Game>();
		const mayor: Player = { id: '', nickname: stubNameDuplicate + ' 2', roles: [Role.MAYOR] };
		expect(game).toHavePlayers([mayor]);
	});

	it('should return an ErrorResponse (with validation messages) if the values are invalid', async () => {
		const names = ['Jim', 'Jim James Jimmy Jameson', 'Jim-Bob'];
		const errors = ['nickname-min', 'nickname-max', 'nickname-invalid'];
		for (let n = 0; n < names.length; n++) {
			const response = await fetchPost(names[n]);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[n]);
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetchPost(stubNameError);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if it hits the max retry limit', async () => {
		const response = await fetchPost(stubNameDuplicate + ' 5');
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(NoUniqueIdErrorResponse);
	});
});
