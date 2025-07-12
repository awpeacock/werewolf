import { describe, it, expect } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { Role } from '@/types/enums';
import {
	AttemptToChooseOutsideNightErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';

import {
	stubWolf,
	stubVillager6,
	stubGameActive,
	stubHealer,
	stubGameHealerOnly,
	stubGameWolfOnly,
	stubGameCorrectVotes,
	stubMayor,
} from '@tests/common/stubs';
import { runCommonApiFailureTests } from '@tests/integration/setup/api';

describe('PUT /api/games/:code/night', async () => {
	const callback = async (
		code: Undefinable<Nullable<string>>,
		action: boolean
	): Promise<Response> => {
		return await fetchNight(code, Role.WOLF, stubWolf.id, stubVillager6.id, action);
	};

	const fetchNight = async (
		code: string | null | undefined,
		role: Role.WOLF | Role.HEALER,
		player: string,
		target: string,
		action?: boolean
	) => {
		let url = `/api/games/${code}/`;
		if (action !== false) {
			url += 'night';
		}
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

	runCommonApiFailureTests('night', callback);
});
