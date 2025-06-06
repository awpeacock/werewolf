const socket: Ref<WebSocket | null> = ref(null);

const events = ref<Array<GameEvent>>([]);
const latest = ref<Nullable<GameEvent>>(null);
const requests = ref<Array<JoinRequestEvent>>([]);

export function useWebSocketClient() {
	const connect = (game: Game, player: Player) => {
		// We do not want to be creating multiple open sockets
		if (socket.value) {
			useLogger().warn('Attempt to open up a new WebSocket connection when already open');
			return;
		}

		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const url = `${protocol}://${window.location.host}/game?code=${game.id}&player=${player.id}`;
		socket.value = new WebSocket(url);

		socket.value.onopen = () => {
			useLogger().success('WebSocket connected');
		};

		socket.value.onmessage = (message) => {
			const event: GameEvent = JSON.parse(message.data);
			latest.value = event;
			events.value.push(event);
			handle(event);
			useLogger().info(`Event received: ${event.type}`);
			useLogger().info(events.value.length + ' message(s) received');
		};

		socket.value.onclose = () => {
			useLogger().info('WebSocket disconnected');
			socket.value = null;
		};
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
				for (let r = 0; r < requests.value.length; r++) {
					if (requests.value[r].player.id === (data as Player).id) {
						requests.value.splice(r, 1);
						useLogger().info(`Join Request from "${data.nickname}" removed from queue`);
						break;
					}
				}
				break;
			}
		}
	};

	const disconnect = () => {
		socket.value?.close();
	};

	const reset = () => {
		socket.value = null;
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
