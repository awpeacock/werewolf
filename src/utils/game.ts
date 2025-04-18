// Passing the JSON back and forth, objects such as dates can (and
// WILL) be converted to strings - keeping it DRY, here's a utility method
// to clean it up
export const parseGame = (game: Game): Game => {
	game.created = new Date(game.created);
	return game;
};
