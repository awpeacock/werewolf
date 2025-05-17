import type { H3Event, EventHandlerRequest } from 'h3';
import { v4 as uuidv4 } from 'uuid';

import { useDynamoDB } from '@/composables/useDynamoDB';
import { useGame } from '@/composables/useGame';
import { useLogger } from '@/composables/useLogger';
import { useValidation } from '@/composables/useValidation';
import { useWebSocketBroadcast } from '@/server/util/useWebSocketBroadcast';
import {
	AttemptToChooseOutsideNightErrorResponse,
	AttemptToVoteOutsideDayErrorResponse,
	CannotVoteForDeadPlayerErrorReponse,
	CannotVoteForEvictedPlayerErrorReponse,
	CannotVoteTwiceErrorReponse,
	CannotVoteUntilActivityCompleteErrorReponse,
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NicknameAlreadyExistsErrorResponse,
	NotEnoughPlayersErrorResponse,
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

			const mayor = gameUtil.getMayor();
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
				broadcast.send({ game: game.id, player: gameUtil.getMayor()!.id }, payload);
			}
			setResponseStatus(event, 200);
			return game;
		};

		// Handler for all admission responses
		const handleAdmit = async (game: Game) => {
			const body: AdmissionBody = await readBody(event);

			const gameUtil = useGame(game);
			// Only the mayor can admit players
			const mayor = gameUtil.getMayor();
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
			// Only the mayor can start the game
			const mayor = gameUtil.getMayor();
			if (mayor?.id !== body.auth) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			// Must have minimum number of players
			const min = parseInt(useRuntimeConfig().public.MIN_PLAYERS);
			if (game.players.length < min) {
				setResponseStatus(event, 400);
				return NotEnoughPlayersErrorResponse;
			}
			game.active = true;
			game.started = new Date();
			game.stage = 'night';

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

		// Handler for collecting wolf/healer choices
		const handleNight = async (game: Game) => {
			const body: ActivityBody = await readBody(event);

			// Are we meant to be getting choices now?
			if (game.stage !== 'night') {
				setResponseStatus(event, 400);
				return AttemptToChooseOutsideNightErrorResponse;
			}

			const gameUtil = useGame(game);
			// Get the latest activity to add to it
			const activity = gameUtil.getCurrentActivity();
			const isNew = activity.wolf === null && activity.healer === null;

			// Make sure the player ID matches up to the role
			const player = gameUtil.findPlayer(body.player);
			if (player?.roles.includes(Role.WOLF) && body.role === Role.WOLF) {
				activity.wolf = gameUtil.findPlayer(body.target)!.id;
			} else if (player?.roles.includes(Role.HEALER) && body.role === Role.HEALER) {
				activity.healer = gameUtil.findPlayer(body.target)!.id;
			} else {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}

			if (isNew) {
				game.activities?.push(activity);
			}

			// If both the wolf and healer have now completed their activities,
			// we need to broadcast the move on to daytime
			if (activity.wolf !== null && activity.healer !== null) {
				game.stage = 'day';
				const broadcast = useWebSocketBroadcast();
				const payload: MorningEvent = {
					type: 'morning',
					game: game,
				};
				broadcast.send({ game: game.id }, payload);
			}
			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			setResponseStatus(event, 200);
			return game;
		};

		// Handler for collecting votes
		const handleDay = async (game: Game) => {
			const body: VoteBody = await readBody(event);

			// Are we meant to be collecting votes now?
			if (game.stage !== 'day') {
				setResponseStatus(event, 400);
				return AttemptToVoteOutsideDayErrorResponse;
			}

			const gameUtil = useGame(game);
			// Get the latest activity to add to it
			const activity = gameUtil.getCurrentActivity();
			const valid =
				activity.wolf !== null &&
				activity.wolf !== undefined &&
				activity.healer !== null &&
				activity.healer !== undefined;
			if (!valid) {
				setResponseStatus(event, 400);
				return CannotVoteUntilActivityCompleteErrorReponse;
			}

			// Check it's a valid vote, then add to the activity
			if (gameUtil.isPlayerDead(body.player)) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			if (gameUtil.isPlayerDead(body.vote)) {
				setResponseStatus(event, 400);
				return CannotVoteForDeadPlayerErrorReponse;
			}
			if (gameUtil.isPlayerEvicted(body.player)) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			if (gameUtil.isPlayerEvicted(body.vote)) {
				setResponseStatus(event, 400);
				return CannotVoteForEvictedPlayerErrorReponse;
			}
			const player = gameUtil.findPlayer(body.player) as Player;
			const accused = gameUtil.findPlayer(body.vote) as Player;
			if (!activity.votes) {
				activity.votes = {};
			}
			if (Object.keys(activity.votes!).includes(body.player)) {
				setResponseStatus(event, 400);
				return CannotVoteTwiceErrorReponse;
			}
			activity.votes[player.id] = accused.id;

			if (Object.keys(activity.votes).length === gameUtil.getAlivePlayers().length) {
				// Do we move onto the next night, or is the game over (either they guessed
				// right, or the wolf has won) - let's count up all the votes
				const count: Record<string, number> = {};
				for (const id of Object.values(activity.votes as Votes)) {
					if (!(id in count)) {
						count[id] = 0;
					}
					count[id]++;
				}
				// If we have a tie, then the group was unable to decide, there is no vote winner
				const sorted: Array<Array<string | number>> = Object.entries(count).sort(
					(a, b) => b[1] - a[1]
				);
				if (sorted.at(0)?.at(1) !== sorted.at(1)?.at(1)) {
					activity.evicted = gameUtil.findPlayer(sorted.at(0)?.at(0) as string)!.id;
				} else {
					activity.evicted = null;
				}

				if (activity.evicted === gameUtil.getWolf()!.id) {
					// If the village correctly guessed the wolf, finalise the game and broadcast it
					game.finished = new Date();
					game.active = false;
					game.winner = 'village';

					const broadcast = useWebSocketBroadcast();
					const payload: GameOverEvent = {
						type: 'game-over',
						game: game,
					};
					broadcast.send({ game: game.id }, payload);
				} else if (gameUtil.getAlivePlayers().length <= 3) {
					// But, if we only have 3 left then the wolf has won
					game.finished = new Date();
					game.active = false;
					game.winner = 'wolf';

					const broadcast = useWebSocketBroadcast();
					const payload: GameOverEvent = {
						type: 'game-over',
						game: game,
					};
					broadcast.send({ game: game.id }, payload);
				} else {
					// Otherwise, we go round again
					game.stage = 'night';

					const broadcast = useWebSocketBroadcast();
					const payload: EvictionEvent = {
						type: 'eviction',
						game: game,
						player: activity.evicted ? gameUtil.findPlayer(activity.evicted) : null,
					};
					broadcast.send({ game: game.id }, payload);
				}
			}
			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
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
					case 'night': {
						return await handleNight(game);
					}
					case 'day': {
						return await handleDay(game);
					}
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
