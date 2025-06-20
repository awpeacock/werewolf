import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	PlayerAlreadyAdmittedErrorResponse,
	PlayerIdNotFoundErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubMayor,
	stubVillager1,
	stubGamePending,
	stubGameNew,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubVillager2,
	stubGameInactive,
} from '@tests/common/stubs';

describe('PUT /api/games/:code/admit', async () => {
	const fetchAdmit = async (
		code?: string | null,
		auth?: string | null,
		player?: string,
		admit?: boolean
	) => {
		const url = `/api/games/${code}/admit`;
		const json = JSON.stringify({ auth: auth, villager: player, admit: admit });
		const response = await fetch(url, {
			method: 'PUT',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid request to admit a player', async () => {
		const response = await fetchAdmit(stubGamePending.id, stubMayor.id, stubVillager1.id, true);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor, stubVillager1]);
		expect(game).toHavePending([]);
	});

	it('should take a valid request to deny a player', async () => {
		const response = await fetchAdmit(
			stubGamePending.id,
			stubMayor.id,
			stubVillager1.id,
			false
		);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([]);
	});

	it('should reject a request to admit a player not in pending', async () => {
		const response = await fetchAdmit(stubGamePending.id, stubMayor.id, stubVillager2.id, true);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(PlayerIdNotFoundErrorResponse);
	});

	it('should not throw an error admitting a player already admitted', async () => {
		const response = await fetchAdmit(
			stubGameInactive.id,
			stubMayor.id,
			stubVillager1.id,
			true
		);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor, stubVillager1]);
	});

	it('should reject a request to deny a player already admitted', async () => {
		const response = await fetchAdmit(
			stubGameInactive.id,
			stubMayor.id,
			stubVillager1.id,
			false
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(PlayerAlreadyAdmittedErrorResponse);
	});

	it('should reject any request without the correct mayor', async () => {
		const response = await fetchAdmit(
			stubGameInactive.id,
			stubVillager1.id,
			stubVillager1.id,
			true
		);
		expect(response.status).toBe(403);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnauthorisedErrorResponse);
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
			const response = await fetchAdmit(codes[c], stubMayor.id, stubVillager1.id, true);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[c]);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetchAdmit(stubGameIdNotFound, stubMayor.id, stubVillager1.id, true);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await fetch(`/api/games/${stubGameNew.id}`, {
			method: 'PUT',
			body: JSON.stringify({ auth: stubMayor.id, villager: stubVillager1.id, admit: true }),
			headers: {
				'Content-Type': 'application/json',
			},
		});
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(InvalidActionErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetchAdmit(
			stubGameIdUpdateError,
			stubMayor.id,
			stubVillager1.id,
			true
		);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
