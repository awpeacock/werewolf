import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { H3Event, EventHandlerRequest } from 'h3';
import type { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import type { ChannelAuthResponse } from 'pusher';

import { stubGameNew, stubMayor } from '@tests/common/stubs';
import { mockResponseStatus } from '@tests/unit/setup/api';

interface PusherBody {
	socket_id?: string;
	channel_name?: string;
}

describe('Pusher Auth API', async () => {
	const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

	const setup = async (
		type: Nullable<'game' | 'player' | 'invalid'>,
		socket: Nullable<string>
	) => {
		let channel: string;
		let body: PusherBody;
		switch (type) {
			case 'game': {
				channel = `private-game-${stubGameNew.id}`;
				break;
			}
			case 'player': {
				channel = `private-game-${stubGameNew.id}-player-${stubMayor.id}`;
				break;
			}
			case 'invalid': {
				channel = `player-${stubMayor.id}`;
				break;
			}
		}
		if (socket != null && type != null) {
			body = {
				socket_id: socket,
				channel_name: channel!,
			};
		} else if (socket === null) {
			body = {
				channel_name: channel!,
			};
		} else {
			body = {
				socket_id: socket,
			};
		}

		const [response, event] = await call(body);
		if ((type === 'game' || type === 'player') && socket !== null && socket.includes('.')) {
			expect(response).toHaveProperty('auth');
			const auth = (response as ChannelAuthResponse).auth;
			expect(typeof auth).toBe('string');
			expect(auth).toMatch(/^[a-z0-9]*:[a-z0-9]+$/i);
		} else {
			expect(mockResponseStatus).toBeCalledWith(event, 400);
			if (socket === null) {
				expect(response).toEqual('Bad request: Missing socket ID');
				expect(spyError).toHaveBeenCalledWith(
					expect.stringContaining('Missing socket ID in Pusher auth request')
				);
			} else if (!socket.includes('.')) {
				expect(response).toEqual('Bad request: Invalid socket ID');
				expect(spyError).toHaveBeenCalledWith(
					expect.stringContaining('Invalid socket ID in Pusher auth request')
				);
			} else if (type === null) {
				expect(response).toEqual('Bad request: Missing channel name');
				expect(spyError).toHaveBeenCalledWith(
					expect.stringContaining('Missing channel name in Pusher auth request')
				);
			} else if (type === 'invalid') {
				expect(response).toEqual('Bad request: Invalid channel name');
				expect(spyError).toHaveBeenCalledWith(
					expect.stringContaining('Invalid channel name in Pusher auth request')
				);
			}
		}
	};

	const call = async (
		body: Nullable<PusherBody>
	): Promise<[ChannelAuthResponse | string, H3Event<EventHandlerRequest>]> => {
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
			node: { req, res },
		} as Partial<H3Event> as H3Event;
		const response = await handler.default(event);
		expect(response).not.toBeNull();
		return [response, event];
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should take a valid request for a game channel, and authorise the connection', async () => {
		await setup('game', '12345.67890');
	});

	it('should take a valid request for a player channel, and authorise the connection', async () => {
		await setup('player', '12345.67890');
	});

	it('should return an error if no socket ID is provided', async () => {
		await setup('game', null);
	});

	it('should return an error if no channel name is provided', async () => {
		await setup(null, '12345.67890');
	});

	it('should return an error if an invalid socket ID is provided', async () => {
		await setup('player', '1234567890');
	});

	it('should return an error if an invalid channel name is provided', async () => {
		await setup('invalid', '12345.67890');
	});

	it('catches any errors and returns a generic message', async () => {
		const [response, event] = await call(null);
		expect(response).toEqual('Unexpected server error');
		expect(mockResponseStatus).toBeCalledWith(event, 500);
		expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Error in Pusher auth:'));
	});
});
