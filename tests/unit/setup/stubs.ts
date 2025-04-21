import { Role } from '@/types/enums';

export const stubMayor: Player = {
	id: 'a1b2a483-79ec-4790-a440-73415f223de1',
	nickname: 'TestPlayer',
	role: Role.MAYOR,
};
export const stubVillager: Player = {
	id: '',
	nickname: 'Another Player',
	role: Role.VILLAGER,
};

export const stubInactiveGame: Game = {
	id: 'A1B2',
	created: new Date(),
	active: false,
	players: [stubMayor],
};
export const stubActiveGame: Game = {
	id: 'C3D4',
	created: new Date(),
	active: true,
	players: [stubMayor],
};
export const stubFailureGame: Game = {
	id: 'FAIL',
	created: new Date(),
	active: false,
	players: [],
};

export const stubNicknameError: APIErrorResponse = {
	errors: [{ field: 'nickname', message: 'nickname-min' }],
};
