import { useLogger } from '@/composables/useLogger';

const clients = new Map<string, Map<string, WebSocketClient>>();

export const useWebSocketBroadcast = () => {
	const open = (client: WebSocketClient, game: string, player: string) => {
		// Group clients by game code, and then store by player ID
		// (for targeted broadcasts)
		if (!clients.has(game)) {
			clients.set(game, new Map<string, WebSocketClient>());
		}
		clients.get(game)!.set(player, client);
		useLogger().info(`WebSocket opened for player ID ${player} (Game Code: ${game})`);
	};

	const send = async (
		target: { game: string; player?: string },
		event: GameEvent
	): Promise<void> => {
		// Regardless of whether they're targeted at a specific player,
		// ALL broadcasts will be restricted to each individual game
		const game = clients.get(target.game);
		if (game) {
			game.forEach((client, id) => {
				if (target.player && target.player !== id) {
					return;
				}
				// Nitro's OOB give us no way of checking the connection state of
				// a client, so we have to assume it's available and if it errors
				// then we remove from the Map
				try {
					client.send(JSON.stringify(event));
				} catch (e) {
					game.delete(id);
					useLogger().error(
						`WebSocket send failed - player ID ${id} removed`,
						e as Error
					);
				}
			});
		} else {
			useLogger().warn(`Attempt to send event for an invalid game - ${target.game}`);
		}
	};

	return {
		open,
		send,
	};
};
