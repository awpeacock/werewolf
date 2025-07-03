import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useLogger } from '@/composables/useLogger';

const events: Ref<Array<GameEvent>> = ref([]);
const latest: Ref<Nullable<GameEvent>> = ref(null);
const requests: Ref<Array<JoinRequestEvent>> = ref([]);

let pusher: Nullable<Pusher> = null;
const channels: { [key: string]: Nullable<Channel> } = {
	public: null,
	private: null,
};

export function usePusherClient() {
	const config = useRuntimeConfig();

	const connect = (game: Game, player: Player) => {
		if (pusher) {
			useLogger().warn('Pusher client already connected');
			return;
		}

		pusher = new Pusher(config.public.PUSHER_APP_KEY as string, {
			cluster: config.public.PUSHER_CLUSTER as string,
			authEndpoint: '/api/pusher/auth',
		});

		pusher.connection.bind('connected', () => {
			useLogger().success('Pusher connected');

			channels.public = pusher!.subscribe(`private-game-${game.id}`);
			channels.private = pusher!.subscribe(`private-game-${game.id}-player-${player.id}`);

			channels.public.bind('game-event', (data: GameEvent) => {
				bind('game', data);
			});
			channels.private.bind('game-event', (data: GameEvent) => {
				bind('player', data);
			});
		});

		pusher.connection.bind('disconnected', () => {
			useLogger().info('Pusher disconnected');
			reset();
		});

		/* istanbul ignore next @preserve */
		pusher.connection.bind('error', (e: Error) => {
			useLogger().error('Pusher connection error', e);
		});
	};

	const bind = (type: string, data: GameEvent) => {
		useLogger().info(
			`${type.charAt(0).toUpperCase() + type.substring(1)} event received: ${data.type}`
		);

		latest.value = data;
		events.value.push(data);
		useLogger().info(events.value.length + ' message(s) received');

		handle(data);
	};

	const handle = (event: GameEvent) => {
		switch (event.type) {
			case 'join-request': {
				const request: JoinRequestEvent = event;
				requests.value.push(request);
				useLogger().info(`Join Request from "${request.player.nickname}" received`);
				break;
			}
		}
	};

	const remove = (type: string, data: Player) => {
		switch (type) {
			case 'join-request': {
				for (let i = 0; i < requests.value.length; i++) {
					if (requests.value[i].player.id === data.id) {
						requests.value.splice(i, 1);
						useLogger().info(`Join Request from "${data.nickname}" removed from queue`);
						break;
					}
				}
				break;
			}
		}
	};

	const disconnect = () => {
		if (pusher) {
			/* istanbul ignore next @preserve */
			pusher.unsubscribe(channels.public?.name ?? '');
			pusher.disconnect();
			reset();
		}
	};

	const reset = () => {
		pusher = null;
		channels.public = null;
		channels.private = null;
		events.value = [];
		latest.value = null;
		requests.value = [];
	};

	return {
		connect,
		remove,
		disconnect,
		reset,
		events,
		latest,
		requests,
	};
}
