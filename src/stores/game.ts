import { defineStore } from 'pinia';

import { useGame } from '@/composables/useGame';

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
		pending: [],
	}),
	actions: {
		set(game: Game) {
			this.$patch(game);
		},
		findPlayer(nickname: string): Nullable<Player> {
			return useGame(this).findPlayer(nickname);
		},
		hasPlayer(nickname: string): boolean {
			return useGame(this).hasPlayer(nickname);
		},
		isPlayerAdmitted(nickname: string): boolean {
			return useGame(this).isPlayerAdmitted(nickname);
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
			if (this.id.trim().length === 4) {
				return '/play/' + this.id;
			} else {
				return '';
			}
		},
		mayor(): Nullable<Player> {
			return useGame(this).mayor();
		},
	},
	persist: config,
});
