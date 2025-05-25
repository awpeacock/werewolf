import { parse } from 'url';

import { useLogger } from '@/composables/useLogger';
import { useBroadcast } from '@/server/util/useBroadcast';

export default defineWebSocketHandler({
	open(peer) {
		const url = parse(peer.request.url, true);
		const code = url.query.code as Undefinable<string>;
		const player = url.query.player as Undefinable<string>;
		if (code && player) {
			useBroadcast().open(peer, code, player);
		} else {
			useLogger().error('WebSocket open request without game code or player');
			peer.close();
		}
	},

	message(peer, message) {
		useLogger().info(`Message received from ${peer.id} - "${message}"`);
	},

	error(peer, error) {
		useLogger().error(`WebSocket error for ${peer.id}`, error);
	},

	close(peer, event) {
		if (typeof event === 'string' || event instanceof String) {
			useLogger().info(`WebSocket closed for ${peer.id} - Reason: ${event}`);
		} else {
			useLogger().info(`WebSocket closed for ${peer.id} - Reason: ${JSON.stringify(event)}`);
		}
	},
});
