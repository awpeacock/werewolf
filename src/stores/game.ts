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
		url(game: Game): string {
			return '/play/' + game.id;
		},
	},
	persist: config,
});
