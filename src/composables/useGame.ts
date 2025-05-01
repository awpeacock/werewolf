import { Role } from '@/types/enums';

export const useGame = (game: Game) => {
	const parse = (): Game => {
		game.created = new Date(game.created);
		return game;
	};

	const mayor = (): Nullable<Player> => {
		for (const player of game.players) {
			if (player.role == Role.MAYOR) {
				return player;
			}
		}
		return null;
	};

	const findPlayer = (nickname: string): Nullable<Player> => {
		for (const player of game.players) {
			if (player.nickname === nickname) {
				return player;
			}
		}
		if (game.pending) {
			for (const player of game.pending) {
				if (player.nickname === nickname) {
					return player;
				}
			}
		}
		return null;
	};

	const hasPlayer = (nickname: string): boolean => {
		return findPlayer(nickname) !== null;
	};

	const isPlayerAdmitted = (nickname: string): boolean => {
		for (const player of game.players) {
			if (player.nickname == nickname) {
				return true;
			}
		}
		return false;
	};

	return {
		parse,
		mayor,
		findPlayer,
		hasPlayer,
		isPlayerAdmitted,
	};
};
