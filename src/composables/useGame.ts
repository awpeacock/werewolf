import { BlankActivity } from '@/types/constants';
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
			const latest = useGame(response).parse();
			return latest;
		} catch (e) {
			throw new Error(`Unable to retrieve game "${game.id}"`, e as Error);
		}
	};

	const getMayor = (): Nullable<Player> => {
		for (const player of game.players) {
			if (player.roles.includes(Role.MAYOR)) {
				return player;
			}
		}
		return null;
	};

	const getWolf = (): Nullable<Player> => {
		for (const player of game.players) {
			if (player.roles.includes(Role.WOLF)) {
				return player;
			}
		}
		return null;
	};

	const getHealer = (): Nullable<Player> => {
		for (const player of game.players) {
			if (player.roles.includes(Role.HEALER)) {
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

	const isPlayerDead = (identifier: string): boolean => {
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
	};

	const getDeadPlayers = (): Array<Player> => {
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
	};

	const isPlayerEvicted = (identifier: string): boolean => {
		if (!game.activities) {
			return false;
		}
		const player = findPlayer(identifier);
		for (const activity of game.activities) {
			if (player!.id === activity.evicted) {
				return true;
			}
		}
		return false;
	};

	const wasPlayerEvicted = (identifier: string): boolean => {
		if (!game.activities || game.activities.length === 0) {
			return false;
		}
		const player = findPlayer(identifier);
		let activity = game.activities.at(-1);
		// Race conditions might mean this is being tested AFTER
		// the new activity has been injected which would give a
		// false negative
		if (!isActivityComplete(activity!)) {
			if (game.activities.length > 1) {
				activity = game.activities.at(-2);
			} else {
				return false;
			}
		}
		if (player!.id === activity!.evicted) {
			return true;
		}
		return false;
	};

	const getEvictedPlayers = (): Array<Player> => {
		if (!game.activities) {
			return [];
		}
		const players: Array<Player> = [];
		for (const activity of game.activities) {
			if (activity.votes) {
				const evicted: Nullable<Player> = activity.evicted
					? findPlayer(activity.evicted!)
					: null;
				if (evicted) {
					players.push(evicted);
				}
			}
		}
		return players;
	};

	const getAlivePlayers = (): Array<Player> => {
		const dead = new Set(getDeadPlayers());
		const evicted = new Set(getEvictedPlayers());
		const alive = game.players.filter((player) => !dead.has(player) && !evicted.has(player));
		return alive;
	};

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
			const activity: Activity = structuredClone(BlankActivity);
			game.activities = [activity];
			return activity;
		}
		const latest: Activity = game.activities.at(-1)!;
		if (!isActivityComplete(latest)) {
			return latest;
		}
		const activity: Activity = structuredClone(BlankActivity);
		game.activities.push(activity);
		return activity;
	};

	const isActivityComplete = (activity: Activity): boolean => {
		if (activity!.wolf === null || activity!.wolf === undefined) {
			return false;
		}
		// Important check - if the healer gets killed or evicted, then marking
		// an activity as incomplete if they haven't made a choice will always
		// return false
		const healer = getHealer();
		if (healer && !isPlayerEvicted(healer.id) && !isPlayerDead(healer.id)) {
			if (activity!.healer === null || activity!.healer === undefined) {
				return false;
			}
		}
		if (activity!.votes === undefined) {
			return false;
		}
		if (Object.keys(activity!.votes).length < getAlivePlayers().length) {
			return false;
		}
		return true;
	};

	return {
		parse,
		getLatest,
		getMayor,
		getWolf,
		getHealer,
		findPlayer,
		hasPlayer,
		isPlayerAdmitted,
		isPlayerDead,
		getDeadPlayers,
		isPlayerEvicted,
		wasPlayerEvicted,
		getEvictedPlayers,
		getAlivePlayers,
		admitPlayer,
		removePlayer,
		getCurrentActivity,
		isActivityComplete,
	};
};
