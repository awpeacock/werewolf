import { describe, expect, expectTypeOf, it } from 'vitest';
import { fetch } from '@nuxt/test-utils/e2e';

import { NicknameAlreadyExistsErrorResponse } from '@/types/constants';

import {
	stubMayor,
	stubVillager1,
	stubGamePending,
	stubVillager2,
	stubGameNew,
	stubGameInactive,
	stubInvalidNicknames,
} from '@tests/common/stubs';
import { runCommonApiFailureTests } from '@tests/integration/setup/api';

describe('PUT /api/games/:code/join', async () => {
	const callback = async (
		code: Undefinable<Nullable<string>>,
		action: boolean
	): Promise<Response> => {
		return await fetchJoin(code, 'Nickname', undefined, action);
	};

	const fetchJoin = async (
		code?: string | null,
		name?: string | null,
		invite?: string,
		action?: boolean
	) => {
		let url = `/api/games/${code}/`;
		if (action !== false) {
			url += `join` + (invite ? `?invite=${invite}` : '');
		}
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

	it('should correctly trim the end of a nickname', async () => {
		const response = await fetchJoin(stubGameNew.id, stubVillager1.nickname + ' ');
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1]);
	});

	it('should correctly trim the start of a nickname', async () => {
		const response = await fetchJoin(stubGameNew.id, ' ' + stubVillager1.nickname);
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1]);
	});

	it('should correctly trim both ends of a nickname', async () => {
		const response = await fetchJoin(stubGameNew.id, ' ' + stubVillager1.nickname + ' ');
		expect(response.status).toBe(200);
		const game: Game = await response.json();
		expect(game).toHavePlayers([stubMayor]);
		expect(game).toHavePending([stubVillager1]);
	});

	it('should return an ErrorResponse (with validation messages) if the nickname is invalid', async () => {
		for (const name of stubInvalidNicknames) {
			const response = await fetchJoin(stubGameNew.id, name.nickname, undefined, true);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			expect(error).toHaveError(name.error);
		}
	});

	runCommonApiFailureTests('join', callback);
});
