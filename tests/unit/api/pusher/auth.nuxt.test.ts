import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { H3Event, EventHandlerRequest } from 'h3';
import type { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import type { ChannelAuthResponse } from 'pusher';

import { stubGameNew, stubMayor } from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';

describe('Pusher Auth API', async () => {
	const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request for a game channel, and authorise the connection', async () => {
		const body = {
			socket_id: '12345.67890',
			channel_name: `private-game-${stubGameNew.id}`,
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toHaveProperty('auth');
		const auth = (response as ChannelAuthResponse).auth;
		expect(typeof auth).toBe('string');
		expect(auth).toMatch(/^[a-z0-9]*:[a-z0-9]+$/i);
	});

	it('should take a valid request for a player channel, and authorise the connection', async () => {
		const body = {
			socket_id: '12345.67890',
			channel_name: `private-game-${stubGameNew.id}-player-${stubMayor.id}`,
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toHaveProperty('auth');
		const auth = (response as ChannelAuthResponse).auth;
		expect(typeof auth).toBe('string');
		expect(auth).toMatch(/^[a-z0-9]*:[a-z0-9]+$/i);
	});

	it('should return an error if no socket ID is provided', async () => {
		const body = {
			channel_name: `game-${stubGameNew.id}-player-${stubMayor.id}`,
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual('Bad request: Missing socket ID');
		expect(mockResponseStatus).toBeCalledWith(event, 400);
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('Missing socket ID in Pusher auth request')
		);
	});

	it('should return an error if no channel name is provided', async () => {
		const body = {
			socket_id: '12345.67890',
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual('Bad request: Missing channel name');
		expect(mockResponseStatus).toBeCalledWith(event, 400);
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('Missing channel name in Pusher auth request')
		);
	});

	it('should return an error if an invalid socket ID is provided', async () => {
		const body = {
			socket_id: '1234567890',
			channel_name: `game-${stubGameNew.id}-player-${stubMayor.id}`,
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual('Bad request: Invalid socket ID');
		expect(mockResponseStatus).toBeCalledWith(event, 400);
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid socket ID in Pusher auth request')
		);
	});

	it('should return an error if an invalid channel name is provided', async () => {
		const body = {
			socket_id: '12345.67890',
			channel_name: `player-${stubMayor.id}`,
		};
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual('Bad request: Invalid channel name');
		expect(mockResponseStatus).toBeCalledWith(event, 400);
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid channel name in Pusher auth request')
		);
	});

	it('catches any errors and returns a generic message', async () => {
		vi.stubGlobal('readBody', vi.fn().mockResolvedValue(null));

		const handler = await import('@/server/api/pusher/auth.post');
		const req = Object.create(IncomingMessage.prototype) as IncomingMessage;
		const res = {
			setHeader: vi.fn(),
			end: vi.fn(),
			getHeader: vi.fn(),
		} as unknown as ServerResponse;

		const event: H3Event<EventHandlerRequest> = {
			context: {},
			req: req,
			res: res,
			node: { req, res }, // <-- Add this line
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		expect(response).toEqual('Unexpected server error');
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Error in Pusher auth:'));
	});
});
