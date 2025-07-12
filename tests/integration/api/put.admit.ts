import { describe, expect, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import {
	PlayerAlreadyAdmittedErrorResponse,
	PlayerIdNotFoundErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';

import {
	stubMayor,
	stubVillager1,
	stubGamePending,
	stubVillager2,
	stubGameInactive,
} from '@tests/common/stubs';
import { runCommonApiFailureTests } from '@tests/integration/setup/api';

describe('PUT /api/games/:code/admit', async () => {
	const callback = async (
		code: Undefinable<Nullable<string>>,
		action: boolean
	): Promise<Response> => {
		return await fetchAdmit(code, stubMayor.id, stubVillager1.id, true, action);
	};

	const fetchAdmit = async (
		code?: string | null,
		auth?: string | null,
		player?: string,
		admit?: boolean,
		action?: boolean
	) => {
		let url = `/api/games/${code}/`;
		if (action !== false) {
			url += 'admit';
		}
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

	runCommonApiFailureTests('admit', callback);
});
