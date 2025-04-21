import { Role } from '@/types/enums';
import { defineStore } from 'pinia';

let config: boolean | object = false;
if (useEnvironment().isClient()) {
	config = {
		key: 'game',
		storage: sessionStorage,
	};
}

export const useGameStore = defineStore('game', {
	state: (): Game => ({
		id: '',
		created: new Date(),
		active: false,
		players: [],
	}),
	actions: {
		set(game: Game) {
			this.$patch(game);
		},
	},
	getters: {
		invite(): string {
			const path = `/join/${this.id}`;
			if (this.mayor) {
				return `${path}?invite=${this.mayor.id}`;
			} else {
				return path;
			}
		},
		url(): string {
			return '/play/' + this.id;
		},
		mayor(): Nullable<Player> {
			for (const player of this.players) {
				if (player.role == Role.MAYOR) {
					return player;
				}
			}
			return null;
		},
	},
	persist: config,
});
