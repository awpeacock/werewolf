import type { H3Event, EventHandlerRequest } from 'h3';
import { v4 as uuidv4 } from 'uuid';

import { useDynamoDB } from '@/composables/useDynamoDB';
import { useGame } from '@/composables/useGame';
import { useValidation } from '@/composables/useValidation';
import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	NicknameAlreadyExistsErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';
import { Role } from '@/types/enums';

interface JoinRequest {
	villager: string;
}

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<Game | APIErrorResponse> => {
		// Handler for all join requests
		const handleJoin = async (game: Game) => {
			const invite = getQuery(event).invite;
			const body: JoinRequest = await readBody(event);

			// Never trust only on client-side validation - let's do it all again
			const errors: Array<APIError> = useValidation().validateNickname(body.villager);
			if (errors.length > 0) {
				const response: APIErrorResponse = { errors: errors };
				setResponseStatus(event, 400);
				return response;
			}

			const existing: boolean = useGame(game).hasPlayer(body.villager);
			if (existing) {
				setResponseStatus(event, 400);
				return NicknameAlreadyExistsErrorResponse;
			}
			const player: Player = {
				id: uuidv4(),
				nickname: body.villager,
				role: Role.VILLAGER,
			};

			const mayor = useGame(game).mayor();
			const admit = mayor && mayor?.id === invite;
			if (admit) {
				game.players.push(player);
			} else {
				if (!game.pending) {
					game.pending = [];
				}
				game.pending!.push(player);
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
					// case 'admit': {
					// 	return await handleAdmit(game);
					// }
					// case 'start': {
					// 	return await handleStart(game);
					// }
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
			console.error('Error occurred trying to update game:', e);
			setResponseStatus(event, 500);
			return UnexpectedErrorResponse;
		}
	}
);
