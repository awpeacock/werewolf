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
		started: undefined,
		finished: undefined,
		active: false,
		stage: undefined,
		players: [],
		pending: [],
		activities: [],
		winner: undefined,
	}),
	actions: {
		set(game: Game) {
			this.$patch(game);
		},
		findPlayer(identifier: string): Nullable<Player> {
			return useGame(this).findPlayer(identifier);
		},
		hasPlayer(identifier: string): boolean {
			return useGame(this).hasPlayer(identifier);
		},
		isPlayerAdmitted(identifier: string): boolean {
			return useGame(this).isPlayerAdmitted(identifier);
		},
	},
	getters: {
		invite(): string {
			const path = `/join/${this.id}`;
			/* istanbul ignore else @preserve */
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
			return useGame(this).getMayor();
		},
		wolf(): Nullable<Player> {
			return useGame(this).getWolf();
		},
		healer(): Nullable<Player> {
			return useGame(this).getHealer();
		},
	},
	persist: config,
});
