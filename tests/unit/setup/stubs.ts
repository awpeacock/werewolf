import { Role } from '@/types/enums';

export const stubPlayerBlank: Player = {
	id: '',
	nickname: '',
	roles: [],
};
export const stubMayor: Player = {
	id: 'a1b2a483-79ec-4790-a440-73415f223de1',
	nickname: 'Test Mayor',
	roles: [Role.MAYOR],
};
export const stubVillager1: Player = {
	id: 'e693e18c-f4a0-4012-8127-09db32207ab9',
	nickname: 'Test Villager 1',
	roles: [],
};
export const stubVillager2: Player = {
	id: '29cb873f-59d9-440c-a61a-0681ab9866fb',
	nickname: 'Test Villager 2',
	roles: [],
};
export const stubVillager3: Player = {
	id: 'accd6ea8-8910-4744-add2-8068dd9e1f53',
	nickname: 'Test Villager 3',
	roles: [],
};
export const stubVillager4: Player = {
	id: '4125e688-2ec2-42dc-b117-2abb72033357',
	nickname: 'Test Villager 4',
	roles: [],
};
export const stubVillager5: Player = {
	id: '8b46c9b9-f33c-425e-8b7d-75ce630a8ea8',
	nickname: 'Test Villager 5',
	roles: [],
};
export const stubVillager6: Player = {
	id: '6ab26b51-171f-4eba-8d01-c04b2f7d846f',
	nickname: 'Test Villager 6',
	roles: [Role.VILLAGER],
};
export const stubVillager7: Player = {
	id: 'e0aa6035-f740-4480-8acc-5ab1c1e8312f',
	nickname: 'Test Villager 7',
	roles: [Role.VILLAGER],
};
export const stubVillager8: Player = {
	id: '4fd5fc5b-d92e-48f5-be3d-213f07c3cfa6',
	nickname: 'Test Villager 8',
	roles: [Role.VILLAGER],
};
export const stubWolf: Player = {
	id: 'a197c842-e5da-44bf-8b63-ff2ba9d1ae3f',
	nickname: 'Test Wolf',
	roles: [Role.WOLF],
};
export const stubHealer: Player = {
	id: '7a2b0054-e1be-41da-bdca-e0de4153dc90',
	nickname: 'Test Healer',
	roles: [Role.HEALER],
};

export const stubVotes1: Array<Vote> = [
	{ stubVillager6: stubVillager8.id },
	{ stubVillager8: stubVillager6.id },
	{ stubMayor: stubVillager6.id },
	{ stubWolf: stubVillager6.id },
	{ stubHealer: stubVillager6.id },
];

export const stubActivityBlank: Activity = {
	wolf: null,
	healer: null,
	votes: [],
};
export const stubActivitySaved1: Activity = {
	wolf: stubVillager6.id,
	healer: stubVillager6.id,
};
export const stubActivitySaved2: Activity = {
	wolf: stubVillager6.id,
	healer: stubVillager6.id,
};
export const stubActivityNotSaved1: Activity = {
	wolf: stubVillager6.id,
	healer: stubVillager7.id,
};
export const stubActivityNotSaved2: Activity = {
	wolf: stubVillager8.id,
	healer: stubVillager7.id,
};
export const stubActivityVoted1: Activity = {
	wolf: stubVillager8.id,
	healer: stubVillager7.id,
	votes: stubVotes1,
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
	activities: [],
};
export const stubGameReady: Game = {
	id: 'G7H8',
	created: new Date(),
	active: false,
	players: [stubMayor, stubVillager1, stubVillager2, stubVillager3, stubVillager4, stubVillager5],
	activities: [],
};
export const stubGameActive: Game = {
	id: 'I9J0',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [],
};
export const stubGameIncompleteActivity: Game = {
	id: 'K0L9',
	created: new Date(),
	active: true,
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityNotSaved1],
};
export const stubGameCompleteActivity: Game = {
	id: 'M8N7',
	created: new Date(),
	active: true,
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityVoted1],
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
	players: [stubMayor, stubWolf, stubHealer, stubVillager6, stubVillager7, stubVillager8],
	pending: [stubVillager1],
};

export const stubErrorCode: APIErrorResponse = {
	errors: [{ field: 'code', message: 'code-required' }],
};
export const stubErrorNickname: APIErrorResponse = {
	errors: [{ field: 'nickname', message: 'nickname-min' }],
};
