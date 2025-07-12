export default defineNuxtPlugin(async (_nuxtApp) => {
	// Catch refreshes (or other unexpected activites) and "rehydrate" (to steal the Vue term)
	// the game and player from the session, if there (and make sure we're up to date with the
	// game while we're at it).
	const game = useGameStore();
	const player = usePlayerStore();

	try {
		if (game?.id) {
			useLogger().info(`Existing game found on session [${game.id}] - Retrieving state`);
			const latest = await useGame(game).getLatest();
			game.set(latest);
			useLogger().success('Game state successfully retrieved - session updated');

			if (player?.id) {
				useLogger().info(`Player found on session [${player.id}] - restoring WebSocket`);
				useBroadcastClient().connect(game, player);
			}
		}
	} catch (e) {
		useLogger().error('Unable to restore game/player state', e as Error);
	}
});
