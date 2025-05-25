export const useBroadcastClient = () => {
	const config = useRuntimeConfig();
	let provider = config.public.BROADCAST_PROVIDER;
	if (!provider) {
		provider = 'websocket';
	}
	switch (provider) {
		case 'pusher':
			return usePusherClient();
		case 'websocket':
			return useWebSocketClient();
		default:
			throw new Error('Invalid Broadcast Client Option');
	}
};
