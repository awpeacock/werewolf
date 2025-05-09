import { defineStore } from 'pinia';

let config: boolean | object = false;
if (useEnvironment().isClient()) {
	config = {
		key: 'player',
		storage: sessionStorage,
	};
}

export const usePlayerStore = defineStore('player', {
	state: (): Player => ({
		id: '',
		nickname: '',
		roles: [],
	}),
	actions: {
		set(player: Player) {
			this.$patch(player);
		},
	},
	persist: config,
});
