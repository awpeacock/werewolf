import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

import { Role } from '@/types/enums';

import {
	stubGameNew,
	stubGameReady,
	stubMayor,
	stubVillager1,
	stubVillager2,
	stubVillager3,
	stubVillager4,
} from '@tests/common/stubs';

const mockPusherInstance = {
	connection: {
		bind: vi.fn(),
		unbind: vi.fn(),
	},
	subscribe: vi.fn(() => {
		return {
			bind: vi.fn(),
			unbind: vi.fn(),
		};
	}),
	unsubscribe: vi.fn(),
	disconnect: vi.fn(),
};

vi.mock('pusher-js', () => {
	return {
		default: vi.fn(() => mockPusherInstance),
	};
});

describe('usePusherClient', async () => {
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
	const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
	const socket = usePusherClient();

	const triggerConnect = async (game: Game, player: Player): Promise<void> => {
		socket.connect(game, player);

		const callback = mockPusherInstance.connection.bind.mock.calls.find(
			([event]) => event === 'connected'
		)?.[1];
		if (callback) callback();
		await flushPromises();
	};

	const triggerJoinRequest = async (player: Player): Promise<JoinRequestEvent> => {
		const channel = mockPusherInstance.subscribe.mock.results[1].value;
		const gameEventCallback = channel.bind.mock.calls.find(
			([event]: GameEvent) => event === 'game-event'
		)?.[1];

		const event = {
			type: 'join-request',
			player: player,
			game: stubGameNew,
		} as JoinRequestEvent;
		if (gameEventCallback) gameEventCallback(event);
		await flushPromises();
		return event;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		usePusherClient().reset();
		spyLog.mockClear();
		spyInfo.mockClear();
		spyError.mockClear();
	});

	it('should successfully connect to Pusher', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Pusher connected'));
		expect(mockPusherInstance.subscribe).toHaveBeenCalledWith(`private-game-${stubGameNew.id}`);
		expect(mockPusherInstance.subscribe).toHaveBeenCalledWith(
			`private-game-${stubGameNew.id}-player-${stubMayor.id}`
		);
	});

	it('should handle any game events', async () => {
		const game = structuredClone(stubGameReady);
		await triggerConnect(game, stubVillager1);

		// Find the callback registered for 'game-event' on the public channel
		const channel = mockPusherInstance.subscribe.mock.results[0].value;
		const gameEventCallback = channel.bind.mock.calls.find(
			([event]: GameEvent) => event === 'game-event'
		)?.[1];

		// Simulate a start-game event
		const event = {
			type: 'start-game',
			game: stubGameReady,
			role: Role.WOLF,
		} as StartGameEvent;
		if (gameEventCallback) gameEventCallback(event);

		await flushPromises();
		expect(socket.latest.value).toEqual(event);
		expect(spyInfo).toHaveBeenCalledWith(
			expect.stringContaining('Game event received: start-game')
		);
	});

	it('should handle any player events', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		const event = await triggerJoinRequest(stubVillager2);

		expect(socket.latest.value).toEqual(event);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager2.nickname);
		expect(spyInfo).toHaveBeenCalledWith(
			expect.stringContaining(`Join Request from "${stubVillager2.nickname}" received`)
		);
	});

	it('should successfully remove join request messages from the queue', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		await triggerJoinRequest(stubVillager1);

		expect(socket.requests.value).toHaveLength(1);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager1.nickname);

		await triggerJoinRequest(stubVillager3);

		expect(spyInfo).toBeCalledWith(expect.stringContaining('2 message(s) received'));
		expect(socket.requests.value).toHaveLength(2);
		expect(socket.requests.value[1].player.nickname).toBe(stubVillager3.nickname);

		await triggerJoinRequest(stubVillager4);

		expect(spyInfo).toBeCalledWith(expect.stringContaining('3 message(s) received'));
		expect(socket.requests.value).toHaveLength(3);
		expect(socket.requests.value[2].player.nickname).toBe(stubVillager4.nickname);

		socket.remove('join-request', stubVillager3);

		expect(socket.requests.value).toHaveLength(2);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager1.nickname);
		expect(socket.requests.value[1].player.nickname).toBe(stubVillager4.nickname);
	});

	it('should ignore attempts to remove messages other than join requests from the queue', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		expect(() => {
			socket.remove('invite-accept', stubVillager3);
		}).not.toThrow();
	});

	it('should handle disconnecting from Pusher', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		socket.disconnect();
		await flushPromises();

		expect(mockPusherInstance.unsubscribe).toHaveBeenCalled();
		expect(mockPusherInstance.disconnect).toHaveBeenCalled();

		const callback = mockPusherInstance.connection.bind.mock.calls.find(
			([event]) => event === 'disconnected'
		)?.[1];
		if (callback) callback();

		await flushPromises();
		expect(spyInfo).toHaveBeenCalledWith(expect.stringContaining('Pusher disconnected'));
	});

	it('should handle any error events', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		const callback = mockPusherInstance.connection.bind.mock.calls.find(
			([event]) => event === 'error'
		)?.[1];
		const error = new Error('Test error');
		if (callback) callback(error);

		await flushPromises();
		expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Pusher connection error'));
	});

	it('should not attempt to connect if already connected', async () => {
		const game = structuredClone(stubGameNew);
		await triggerConnect(game, stubMayor);

		spyInfo.mockClear();

		socket.connect(game, stubMayor);
		expect(spyWarn).toHaveBeenCalledWith(
			expect.stringContaining('Pusher client already connected')
		);
		expect(spyInfo).not.toBeCalledWith(expect.stringContaining('Pusher connected'));
	});

	it('should not error if called to disconnect from a non-existent Pusher', async () => {
		expect(() => {
			socket.disconnect();
		}).not.toThrow();

		expect(mockPusherInstance.unsubscribe).not.toHaveBeenCalled();
		expect(mockPusherInstance.disconnect).not.toHaveBeenCalled();
	});
});
