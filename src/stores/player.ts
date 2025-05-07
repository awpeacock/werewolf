import { defineStore } from 'pinia';

import { Role } from '@/types/enums';

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
		role: Role.VILLAGER,
	}),
	actions: {
		set(player: Player) {
			this.$patch(player);
		},
	},
	persist: config,
});
