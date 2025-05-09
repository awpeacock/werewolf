import type { H3Event, EventHandlerRequest } from 'h3';
import { v4 as uuidv4 } from 'uuid';

import { useDynamoDB } from '@/composables/useDynamoDB';
import { useGame } from '@/composables/useGame';
import { useLogger } from '@/composables/useLogger';
import { useValidation } from '@/composables/useValidation';
import { useWebSocketBroadcast } from '@/server/util/useWebSocketBroadcast';
import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NicknameAlreadyExistsErrorResponse,
	PlayerAlreadyAdmittedErrorResponse,
	PlayerIdNotFoundErrorResponse,
	UnauthorisedErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { Role } from '@/types/enums';

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<Game | APIErrorResponse> => {
		// Handler for all join requests
		const handleJoin = async (game: Game) => {
			const invite = getQuery(event).invite;
			const body: JoinRequestBody = await readBody(event);

			// Never trust only on client-side validation - let's do it all again
			const errors: Array<APIError> = useValidation().validateNickname(body.villager);
			if (errors.length > 0) {
				const response: APIErrorResponse = { errors: errors };
				setResponseStatus(event, 400);
				return response;
			}

			const gameUtil = useGame(game);
			const existing: boolean = gameUtil.hasPlayer(body.villager);
			if (existing) {
				setResponseStatus(event, 400);
				return NicknameAlreadyExistsErrorResponse;
			}
			const player: Player = {
				id: uuidv4(),
				nickname: body.villager,
				roles: [],
			};

			const mayor = gameUtil.mayor();
			const admit = mayor && mayor?.id === invite;
			let broadcast = false;
			if (admit) {
				game.players.push(player);
			} else {
				if (!game.pending) {
					game.pending = [];
				}
				game.pending!.push(player);
				broadcast = true;
			}

			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			if (broadcast) {
				// Broadcast to the mayor
				const broadcast = useWebSocketBroadcast();
				const payload: JoinRequestEvent = {
					type: 'join-request',
					game: game,
					player: player,
				};
				broadcast.send({ game: game.id, player: useGame(game).mayor()!.id }, payload);
			}
			setResponseStatus(event, 200);
			return game;
		};

		// Handler for all admission responses
		const handleAdmit = async (game: Game) => {
			const body: AdmissionBody = await readBody(event);

			const gameUtil = useGame(game);
			// Only the mayor can admit players
			const mayor = gameUtil.mayor();
			if (mayor?.id !== body.auth) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			// Can't admit a player that doesn't exist
			const exists: boolean = gameUtil.hasPlayer(body.villager);
			if (!exists) {
				setResponseStatus(event, 404);
				return PlayerIdNotFoundErrorResponse;
			}
			// If the player is already admitted no point wasting processing power
			if (gameUtil.isPlayerAdmitted(body.villager)) {
				if (body.admit) {
					setResponseStatus(event, 200);
					return game;
				} else {
					setResponseStatus(event, 400);
					return PlayerAlreadyAdmittedErrorResponse;
				}
			}

			if (body.admit) {
				game = gameUtil.admitPlayer(body.villager);
			} else {
				game = gameUtil.removePlayer(body.villager);
			}

			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			// Broadcast to the villager in question
			const broadcast = useWebSocketBroadcast();
			const payload: AdmissionEvent = {
				type: 'admission',
				game: game,
				response: body.admit,
			};
			broadcast.send({ game: game.id, player: body.villager }, payload);
			setResponseStatus(event, 200);
			return game;
		};

		// Handler to start the game
		const handleStart = async (game: Game) => {
			const body: StartGameBody = await readBody(event);

			const gameUtil = useGame(game);
			// Only the mayor can admit players
			const mayor = gameUtil.mayor();
			if (mayor?.id !== body.auth) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			game.active = true;

			// Assign the wolf and healer roles
			const wolf = Math.floor(Math.random() * game.players.length);
			const healer = Math.floor(Math.random() * game.players.length);
			game.players[wolf].roles.push(Role.WOLF);
			if (wolf === healer && healer < game.players.length - 1) {
				game.players[healer + 1].roles.push(Role.HEALER);
			} else if (wolf === healer) {
				game.players[0].roles.push(Role.HEALER);
			} else {
				game.players[healer].roles.push(Role.HEALER);
			}
			for (const player of game.players) {
				if (
					player.roles.length === 0 ||
					(player.roles.length === 1 && player.roles[0] === Role.MAYOR)
				) {
					player.roles.push(Role.VILLAGER);
				}
			}

			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			// Broadcast to the villager in question
			const broadcast = useWebSocketBroadcast();
			for (const player of game.players) {
				const payload: StartGameEvent = {
					type: 'start-game',
					game: game,
					role: player.roles.filter((role) => role !== Role.MAYOR)[0],
				};
				broadcast.send({ game: game.id, player: player.id }, payload);
			}
			setResponseStatus(event, 200);
			return game;
		};

		try {
			const id = getRouterParam(event, 'id');
			const errors: Array<APIError> = useValidation().validateCode(id);
			if (errors.length > 0) {
				const response: APIErrorResponse = { errors: errors };
				setResponseStatus(event, 400);
				return response;
			}
			const action = getRouterParam(event, 'action');
			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			const game = await dynamo.get(id!);
			if (game) {
				switch (action) {
					case 'join': {
						return await handleJoin(game);
					}
					case 'admit': {
						return await handleAdmit(game);
					}
					case 'start': {
						return await handleStart(game);
					}
					// case 'night': {
					// 	return await handleNight(game);
					// }
					// case 'day': {
					// 	return await handleDay(game);
					// }
					// case 'vote': {
					// 	return await handleVote(game);
					// }
					// case 'end': {
					// 	return await handleEnd(game);
					// }
					// case 'reset': {
					// 	return await handleReset(game);
					// }
					default: {
						setResponseStatus(event, 400);
						return InvalidActionErrorResponse;
					}
				}
			} else {
				setResponseStatus(event, 404);
				return GameIdNotFoundErrorResponse;
			}
		} catch (e: unknown) {
			useLogger().error('Error occurred trying to update game:', e as Error);
			setResponseStatus(event, 500);
			return UnexpectedErrorResponse;
		}
	}
);
