import { Role } from '@/types/enums';

export const stubPlayerBlank: Player = {
	id: '',
	nickname: '',
	role: Role.VILLAGER,
};
export const stubMayor: Player = {
	id: 'a1b2a483-79ec-4790-a440-73415f223de1',
	nickname: 'Test Mayor',
	role: Role.MAYOR,
};
export const stubVillager1: Player = {
	id: 'e693e18c-f4a0-4012-8127-09db32207ab9',
	nickname: 'Test Villager 1',
	role: Role.VILLAGER,
};
export const stubVillager2: Player = {
	id: '29cb873f-59d9-440c-a61a-0681ab9866fb',
	nickname: 'Test Villager 2',
	role: Role.VILLAGER,
};
export const stubVillager3: Player = {
	id: 'accd6ea8-8910-4744-add2-8068dd9e1f53',
	nickname: 'Test Villager 3',
	role: Role.VILLAGER,
};

export const stubGameIdPutError = 'PUTF';
export const stubGameIdDuplicateError = 'DUPE';
export const stubGameIdUpdateError = 'UPDF';
export const stubGameIdGetError = 'GETF';
export const stubGameIdNotFound = 'NONE';

export const stubGameBlank: Game = {
	id: '',
	created: new Date(),
	active: false,
	players: [],
};
export const stubGameNew: Game = {
	id: 'A1B2',
	created: new Date(),
	active: false,
	players: [stubMayor],
};
export const stubGamePending: Game = {
	id: 'C3D4',
	created: new Date(),
	active: false,
	players: [stubMayor],
	pending: [stubVillager1],
};
export const stubGameInactive: Game = {
	id: 'E5F6',
	created: new Date(),
	active: false,
	players: [stubMayor, stubVillager1],
};
export const stubGameActive: Game = {
	id: 'G7H8',
	created: new Date(),
	active: true,
	players: [stubMayor],
};
export const stubGamePutFailure: Game = {
	id: stubGameIdPutError,
	created: new Date(),
	active: false,
	players: [],
};
export const stubGameUpdateFailure: Game = {
	id: stubGameIdUpdateError,
	created: new Date(),
	active: false,
	players: [stubMayor],
	pending: [stubVillager1],
};

export const stubErrorCode: APIErrorResponse = {
	errors: [{ field: 'code', message: 'code-required' }],
};
export const stubErrorNickname: APIErrorResponse = {
	errors: [{ field: 'nickname', message: 'nickname-min' }],
};
