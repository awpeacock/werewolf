import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePusherBroadcast } from '@/server/util/usePusherBroadcast';

import {
	stubGameActive,
	stubGameNew,
	stubGamePending,
	stubMayor,
	stubVillager1,
} from '@tests/common/stubs';

const mockPusherInstance = {
	trigger: vi.fn(),
};
vi.mock('pusher', () => {
	return {
		default: vi.fn(() => mockPusherInstance),
	};
});

describe('usePusherBroadcast', async () => {
	const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should successfully send a message only to one specific player of a game', async () => {
		const event: JoinRequestEvent = {
			type: 'join-request',
			game: stubGamePending,
			player: stubVillager1,
		};
		const broadcast = usePusherBroadcast();
		await broadcast.send({ game: stubGamePending.id, player: stubMayor.id }, event);

		expect(mockPusherInstance.trigger).toHaveBeenCalledWith(
			`private-game-${stubGamePending.id}-player-${stubMayor.id}`,
			'game-event',
			event
		);
		expect(spyLog).toBeCalledWith(
			expect.stringContaining(
				`Event "join-request" broadcast for game ${stubGamePending.id} to player ${stubMayor.id}`
			)
		);
	});

	it('should successfully send a message to all players of a game', async () => {
		const event: MorningEvent = {
			type: 'morning',
			game: stubGameActive,
		};
		const broadcast = usePusherBroadcast();
		await broadcast.send({ game: stubGameActive.id }, event);

		expect(mockPusherInstance.trigger).toHaveBeenCalledWith(
			`private-game-${stubGameActive.id}`,
			'game-event',
			event
		);
		expect(spyLog).toBeCalledWith(
			expect.stringContaining(`Event "morning" broadcast for game ${stubGameActive.id}`)
		);
	});

	it('should throw an error trying to "open" a connection to a client (Pusher does all that for us)', () => {
		expect(() => {
			const broadcast = usePusherBroadcast();
			broadcast.open(
				{
					send: vi.fn(),
					close: vi.fn(),
				},
				stubGameNew.id,
				stubMayor.id
			);
		}).toThrowError();
	});
});
