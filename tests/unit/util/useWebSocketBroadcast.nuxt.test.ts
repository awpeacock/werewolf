import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWebSocketBroadcast } from '@/server/util/useWebSocketBroadcast';

import { stubGameActive, stubGamePending, stubVillager1 } from '@tests/unit/setup/stubs';

vi.unmock('@/server/util/useWebSocketBroadcast');

describe('useWebSocketBroadcast', async () => {
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
	const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	const broadcast = useWebSocketBroadcast();
	const clients = [
		{
			send: vi.fn(),
			close: vi.fn(),
		},
		{
			send: vi.fn(),
			close: vi.fn(),
		},
		{
			send: vi.fn().mockImplementation(() => {
				throw new Error('Send error');
			}),
			close: vi.fn(),
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should successfully open a WebSocket connection', () => {
		// This tests where the util has to setup the game key
		broadcast.open(clients[0], 'ABCD', '8a6b67d5-428e-412f-a681-003e0bd840ed');

		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining(
				'WebSocket opened for player ID 8a6b67d5-428e-412f-a681-003e0bd840ed (Game Code: ABCD)'
			)
		);
		// This tests for existing keys
		broadcast.open(clients[1], 'ABCD', '1bb99196-fca2-4431-bd9a-0e1d021aeb35');
		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining(
				'WebSocket opened for player ID 1bb99196-fca2-4431-bd9a-0e1d021aeb35 (Game Code: ABCD)'
			)
		);
	});

	it('should successfully send a message only to one specific player of a game', () => {
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGamePending,
			player: stubVillager1,
		};
		broadcast.send({ game: 'ABCD', player: '1bb99196-fca2-4431-bd9a-0e1d021aeb35' }, event);
		expect(clients[1].send).toHaveBeenCalled();
		expect(clients[0].send).not.toHaveBeenCalled();
	});

	it('should successfully send a message to all players of a game', () => {
		//TODO Change the event when we have a global event type
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameActive,
			player: stubVillager1,
		};
		broadcast.send({ game: 'ABCD' }, event);
		expect(clients[0].send).toHaveBeenCalled();
		expect(clients[1].send).toHaveBeenCalled();
	});

	it('should catch any errors sending an event and log them', () => {
		broadcast.open(clients[2], 'ABCD', '0f18f18b-e4e4-4a69-8093-8bc606db1f64');

		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameActive,
			player: stubVillager1,
		};
		expect(() => {
			broadcast.send({ game: 'ABCD', player: '0f18f18b-e4e4-4a69-8093-8bc606db1f64' }, event);
		}).not.toThrowError();
		expect(clients[2].send).toHaveBeenCalled();
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining(
				'WebSocket send failed - player ID 0f18f18b-e4e4-4a69-8093-8bc606db1f64 removed'
			)
		);
	});

	it('should simply ignore an event for a game not in the clients map', () => {
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameActive,
			player: stubVillager1,
		};
		expect(() => {
			broadcast.send({ game: 'EFGH' }, event);
		}).not.toThrowError();
		expect(clients[0].send).not.toHaveBeenCalled();
		expect(clients[1].send).not.toHaveBeenCalled();
		expect(spyWarn).toHaveBeenCalledWith(
			expect.stringContaining('Attempt to send event for an invalid game - EFGH')
		);
	});
});
