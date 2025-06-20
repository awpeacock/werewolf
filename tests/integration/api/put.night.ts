import { describe, it, expect } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { Role } from '@/types/enums';
import {
	AttemptToChooseOutsideNightErrorResponse,
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubWolf,
	stubVillager6,
	stubGameIdUpdateErrorNight,
	stubGameNew,
	stubGameIdNotFound,
	stubGameActive,
	stubHealer,
	stubGameHealerOnly,
	stubGameWolfOnly,
	stubGameCorrectVotes,
	stubMayor,
} from '@tests/common/stubs';

describe('PUT /api/games/:code/night', async () => {
	const fetchNight = async (
		code: string | null | undefined,
		role: Role.WOLF | Role.HEALER,
		player: string,
		target: string
	) => {
		const url = `/api/games/${code}/night`;
		const json = JSON.stringify({ role: role, player: player, target: target });
		const response = await fetch(url, {
			method: 'PUT',
			body: json,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response;
	};

	it('should take a valid request for the choice of a wolf', async () => {
		const wolf = [stubWolf.id, stubWolf.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const w of wolf) {
			for (const v of victim) {
				const response = await fetchNight(stubGameActive.id, Role.WOLF, w, v);
				expect(response.status).toBe(200);
				const game: Game = await response.json();
				expect(game).toHaveActivity({ wolf: stubVillager6.id, healer: null, votes: {} });
			}
		}
	});

	it('should take a valid request for the choice of a healer', async () => {
		const healer = [stubHealer.id, stubHealer.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const h of healer) {
			for (const v of victim) {
				const response = await fetchNight(stubGameActive.id, Role.HEALER, h, v);
				expect(response.status).toBe(200);
				const game: Game = await response.json();
				expect(game).toHaveActivity({ healer: stubVillager6.id, wolf: null, votes: {} });
			}
		}
	});

	it('should take a valid request from a wolf that completes the night, and send out an event', async () => {
		const response = await fetchNight(
			stubGameHealerOnly.id,
			Role.WOLF,
			stubWolf.id,
			stubVillager6.id
		);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHaveActivity({
			wolf: stubVillager6.id,
			healer: stubVillager6.id,
			votes: {},
		});
	});

	it('should take a valid request from a healer that completes the night, and send out an event', async () => {
		const response = await fetchNight(
			stubGameWolfOnly.id,
			Role.HEALER,
			stubHealer.id,
			stubVillager6.id
		);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHaveActivity({
			wolf: stubVillager6.id,
			healer: stubVillager6.id,
			votes: {},
		});
	});

	it('should reject a request for the choice of a wolf outside night time', async () => {
		const response = await fetchNight(
			stubGameCorrectVotes.id,
			Role.WOLF,
			stubWolf.id,
			stubVillager6.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(AttemptToChooseOutsideNightErrorResponse);
	});

	it('should reject a request for the choice of a healer outside night time', async () => {
		const response = await fetchNight(
			stubGameCorrectVotes.id,
			Role.HEALER,
			stubHealer.id,
			stubVillager6.id
		);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(AttemptToChooseOutsideNightErrorResponse);
	});

	it('should reject an invalid request for the choice of a wolf by a different player', async () => {
		const response = await fetchNight(
			stubGameActive.id,
			Role.WOLF,
			stubHealer.id,
			stubVillager6.id
		);
		expect(response.status).toBe(403);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnauthorisedErrorResponse);
	});

	it('should reject an invalid request for the choice of a healer by a different player', async () => {
		const response = await fetchNight(
			stubGameActive.id,
			Role.HEALER,
			stubMayor.id,
			stubVillager6.id
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
			const response = await fetchNight(codes[c], Role.WOLF, stubWolf.id, stubVillager6.id);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(errors[c]);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await fetchNight(
			stubGameIdNotFound,
			Role.WOLF,
			stubWolf.id,
			stubVillager6.id
		);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await fetch(`/api/games/${stubGameNew.id}`, {
			method: 'PUT',
			body: JSON.stringify({
				role: Role.WOLF,
				player: stubWolf.id,
				target: stubVillager6.id,
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
		const response = await fetchNight(
			stubGameIdUpdateErrorNight,
			Role.WOLF,
			stubWolf.id,
			stubVillager6.id
		);
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
});
