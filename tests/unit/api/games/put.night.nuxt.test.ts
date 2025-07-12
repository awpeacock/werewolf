import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AttemptToChooseOutsideNightErrorResponse,
	CannotChooseDeadPlayerErrorResponse,
	CannotChooseEvictedPlayerErrorResponse,
	UnauthorisedErrorResponse,
} from '@/types/constants';
import { Role } from '@/types/enums';

import {
	stubGameActive,
	stubVillager6,
	stubWolf,
	stubHealer,
	stubVillager7,
	stubMayor,
	stubGameCorrectVotes,
	stubGameDeadHealer,
	stubGameIncorrectVotes1,
	stubActivitiesComplete,
} from '@tests/common/stubs';
import { mockResponseStatus, runCommonApiFailureTests } from '@tests/unit/setup/api';
import { mockDynamoResponse, setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Night API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

	const callback = (code: Undefinable<Nullable<string>>, action: boolean) => {
		stubParameters(code, action, Role.WOLF, stubWolf.id, stubVillager6.id);
	};

	const setupGame = (game: Game, evicted?: Player): Game => {
		const clone = structuredClone(game);
		clone.activities!.at(-1)!.votes![stubVillager6.id] = stubHealer.id;
		if (evicted) {
			clone.activities!.at(-1)!.evicted = evicted.id;
		}
		clone.stage = 'night';
		mockDynamoResponse(clone);
		return clone;
	};

	const expectError = async (code: number, error: APIErrorResponse): Promise<void> => {
		const response = await handler.default(event);
		expect(response).toMatchObject(error);
		expect(mockResponseStatus).toBeCalledWith(event, code);
	};

	const stubParameters = (
		id: Nullable<Undefinable<string>>,
		action: boolean,
		role: Role,
		player: string,
		target: string
	) => {
		vi.stubGlobal(
			'getRouterParam',
			vi.fn((_event, name) => {
				if (name === 'id') return id;
				if (name === 'action') return action ? 'night' : undefined;
				return undefined;
			})
		);
		const body: ActivityBody = { role: role, player: player, target: target };
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));
	};

	beforeAll(() => {
		setupRuntimeConfigForApis();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request for the choice of a wolf', async () => {
		const wolf = [stubWolf.id, stubWolf.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const w of wolf) {
			for (const v of victim) {
				mockDynamoResponse(stubGameActive);
				stubParameters(stubGameActive.id, true, Role.WOLF, w, v);

				const response = (await handler.default(event)) as Game;
				expect(response).toEqualGame(stubGameActive);
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				expect(response.activities?.at(-1)).toEqual(
					expect.objectContaining({
						wolf: stubVillager6.id,
					})
				);
			}
		}
	});

	it('should take a valid request for the choice of a healer', async () => {
		const healer = [stubHealer.id, stubHealer.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const h of healer) {
			for (const v of victim) {
				mockDynamoResponse(stubGameActive);
				stubParameters(stubGameActive.id, true, Role.HEALER, h, v);

				const response = (await handler.default(event)) as Game;
				expect(response).toEqualGame(stubGameActive);
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				expect(response.activities?.at(-1)).toEqual(
					expect.objectContaining({
						healer: stubVillager6.id,
					})
				);
			}
		}
	});

	it('should take a valid request from a wolf that completes the night, and send out an event', async () => {
		const game = structuredClone(stubGameActive);
		game.activities?.push({ healer: stubVillager6.id });
		mockDynamoResponse(game);

		stubParameters(stubGameActive.id, true, Role.WOLF, stubWolf.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		game.stage = 'day';
		game.activities!.at(-1)!.wolf = stubVillager6.id;
		expect(response).toEqualGame(game);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		const activity: Activity = {
			wolf: stubVillager6.id,
			healer: stubVillager6.id,
		};
		expect(response.activities?.at(-1)).toEqual(activity);

		// Test that the web socket notification is published
		expect(mockWSSend).toBeSocketCall('morning', game);
	});

	it('should take a valid request from a healer that completes the night, and send out an event', async () => {
		const game = structuredClone(stubGameActive);
		game.activities?.push({ wolf: stubVillager7.id });
		mockDynamoResponse(game);

		stubParameters(stubGameActive.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		game.stage = 'day';
		game.activities!.at(-1)!.healer = stubVillager6.id;
		expect(response).toEqualGame(game);
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		const activity: Activity = {
			wolf: stubVillager7.id,
			healer: stubVillager6.id,
		};
		expect(response.activities?.at(-1)).toEqual(activity);

		// Test that the web socket notification is published
		expect(mockWSSend).toBeSocketCall('morning', game);
	});

	it('should take a valid request for the choice of a wolf, when the healer is dead, completing the night', async () => {
		const wolf = [stubWolf.id, stubWolf.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const w of wolf) {
			for (const v of victim) {
				const game = structuredClone(stubGameDeadHealer);
				game.activities!.at(-1)!.votes![stubVillager6.id] = stubVillager7.id;
				mockDynamoResponse(game);

				stubParameters(stubGameDeadHealer.id, true, Role.WOLF, w, v);

				const response = (await handler.default(event)) as Game;
				game.stage = 'day';
				game.activities!.push({ wolf: stubVillager6.id, healer: '-' });
				expect(response).toEqualGame(game);
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				const activity: Activity = {
					wolf: stubVillager6.id,
					healer: '-',
					votes: {},
				};
				expect(response.activities?.at(-1)).toEqual(activity);

				// Test that the web socket notification is published
				expect(mockWSSend).toBeSocketCall('morning', game);
			}
		}
	});

	it('should reject a request for the choice of a wolf for a dead player', async () => {
		const game = setupGame(stubGameCorrectVotes);
		stubParameters(game.id, true, Role.WOLF, stubWolf.id, stubVillager7.id);
		await expectError(400, CannotChooseDeadPlayerErrorResponse);
	});

	it('should reject a request for the choice of a healer for a dead player', async () => {
		const game = setupGame(stubGameCorrectVotes);
		stubParameters(game.id, true, Role.HEALER, stubHealer.id, stubVillager7.id);
		await expectError(400, CannotChooseDeadPlayerErrorResponse);
	});

	it('should reject a request for the choice of a wolf for an evicted player', async () => {
		const game = setupGame(stubGameIncorrectVotes1, stubVillager6);
		stubParameters(game.id, true, Role.WOLF, stubWolf.id, stubVillager6.id);
		await expectError(400, CannotChooseEvictedPlayerErrorResponse);
	});

	it('should reject a request for the choice of a healer for an evicted player', async () => {
		const game = setupGame(stubGameIncorrectVotes1, stubVillager6);
		stubParameters(game.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);
		await expectError(400, CannotChooseEvictedPlayerErrorResponse);
	});

	it('should reject a request for the choice of a healer if dead', async () => {
		const game = setupGame(stubGameDeadHealer);
		stubParameters(game.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);
		await expectError(403, UnauthorisedErrorResponse);
	});

	it('should reject a request for the choice of a healer if evicted', async () => {
		const game = structuredClone(stubGameActive);
		game.activities = [stubActivitiesComplete[0]];
		game.stage = 'night';
		mockDynamoResponse(game);
		stubParameters(game.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);
		await expectError(403, UnauthorisedErrorResponse);
	});

	it('should reject a request for the choice of a wolf outside night time', async () => {
		mockDynamoResponse(stubGameCorrectVotes);
		stubParameters(stubGameCorrectVotes.id, true, Role.WOLF, stubWolf.id, stubVillager6.id);

		const response = await handler.default(event);
		expect(response).toMatchObject(AttemptToChooseOutsideNightErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should reject a request for the choice of a healer outside night time', async () => {
		mockDynamoResponse(stubGameCorrectVotes);
		stubParameters(stubGameCorrectVotes.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);

		const response = await handler.default(event);
		expect(response).toMatchObject(AttemptToChooseOutsideNightErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should reject an invalid request for the choice of a wolf by a different player', async () => {
		mockDynamoResponse(stubGameActive);
		stubParameters(stubGameActive.id, true, Role.WOLF, stubHealer.id, stubVillager6.id);

		const response = await handler.default(event);
		expect(response).toMatchObject(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	it('should reject an invalid request for the choice of a healer by a different player', async () => {
		mockDynamoResponse(stubGameActive);
		stubParameters(stubGameActive.id, true, Role.HEALER, stubMayor.id, stubVillager6.id);

		const response = await handler.default(event);
		expect(response).toMatchObject(UnauthorisedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 403);
	});

	runCommonApiFailureTests('night', handler, event, callback);
});
