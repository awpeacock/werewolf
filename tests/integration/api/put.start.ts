import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { Role } from '@/types/enums';
import { NotEnoughPlayersErrorResponse, UnauthorisedErrorResponse } from '@/types/constants';

import { stubMayor, stubVillager1, stubGameInactive, stubGameReady } from '@tests/common/stubs';
import { runCommonApiFailureTests } from '@tests/integration/setup/api';

describe('PUT /api/games/:code/start', async () => {
	const callback = async (
		code: Undefinable<Nullable<string>>,
		action: boolean
	): Promise<Response> => {
		return await fetchStart(code, stubMayor.id, action);
	};

	const fetchStart = async (code?: string | null, auth?: string | null, action?: boolean) => {
		let url = `/api/games/${code}/`;
		if (action !== false) {
			url += 'start';
		}
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

	runCommonApiFailureTests('start', callback);
});
