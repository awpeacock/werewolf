import { Role } from '@/types/enums';

export const useGame = (game: Game) => {
	const parse = (): Game => {
		game.created = new Date(game.created);
		return game;
	};

	const getLatest = async (): Promise<Game> => {
		try {
			const api = `/api/games/${game.id}/`;
			const response: Game = await $fetch<Game>(api, { method: 'GET' });
			game = useGame(response).parse();
			return game;
		} catch (e) {
			throw new Error('Unable to retrieve game', e as Error);
		}
	};

	const mayor = (): Nullable<Player> => {
		for (const player of game.players) {
			if (player.roles.includes(Role.MAYOR)) {
				return player;
			}
		}
		return null;
	};

	const findPlayer = (identifier: string): Nullable<Player> => {
		for (const player of game.players) {
			if (player.nickname === identifier || player.id === identifier) {
				return player;
			}
		}
		if (game.pending) {
			for (const player of game.pending) {
				if (player.nickname === identifier || player.id === identifier) {
					return player;
				}
			}
		}
		return null;
	};

	const hasPlayer = (identifier: string): boolean => {
		return findPlayer(identifier) !== null;
	};

	const isPlayerAdmitted = (identifier: string): boolean => {
		for (const player of game.players) {
			if (player.nickname == identifier || player.id === identifier) {
				return true;
			}
		}
		return false;
	};

	const isPlayerDead = (identifier: string): Ref<boolean> =>
		computed(() => {
			if (!game.activities) {
				return false;
			}
			const player = findPlayer(identifier);
			for (const activity of game.activities) {
				if (activity.wolf && activity.healer && activity.wolf !== activity.healer) {
					if (player?.id === activity.wolf || player?.nickname === activity.wolf) {
						return true;
					}
				}
			}
			return false;
		});

	const getDeadPlayers = (): Ref<Array<Player>> =>
		computed(() => {
			if (!game.activities) {
				return [];
			}
			const players: Array<Player> = [];
			for (const activity of game.activities) {
				if (activity.wolf && activity.healer && activity.wolf !== activity.healer) {
					players.push(findPlayer(activity.wolf)!);
				}
			}
			return players;
		});

	const getAlivePlayers = (): Ref<Array<Player>> =>
		computed(() => {
			const dead = new Set(getDeadPlayers().value);
			return game.players.filter((player) => !dead.has(player));
		});

	const admitPlayer = (identifier: string): Game => {
		if (!game.pending) {
			throw new Error('Attempt to admit player from an empty pending list');
		}
		for (let p = 0; p < game.pending.length; p++) {
			const player = game.pending[p];
			if (player.nickname === identifier || player.id === identifier) {
				game.players.push(player);
				game.pending.splice(p, 1);
				return game;
			}
		}
		throw new Error('Attempt to admit player that is not on pending list');
	};

	const removePlayer = (identifier: string): Game => {
		if (!game.pending) {
			throw new Error('Attempt to remove player from an empty pending list');
		}
		for (let p = 0; p < game.pending.length; p++) {
			const player = game.pending[p];
			if (player.nickname === identifier || player.id === identifier) {
				game.pending.splice(p, 1);
				return game;
			}
		}
		throw new Error('Attempt to remove player that is not on pending list');
	};

	const getCurrentActivity = (): Activity => {
		if (!game.activities || game.activities.length == 0) {
			return { wolf: null, healer: null, votes: [] };
		}
		const latest: Activity = game.activities.at(-1)!;
		if (
			latest!.wolf === null ||
			latest!.healer === null ||
			latest!.votes === undefined ||
			latest!.votes?.length < getAlivePlayers().value.length
		) {
			return latest;
		}
		return { wolf: null, healer: null, votes: [] };
	};

	return {
		parse,
		getLatest,
		mayor,
		findPlayer,
		hasPlayer,
		isPlayerAdmitted,
		isPlayerDead,
		getDeadPlayers,
		getAlivePlayers,
		admitPlayer,
		removePlayer,
		getCurrentActivity,
	};
};
