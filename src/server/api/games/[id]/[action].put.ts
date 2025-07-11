import type { H3Event, EventHandlerRequest } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { useGame } from '@/composables/useGame';
import type { GameUtility } from '@/composables/useGame';
import { useLogger } from '@/composables/useLogger';
import { useValidation } from '@/composables/useValidation';
import { useBroadcast } from '@/server/util/useBroadcast';
import { useDynamoDB } from '@/server/util/useDynamoDB';
import {
	AttemptToChooseOutsideNightErrorResponse,
	AttemptToVoteOutsideDayErrorResponse,
	CannotChooseDeadPlayerErrorResponse,
	CannotChooseEvictedPlayerErrorResponse,
	CannotVoteForDeadPlayerErrorResponse,
	CannotVoteForEvictedPlayerErrorResponse,
	CannotVoteTwiceErrorResponse,
	CannotVoteUntilActivityCompleteErrorResponse,
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

type UpdateMethod = (_game: Game) => Promise<Game | APIErrorResponse>;

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<Game | APIErrorResponse> => {
		// Optimistic locking for all DB updates
		const optimisticUpdate = async (id: string, update: UpdateMethod) => {
			const setting: number = parseInt(useRuntimeConfig().DB_LOCK_MAX_RETRIES);
			const max: number = setting > 0 ? setting : 10;
			for (let r = 0; r < max; r++) {
				const dynamo: DynamoDBWrapper = useDynamoDB(event);
				const game = await dynamo.get(id);
				if (!game) {
					setResponseStatus(event, 404);
					return GameIdNotFoundErrorResponse;
				}

				try {
					return await update(game);
				} catch (e) {
					if ((e as Error).name !== 'ConditionalCheckFailedException') {
						useLogger().error('Error occurred trying to update game:', e as Error);
						setResponseStatus(event, 500);
						return UnexpectedErrorResponse;
					} else {
						useLogger().warn(`Likely concurrent update received (Attempt ${r + 1})`);
					}
				}
			}
			// We should only get here if we've exceeded the max retries limit
			useLogger().error('Exceeded max retries trying to update a game');
			setResponseStatus(event, 500);
			return UnexpectedErrorResponse;
		};

		// Validate the input to the API
		const validate = (
			util: GameUtility,
			time: 'night' | 'day',
			player: string,
			target?: string
		): Undefinable<APIErrorResponse> => {
			if (util.isPlayerDead(player)) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			if (target && util.isPlayerDead(target)) {
				setResponseStatus(event, 400);
				return time === 'night'
					? CannotChooseDeadPlayerErrorResponse
					: CannotVoteForDeadPlayerErrorResponse;
			}
			if (util.isPlayerEvicted(player)) {
				setResponseStatus(event, 403);
				return UnauthorisedErrorResponse;
			}
			if (target && util.isPlayerEvicted(target)) {
				setResponseStatus(event, 400);
				return time === 'night'
					? CannotChooseEvictedPlayerErrorResponse
					: CannotVoteForEvictedPlayerErrorResponse;
			}
		};

		// Helper method for detecting whether or not night-time activities are completed
		const isNightComplete = (util: GameUtility, activity: Activity): boolean => {
			const isWolfIncomplete = activity.wolf === null || activity.wolf === undefined;
			const isHealerIncomplete =
				(activity.healer === null || activity.healer === undefined) &&
				!util.isPlayerDead(util.getHealer()!.id) &&
				!util.isPlayerEvicted(util.getHealer()!.id);
			return !isWolfIncomplete && !isHealerIncomplete;
		};

		const countVotes = (util: GameUtility, activity: Activity): void => {
			// Do we move onto the next night, or is the game over (either they guessed
			// right, or the wolf has won) - let's count up all the votes
			const count: Record<string, number> = {};
			for (const id of Object.values(activity.votes!)) {
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
				activity.evicted = util.findPlayer(sorted.at(0)?.at(0) as string)!.id;
			} else {
				activity.evicted = null;
			}
		};

		// Handler for all join requests
		const handleJoin = async (game: Game) => {
			const invite = getQuery(event).invite;
			const body: JoinRequestBody = await readBody(event);
			const nickname = body.villager ? body.villager.trim() : null;

			// Never trust only on client-side validation - let's do it all again
			const errors: Array<APIError> = useValidation().validateNickname(nickname);
			if (errors.length > 0) {
				const response: APIErrorResponse = { errors: errors };
				setResponseStatus(event, 400);
				return response;
			}

			const gameUtil = useGame(game);
			const existing: boolean = gameUtil.hasPlayer(nickname!);
			if (existing) {
				setResponseStatus(event, 400);
				return NicknameAlreadyExistsErrorResponse;
			}
			const player: Player = {
				id: uuidv4(),
				nickname: nickname!,
				roles: [],
			};

			const mayor = gameUtil.getMayor();
			const admit = mayor && mayor?.id === invite;
			if (admit) {
				game.players.push(player);
			} else {
				game.pending ??= [];
				game.pending.push(player);
			}

			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			if (!admit) {
				// Broadcast join request to the mayor
				const broadcast = useBroadcast();
				const payload: JoinRequestEvent = {
					type: 'join-request',
					game: game,
					player: player,
				};
				await broadcast.send({ game: game.id, player: gameUtil.getMayor()!.id }, payload);
			} else {
				// Broadcast admittance to the mayor
				const broadcast = useBroadcast();
				const payload: InviteAcceptEvent = {
					type: 'invite-accept',
					game: game,
					player: player,
				};
				await broadcast.send({ game: game.id, player: gameUtil.getMayor()!.id }, payload);
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
			const broadcast = useBroadcast();
			const payload: AdmissionEvent = {
				type: 'admission',
				game: game,
				response: body.admit,
			};
			await broadcast.send({ game: game.id, player: body.villager }, payload);
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
			const setting: number = parseInt(useRuntimeConfig().public.MIN_PLAYERS);
			const min: number = setting > 0 ? setting : 6;
			if (game.players.length < min) {
				setResponseStatus(event, 400);
				return NotEnoughPlayersErrorResponse;
			}
			game.active = true;
			game.started = new Date();
			game.stage = 'night';

			// Assign the wolf and healer roles
			const wolf = crypto.randomInt(game.players.length);
			const healer = crypto.randomInt(game.players.length);
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
			const broadcast = useBroadcast();
			for (const player of game.players) {
				const payload: StartGameEvent = {
					type: 'start-game',
					game: game,
					role: player.roles.filter((role) => role !== Role.MAYOR)[0],
				};
				await broadcast.send({ game: game.id, player: player.id }, payload);
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

			const response = validate(gameUtil, 'night', body.player, body.target);
			if (response) {
				return response;
			}

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

			// If both the wolf and healer have now completed their activities,
			// we need to broadcast the move on to daytime.  The healer may be dead,
			// so will never complete their activities - to prevent the game getting
			// stuck inject an entry that will never match
			if (
				gameUtil.isPlayerDead(gameUtil.getHealer()!.id) ||
				gameUtil.isPlayerEvicted(gameUtil.getHealer()!.id)
			) {
				activity.healer = '-';
			}
			const broadcast = useBroadcast();
			let payload: Undefinable<MorningEvent>;
			if (isNightComplete(gameUtil, activity)) {
				game.stage = 'day';
				payload = {
					type: 'morning',
					game: game,
				};
			}
			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			setResponseStatus(event, 200);
			// Only send out notifications AFTER updating the DB so there's no risk of being out of sync
			if (payload) {
				await broadcast.send({ game: game.id }, payload);
			}
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
			const valid = isNightComplete(gameUtil, activity);
			if (!valid) {
				setResponseStatus(event, 400);
				return CannotVoteUntilActivityCompleteErrorResponse;
			}

			// Check it's a valid vote, then add to the activity
			const response = validate(gameUtil, 'day', body.player, body.vote);
			if (response) {
				return response;
			}
			const player = gameUtil.findPlayer(body.player) as Player;
			const accused = gameUtil.findPlayer(body.vote) as Player;
			activity.votes ??= {};
			if (Object.keys(activity.votes).includes(body.player)) {
				setResponseStatus(event, 400);
				return CannotVoteTwiceErrorResponse;
			}
			activity.votes[player.id] = accused.id;

			const broadcast = useBroadcast();
			let payload: Undefinable<GameEvent>;
			if (Object.keys(activity.votes).length === gameUtil.getAlivePlayers().length) {
				countVotes(gameUtil, activity);

				if (activity.evicted === gameUtil.getWolf()!.id) {
					// If the village correctly guessed the wolf, finalise the game and broadcast it
					game.finished = new Date();
					game.active = false;
					game.winner = 'village';
					payload = {
						type: 'game-over',
						game: game,
					};
				} else if (gameUtil.getAlivePlayers().length <= 3) {
					// But, if we only have 3 left then the wolf has won
					game.finished = new Date();
					game.active = false;
					game.winner = 'wolf';
					payload = {
						type: 'game-over',
						game: game,
					};
				} else {
					// Otherwise, we go round again
					game.stage = 'night';
					payload = {
						type: 'eviction',
						game: game,
						player: activity.evicted ? gameUtil.findPlayer(activity.evicted) : null,
					};
				}
			}
			const dynamo: DynamoDBWrapper = useDynamoDB(event);
			await dynamo.update(game);
			// Only send out notifications AFTER updating the DB so there's no risk of being out of sync
			if (payload) {
				await broadcast.send({ game: game.id }, payload);
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
			// Typescript and Sonar are at loggerheads as to whether id is set (it will be
			// if we've passed validation) so add this check in to make both happy.
			/* istanbul ignore next @preserve */
			if (!id) {
				throw new Error('No game code supplied');
			}
			const action = getRouterParam(event, 'action');
			switch (action) {
				case 'join': {
					return await optimisticUpdate(id, (game) => handleJoin(game));
				}
				case 'admit': {
					return await optimisticUpdate(id, (game) => handleAdmit(game));
				}
				case 'start': {
					return await optimisticUpdate(id, (game) => handleStart(game));
				}
				case 'night': {
					return await optimisticUpdate(id, (game) => handleNight(game));
				}
				case 'day': {
					return await optimisticUpdate(id, (game) => handleDay(game));
				}
				// case 'reset': {
				// 	return await handleReset(game);
				// }
				default: {
					setResponseStatus(event, 400);
					return InvalidActionErrorResponse;
				}
			}
		} catch (e: unknown) {
			useLogger().error('Error occurred trying to update game:', e as Error);
			setResponseStatus(event, 500);
			return UnexpectedErrorResponse;
		}
	}
);
