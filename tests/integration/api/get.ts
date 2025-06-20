import { describe, it, expect } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import {
	GameIdNotFoundErrorResponse,
	InvalidGameIdErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import { stubGameActive, stubGameIdGetError, stubGameIdNotFound } from '@tests/common/stubs';

describe('GET /api/games/:code', () => {
	it('should take a request with an existing ID, and return the game', async () => {
		const response = await fetch(`/api/games/${stubGameActive.id}/`);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toMatchObject({
			id: stubGameActive.id,
			active: stubGameActive.active,
			players: stubGameActive.players,
		});
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetch(`/api/games/${stubGameIdNotFound}/`);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if the code is not valid', async () => {
		const codes = [undefined, 'AB1', 'AB1CD', 'AB-1', 'AB<1', "AB'1", 'AB,1', 'AB;1'];
		for (let c = 0; c < codes.length; c++) {
			const response = await fetch(`/api/games/${codes[c]}/`);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toEqual(InvalidGameIdErrorResponse);
		}
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const response = await fetch(`/api/games/${stubGameIdGetError}/`);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
