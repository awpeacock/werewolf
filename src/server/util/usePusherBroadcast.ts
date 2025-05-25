import Pusher from 'pusher';

import { useLogger } from '@/composables/useLogger';

export const usePusherBroadcast = () => {
	const config = useRuntimeConfig();
	const pusher = new Pusher({
		appId: config.public.PUSHER_APP_ID as string,
		key: config.public.PUSHER_APP_KEY as string,
		secret: config.PUSHER_APP_SECRET as string,
		cluster: config.public.PUSHER_CLUSTER as string,
		useTLS: true,
	});

	const open = (_client: WebSocketClient, _game: string, _player: string) => {
		throw new Error(
			'Attempt to "open" a Pusher connection via the server - clients should speak directly to Pusher'
		);
	};

	const send = async (
		target: { game: string; player?: string },
		event: GameEvent
	): Promise<void> => {
		if (target.player) {
			const channel = `private-game-${target.game}-player-${target.player}`;
			await pusher.trigger(channel, 'game-event', event);
			useLogger().info(
				`Event "${event.type}" broadcast for game ${target.game} to player ${target.player}`
			);
		} else {
			const channel = `private-game-${target.game}`;
			await pusher.trigger(channel, 'game-event', event);
			useLogger().info(`Event "${event.type}" broadcast for game ${target.game}`);
		}
	};

	return {
		open,
		send,
	};
};
