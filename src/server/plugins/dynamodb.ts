import type { H3Event, EventHandlerRequest } from 'h3';

import { useLogger } from '@/composables/useLogger';
import { createDynamoDBWrapper } from '@/server/util/useDynamoDB';

export default defineNitroPlugin((nitro) => {
	const config = useRuntimeConfig();

	// Inject the client into the context for server-side access
	nitro.hooks.hook('request', (event: H3Event<EventHandlerRequest>) => {
		event.context.dynamo = createDynamoDBWrapper(config);
	});

	useLogger().success('DynamoDB Client initialised');
});
