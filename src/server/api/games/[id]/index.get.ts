import type { H3Event, EventHandlerRequest } from 'h3';

import { useLogger } from '@/composables/useLogger';
import { useDynamoDB } from '@/server/util/useDynamoDB';
import {
	GameIdNotFoundErrorResponse,
	InvalidGameIdErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

export default defineEventHandler(
	async (event: H3Event<EventHandlerRequest>): Promise<Game | APIErrorResponse> => {
		const id = getRouterParam(event, 'id');
		if (id && /^[A-Za-z0-9]{4}$/.test(id)) {
			try {
				const dynamo: DynamoDBWrapper = useDynamoDB(event);
				const game = await dynamo.get(id);
				if (game) {
					setResponseStatus(event, 200);
					return game;
				} else {
					setResponseStatus(event, 404);
					return GameIdNotFoundErrorResponse;
				}
			} catch (e) {
				useLogger().error('Error occurred trying to retrieve game:', e as Error);
				setResponseStatus(event, 500);
				return UnexpectedErrorResponse;
			}
		} else {
			setResponseStatus(event, 400);
			return InvalidGameIdErrorResponse;
		}
	}
);
