import { Role } from '@/types/enums';
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
	getters: {
		role(): string {
			if (this.roles.includes(Role.WOLF)) {
				return 'wolf';
			} else if (this.roles.includes(Role.HEALER)) {
				return 'healer';
			} else {
				return 'villager';
			}
		},
	},
	actions: {
		set(player: Player) {
			this.$patch(player);
		},
		addRole(role: Role) {
			this.roles.push(role);
		},
	},
	persist: config,
});
