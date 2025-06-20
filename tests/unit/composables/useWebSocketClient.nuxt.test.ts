import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

import {
	stubGameNew,
	stubMayor,
	stubVillager1,
	stubVillager2,
	stubVillager3,
} from '@tests/common/stubs';
import { MockWebSocket } from '@tests/unit/setup/websocket';

describe('useWebSocketClient', async () => {
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
	const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const socket = useWebSocketClient();

	beforeEach(() => {
		MockWebSocket.instances = [];
	});

	afterEach(() => {
		useWebSocketClient().reset();
		spyLog.mockClear();
		spyWarn.mockClear();
	});

	it('should successfully connect to the server', async () => {
		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('WebSocket connected'));
		const mockInstance = MockWebSocket.instances.at(-1);
		expect(mockInstance!.url).toEqual(
			`ws://localhost:3000/game?code=${game.id}&player=${stubMayor.id}`
		);
	});

	it('should successfully connect to a secure server', async () => {
		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				protocol: 'https:',
				host: 'domain',
			},
			writable: true,
		});

		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('WebSocket connected'));
		const mockInstance = MockWebSocket.instances.at(-1);
		expect(mockInstance!.url).toEqual(
			`wss://domain/game?code=${game.id}&player=${stubMayor.id}`
		);
	});

	it('should warn if an attempt is made to connect with an already active socket', async () => {
		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		expect(spyLog).toBeCalledWith(expect.stringContaining('WebSocket connected'));
		socket.connect(game, stubMayor);
		await flushPromises();

		expect(spyWarn).toBeCalledWith(
			expect.stringContaining(
				'Attempt to open up a new WebSocket connection when already open'
			)
		);
	});

	it('should successfully receive join request messages', async () => {
		vi.stubGlobal('WebSocket', MockWebSocket);

		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		const mockInstance = MockWebSocket.instances.at(-1);
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameNew,
			player: stubVillager1,
		};
		mockInstance!.onmessage?.({
			data: JSON.stringify(event),
		} as MessageEvent);
		await flushPromises();

		expect(spyLog).toBeCalledWith(expect.stringContaining('1 message(s) received'));
		const expected = structuredClone(event);
		expected.game.created = JSON.stringify(expected.game.created).replaceAll('"', '');
		expect(socket.latest.value).toEqual(expected);
		expect(socket.requests.value).toHaveLength(1);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager1.nickname);
	});

	it('should successfully receive admission response messages', async () => {
		vi.stubGlobal('WebSocket', MockWebSocket);

		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		const mockInstance = MockWebSocket.instances.at(-1);
		const event: AdmissionEvent = {
			type: 'admission',
			game: stubGameNew,
			response: false,
		};
		mockInstance!.onmessage?.({
			data: JSON.stringify(event),
		} as MessageEvent);
		await flushPromises();

		expect(spyLog).toBeCalledWith(expect.stringContaining('1 message(s) received'));
		const expected = structuredClone(event);
		expected.game.created = JSON.stringify(expected.game.created).replaceAll('"', '');
		expect(socket.latest.value).toEqual(expected);
		expect(socket.requests.value).toHaveLength(0);
	});

	it('should successfully remove join request messages from the queue', async () => {
		vi.stubGlobal('WebSocket', MockWebSocket);

		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();

		const mockInstance = MockWebSocket.instances.at(-1);
		const event1: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameNew,
			player: stubVillager1,
		};
		mockInstance!.onmessage?.({
			data: JSON.stringify(event1),
		} as MessageEvent);
		await flushPromises();

		expect(socket.requests.value).toHaveLength(1);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager1.nickname);

		const event2: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameNew,
			player: stubVillager2,
		};
		mockInstance!.onmessage?.({
			data: JSON.stringify(event2),
		} as MessageEvent);
		await flushPromises();

		expect(spyLog).toBeCalledWith(expect.stringContaining('2 message(s) received'));
		expect(socket.requests.value).toHaveLength(2);
		expect(socket.requests.value[1].player.nickname).toBe(stubVillager2.nickname);

		const event3: JoinRequestEvent = {
			type: 'join-request',
			game: stubGameNew,
			player: stubVillager3,
		};
		mockInstance!.onmessage?.({
			data: JSON.stringify(event3),
		} as MessageEvent);
		await flushPromises();

		expect(spyLog).toBeCalledWith(expect.stringContaining('3 message(s) received'));
		expect(socket.requests.value).toHaveLength(3);
		expect(socket.requests.value[2].player.nickname).toBe(stubVillager3.nickname);

		socket.remove('join-request', stubVillager2);

		expect(socket.requests.value).toHaveLength(2);
		expect(socket.requests.value[0].player.nickname).toBe(stubVillager1.nickname);
		expect(socket.requests.value[1].player.nickname).toBe(stubVillager3.nickname);
	});

	it('should successfully disconnect and close the socket', async () => {
		const game = structuredClone(stubGameNew);
		socket.connect(game, stubMayor);
		await flushPromises();
		socket.disconnect();
		await flushPromises();

		expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('WebSocket disconnected'));
		spyLog.mockClear();
	});
});
