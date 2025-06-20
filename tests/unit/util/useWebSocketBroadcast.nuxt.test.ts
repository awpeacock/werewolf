import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWebSocketBroadcast } from '@/server/util/useWebSocketBroadcast';

import {
	stubGameActive,
	stubGamePending,
	stubMayor,
	stubVillager1,
	stubVillager3,
} from '@tests/common/stubs';

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
		broadcast.open(clients[0], stubGamePending.id, stubVillager1.id);

		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining(
				`WebSocket opened for player ID ${stubVillager1.id} (Game Code: ${stubGamePending.id})`
			)
		);
		// This tests for existing keys
		broadcast.open(clients[1], stubGamePending.id, stubMayor.id);
		expect(spyLog).toHaveBeenCalledWith(
			expect.stringContaining(
				`WebSocket opened for player ID ${stubMayor.id} (Game Code: ${stubGamePending.id})`
			)
		);
	});

	it('should successfully send a message only to one specific player of a game', () => {
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGamePending,
			player: stubVillager1,
		};
		broadcast.send({ game: stubGamePending.id, player: stubMayor.id }, event);
		expect(clients[1].send).toHaveBeenCalled();
		expect(clients[0].send).not.toHaveBeenCalled();
	});

	it('should successfully send a message to all players of a game', () => {
		const event: MorningEvent = {
			type: 'morning',
			game: stubGamePending,
		};
		broadcast.send({ game: stubGamePending.id }, event);
		expect(clients[0].send).toHaveBeenCalled();
		expect(clients[1].send).toHaveBeenCalled();
	});

	it('should catch any errors sending an event and log them', () => {
		broadcast.open(clients[2], stubGamePending.id, stubVillager3.id);

		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGamePending,
			player: stubVillager1,
		};
		expect(() => {
			broadcast.send({ game: stubGamePending.id, player: stubVillager3.id }, event);
		}).not.toThrowError();
		expect(clients[2].send).toHaveBeenCalled();
		expect(spyError).toHaveBeenCalledWith(
			expect.stringContaining(`WebSocket send failed - player ID ${stubVillager3.id} removed`)
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
