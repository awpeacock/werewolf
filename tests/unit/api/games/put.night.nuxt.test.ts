import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AttemptToChooseOutsideNightErrorResponse,
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { Role } from '@/types/enums';

import {
	stubErrorCode,
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubGameActive,
	stubVillager6,
	stubWolf,
	stubHealer,
	stubVillager7,
	stubMayor,
	stubGameUpdateFailure,
	stubGameCorrectVotes,
	stubGameDeadHealer,
} from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';
import { mockDynamoResponse, setupDynamoWrapperForEvent } from '@tests/unit/setup/dynamodb';
import { setupRuntimeConfigForApis } from '@tests/unit/setup/runtime';
import { mockWSSend } from '@tests/unit/setup/websocket';

describe('Night API (PUT)', async () => {
	const handler = await import('@/server/api/games/[id]/[action].put');
	// This is to catch the DynamoDB initialisation message
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const event = await setupDynamoWrapperForEvent();
	expect(spyLog).toBeCalled();

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
				expect(response).toMatchObject({
					id: stubGameActive.id,
					active: true,
					stage: 'night',
					players: expect.arrayContaining(
						stubGameActive.players.map((p) =>
							expect.objectContaining({
								id: p.id,
								nickname: p.nickname,
							})
						)
					),
				});
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
				expect(response).toMatchObject({
					id: stubGameActive.id,
					active: true,
					stage: 'night',
					players: expect.arrayContaining(
						stubGameActive.players.map((p) =>
							expect.objectContaining({
								id: p.id,
								nickname: p.nickname,
							})
						)
					),
				});
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				expect(response.activities?.at(-1)).toEqual(
					expect.objectContaining({
						healer: stubVillager6.id,
					})
				);
			}
		}
	});

	it('should take a valid request for the choice of a wolf, when the healer is dead, completing the night', async () => {
		const wolf = [stubWolf.id, stubWolf.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const w of wolf) {
			for (const v of victim) {
				mockDynamoResponse(stubGameActive);
				stubParameters(stubGameActive.id, true, Role.WOLF, w, v);

				const response = (await handler.default(event)) as Game;
				expect(response).toMatchObject({
					id: stubGameActive.id,
					active: true,
					stage: 'night',
					players: expect.arrayContaining(
						stubGameActive.players.map((p) =>
							expect.objectContaining({
								id: p.id,
								nickname: p.nickname,
							})
						)
					),
				});
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				expect(response.activities?.at(-1)).toEqual(
					expect.objectContaining({
						wolf: stubVillager6.id,
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
		expect(response).toMatchObject({
			id: stubGameActive.id,
			active: true,
			stage: 'day',
			players: expect.arrayContaining(
				stubGameActive.players.map((p) =>
					expect.objectContaining({
						id: p.id,
						nickname: p.nickname,
					})
				)
			),
		});
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		const activity: Activity = {
			wolf: stubVillager6.id,
			healer: stubVillager6.id,
		};
		expect(response.activities?.at(-1)).toEqual(activity);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGameActive.id,
			},
			expect.objectContaining({
				type: 'morning',
				game: expect.objectContaining({
					id: stubGameActive.id,
					active: true,
					activities: expect.arrayContaining([expect.objectContaining(activity)]),
				}),
			})
		);
	});

	it('should take a valid request from a healer that completes the night, and send out an event', async () => {
		const game = structuredClone(stubGameActive);
		game.activities?.push({ wolf: stubVillager7.id });
		mockDynamoResponse(game);

		stubParameters(stubGameActive.id, true, Role.HEALER, stubHealer.id, stubVillager6.id);

		const response = (await handler.default(event)) as Game;
		expect(response).toMatchObject({
			id: stubGameActive.id,
			active: true,
			stage: 'day',
			players: expect.arrayContaining(
				stubGameActive.players.map((p) =>
					expect.objectContaining({
						id: p.id,
						nickname: p.nickname,
					})
				)
			),
		});
		expect(mockResponseStatus).toBeCalledWith(event, 200);

		const activity: Activity = {
			wolf: stubVillager7.id,
			healer: stubVillager6.id,
		};
		expect(response.activities?.at(-1)).toEqual(activity);

		// Test that the web socket notification is published
		expect(mockWSSend).toHaveBeenCalledWith(
			{
				game: stubGameActive.id,
			},
			expect.objectContaining({
				type: 'morning',
				game: expect.objectContaining({
					id: stubGameActive.id,
					active: true,
					activities: expect.arrayContaining([expect.objectContaining(activity)]),
				}),
			})
		);
	});

	it('should take a valid request for the choice of a wolf, when the healer is dead, completing the night', async () => {
		const wolf = [stubWolf.id, stubWolf.nickname];
		const victim = [stubVillager6.id, stubVillager6.nickname];
		for (const w of wolf) {
			for (const v of victim) {
				const game = structuredClone(stubGameDeadHealer);
				mockDynamoResponse(game);

				stubParameters(stubGameDeadHealer.id, true, Role.WOLF, w, v);

				const response = (await handler.default(event)) as Game;
				expect(response).toMatchObject({
					id: stubGameDeadHealer.id,
					active: true,
					stage: 'day',
					players: expect.arrayContaining(
						stubGameDeadHealer.players.map((p) =>
							expect.objectContaining({
								id: p.id,
								nickname: p.nickname,
							})
						)
					),
				});
				expect(mockResponseStatus).toBeCalledWith(event, 200);

				const activity: Activity = {
					wolf: stubVillager6.id,
					healer: '-',
					votes: {},
				};
				expect(response.activities?.at(-1)).toEqual(activity);

				// Test that the web socket notification is published
				expect(mockWSSend).toHaveBeenCalledWith(
					{
						game: stubGameDeadHealer.id,
					},
					expect.objectContaining({
						type: 'morning',
						game: expect.objectContaining({
							id: stubGameDeadHealer.id,
							active: true,
							activities: expect.arrayContaining([expect.objectContaining(activity)]),
						}),
					})
				);
			}
		}
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

	it('should return an ErrorResponse (with validation messages) if the code is invalid', async () => {
		const codes = [
			null,
			undefined,
			'',
			'ABC',
			'ABCDE',
			'AB-C',
			'A BC',
			'AB<1',
			"AB'1",
			'AB,1',
			'AB;1',
		];
		const errors = [
			'code-required',
			'code-required',
			'code-required',
			'code-no-spaces',
			'code-max',
			'code-invalid',
			'code-no-spaces',
			'code-invalid',
			'code-invalid',
			'code-invalid',
			'code-invalid',
		];
		for (let c = 0; c < codes.length; c++) {
			stubParameters(codes[c], true, Role.WOLF, stubWolf.id, stubVillager6.id);

			const error = structuredClone(stubErrorCode);
			error.errors[0].message = errors[c];
			const response = await handler.default(event);

			expect(response).not.toBeNull();
			expect((response as APIErrorResponse).errors).toEqual(
				expect.arrayContaining(error.errors)
			);
			expect(mockResponseStatus).toBeCalledWith(event, 400);
		}
	});

	it('should return a 404 if the code is not found', async () => {
		stubParameters(stubGameIdNotFound, true, Role.WOLF, stubWolf.id, stubVillager6.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(GameIdNotFoundErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 404);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		stubParameters(stubGameActive.id, false, Role.WOLF, stubWolf.id, stubVillager6.id);

		const response = await handler.default(event);

		expect(response).not.toBeNull();
		expect(response).toEqual(InvalidActionErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 400);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		const game = structuredClone(stubGameUpdateFailure);
		game.stage = 'night';
		mockDynamoResponse(game);
		stubParameters(stubGameIdUpdateError, true, Role.WOLF, stubWolf.id, stubVillager6.id);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);

		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});

	it('should return an ErrorResponse (with unexpected error) if something other than DynamoDB fails', async () => {
		const game = structuredClone(stubGameActive);
		mockDynamoResponse(game);
		// @ts-expect-error Type '{ id: string; }' is not assignable to type 'string'.
		stubParameters({ id: 'Invalid' }, true, Role.WOLF, stubWolf.id, stubVillager6.id);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);

		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual(UnexpectedErrorResponse);
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toBeCalled();
	});
});
