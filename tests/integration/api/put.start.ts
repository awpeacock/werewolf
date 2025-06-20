import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { Role } from '@/types/enums';
import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NotEnoughPlayersErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubMayor,
	stubVillager1,
	stubGameNew,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubGameInactive,
	stubGameReady,
} from '@tests/common/stubs';

describe('PUT /api/games/:code/start', async () => {
	const fetchStart = async (code?: string | null, auth?: string | null) => {
		const url = `/api/games/${code}/start`;
		const json = JSON.stringify({ auth: auth });
		const response = await fetch(url, {
			method: 'PUT',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid request to start a game', async () => {
		const response = await fetchStart(stubGameReady.id, stubMayor.id);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers(stubGameReady.players);
		let wolf = 0,
			healer = 0;
		for (const player of game.players) {
			if (player.roles.includes(Role.WOLF)) {
				wolf++;
			}
			if (player.roles.includes(Role.HEALER)) {
				healer++;
			}
		}
		expect(wolf).toBe(1);
		expect(healer).toBe(1);
	});

	it('should reject any request without the correct mayor', async () => {
		const response = await fetchStart(stubGameReady.id, stubVillager1.id);
		expect(response.status).toBe(403);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnauthorisedErrorResponse);
	});

	it('should reject any request where the game does not have enough players', async () => {
		const response = await fetchStart(stubGameInactive.id, stubMayor.id);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(NotEnoughPlayersErrorResponse);
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
			const response = await fetchStart(codes[c], stubMayor.id);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[c]);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetchStart(stubGameIdNotFound, stubMayor.id);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await fetch(`/api/games/${stubGameNew.id}`, {
			method: 'PUT',
			body: JSON.stringify({ auth: stubMayor.id }),
			headers: {
				'Content-Type': 'application/json',
			},
		});
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(InvalidActionErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetchStart(stubGameIdUpdateError, stubMayor.id);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
