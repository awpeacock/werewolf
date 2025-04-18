import type { H3Event, EventHandlerRequest } from 'h3';

export const useDynamoDB = (event: H3Event<EventHandlerRequest>) => {
	const dynamo = event.context.dynamo;
	if (!dynamo) {
		throw new Error(
			'Unable to access DynamoDB - this should only ever be called on the server'
		);
	}
	return dynamo;
};
