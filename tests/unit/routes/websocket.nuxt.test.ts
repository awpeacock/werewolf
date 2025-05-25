import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocketHandler } from 'msw';

import { mockWSOpen } from '@tests/unit/setup/websocket';

vi.stubGlobal('defineWebSocketHandler', (handler: WebSocketHandler) => handler);

interface WebSocketPeer {
	id: string;
	request: { url: string };
	close: () => void;
}
interface GameHandler {
	open?: (_peer: WebSocketPeer) => void;
	message?: (_peer: WebSocketPeer, _message: string) => void;
	error?: (_peer: WebSocketPeer, _error: Error) => void;
	close?: (_peer: WebSocketPeer, _event: unknown) => void;
}

describe('Server Game route', async () => {
	const { default: gameHandler } = (await import('@/server/routes/websocket')) as unknown as {
		default: GameHandler;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should successfully handle any request to open a WebSocket', async () => {
		const stub: WebSocketPeer = {
			id: '1bb99196-fca2-4431-bd9a-0e1d021aeb35',
			request: { url: '/ws?code=ABCD&player=TestPlayer' },
			close: vi.fn(),
		};

		gameHandler.open!(stub);

		expect(mockWSOpen).toHaveBeenCalledWith(stub, 'ABCD', 'TestPlayer');
	});

	it('should gracefully handle if a game is not supplied', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		const stub: WebSocketPeer = {
			id: '1bb99196-fca2-4431-bd9a-0e1d021aeb35',
			request: { url: '/ws?player=TestPlayer' },
			close: vi.fn(),
		};

		expect(() => {
			gameHandler.open!(stub);
		}).not.toThrowError('');

		expect(mockWSOpen).not.toHaveBeenCalled();
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('WebSocket open request without game code or player')
		);
	});

	it('should gracefully handle if a player is not supplied', async () => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		const stub: WebSocketPeer = {
			id: '1bb99196-fca2-4431-bd9a-0e1d021aeb35',
			request: { url: '/ws?code=ABCD' },
			close: vi.fn(),
		};

		expect(() => {
			gameHandler.open!(stub);
		}).not.toThrowError('');

		expect(mockWSOpen).not.toHaveBeenCalled();
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining('WebSocket open request without game code or player')
		);
	});

	// Until we do more useful things with these, all we can do is test for logs
	it('should log on message, error or close', async () => {
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => null);
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		const stub: WebSocketPeer = {
			id: '1bb99196-fca2-4431-bd9a-0e1d021aeb35',
			request: { url: '/ws?code=ABCD' },
			close: vi.fn(),
		};

		gameHandler.message!(stub, 'A message');

		expect(spyLog).toHaveBeenLastCalledWith(
			expect.stringContaining(
				'Message received from 1bb99196-fca2-4431-bd9a-0e1d021aeb35 - "A message"'
			)
		);

		gameHandler.error!(stub, new Error('An error'));

		expect(spyError).toHaveBeenLastCalledWith(
			expect.stringContaining(
				'WebSocket error for 1bb99196-fca2-4431-bd9a-0e1d021aeb35 - An error'
			)
		);

		gameHandler.close!(stub, 'An event');

		expect(spyLog).toHaveBeenLastCalledWith(
			expect.stringContaining(
				'WebSocket closed for 1bb99196-fca2-4431-bd9a-0e1d021aeb35 - Reason: An event'
			)
		);

		gameHandler.close!(stub, 'A string event');

		expect(spyLog).toHaveBeenLastCalledWith(
			expect.stringContaining(
				'WebSocket closed for 1bb99196-fca2-4431-bd9a-0e1d021aeb35 - Reason: A string event'
			)
		);

		gameHandler.close!(stub, { code: 1001, reason: '' });

		expect(spyLog).toHaveBeenLastCalledWith(
			expect.stringContaining(
				'WebSocket closed for 1bb99196-fca2-4431-bd9a-0e1d021aeb35 - Reason: {"code":1001,"reason":""}'
			)
		);
	});
});
