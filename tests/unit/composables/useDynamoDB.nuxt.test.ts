import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event, EventHandlerRequest } from 'h3';

import { stubDynamoWrapper } from '@tests/unit/setup/dynamodb';

vi.stubGlobal('defineEventHandler', (func: unknown) => func);

describe('useDynamoDB', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return a DynamoDB wrapper if present in the context', async () => {
		const event: H3Event<EventHandlerRequest> = {
			context: {
				dynamo: stubDynamoWrapper,
			},
		} as Partial<H3Event> as H3Event;

		expect(() => {
			const dynamo = useDynamoDB(event);
			expect(dynamo).toBe(stubDynamoWrapper);
		}).not.toThrow();
	});

	it('should error if no DynamoDB wrapper is present in the context (ie not on server side)', async () => {
		const event: H3Event<EventHandlerRequest> = {
			context: {},
		} as Partial<H3Event> as H3Event;

		expect(() => {
			useDynamoDB(event);
		}).toThrowError(
			'Unable to access DynamoDB - this should only ever be called on the server'
		);
	});
});
