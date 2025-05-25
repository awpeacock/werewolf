import { usePusherBroadcast } from '@/server/util/usePusherBroadcast';
import { useWebSocketBroadcast } from '@/server/util/useWebSocketBroadcast';

export const useBroadcast = () => {
	const config = useRuntimeConfig();
	let provider = config.public.BROADCAST_PROVIDER;
	if (!provider) {
		provider = 'websocket';
	}
	switch (provider) {
		case 'pusher':
			return usePusherBroadcast();
		case 'websocket':
			return useWebSocketBroadcast();
		default:
			throw new Error('Invalid Broadcast Option');
	}
};
