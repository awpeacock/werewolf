import type { H3Event, EventHandlerRequest } from 'h3';
import { v4 as uuidv4 } from 'uuid';

import { useDynamoDB } from '@/composables/useDynamoDB';
import { Role } from '@/types/enums';
import { NoUniqueIdErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

interface CreateRequest {
	mayor: string;
}

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<Game | APIErrorResponse> => {
		const body: CreateRequest = await readBody(event);

		// Never trust only on client-side validation - let's do it all again
		const errors: Array<APIError> = validateNickname(body.mayor);
		if (errors.length > 0) {
			const response: APIErrorResponse = { errors: errors };
			setResponseStatus(event, 400);
			return response;
		}

		// The DB call may fail if the game code already exists (unlikely unless this proves
		// to be very popular), so we have a retry loop
		const setting: number = parseInt(useRuntimeConfig().CREATE_MAX_RETRIES);
		const max: number = setting > 0 ? setting : 3;
		for (let r = 0; r < max; r++) {
			const uuid = uuidv4();
			const id = uuid.toUpperCase().substring(0, 4);
			const game: Game = {
				id: id,
				created: new Date(),
				active: false,
				players: [{ id: uuidv4(), nickname: body.mayor, role: Role.MAYOR }],
			};

			try {
				const dynamo: DynamoDBWrapper = useDynamoDB(event);
				await dynamo.put(game);
				return game;
			} catch (e: unknown) {
				if ((e as Error).name !== 'ConditionalCheckFailedException') {
					console.error('Error occurred trying to create game:', e);
					setResponseStatus(event, 500);
					return UnexpectedErrorResponse;
				}
			}
		}

		// We should only get here if we've exceeded the max retries limit
		console.error('Exceeded max retries trying to create a game');
		setResponseStatus(event, 500);
		return NoUniqueIdErrorResponse;
	}
);
