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

export const stubVotesIncorrect1: Votes = {};
stubVotesIncorrect1[stubVillager7.id] = stubVillager6.id;
stubVotesIncorrect1[stubMayor.id] = stubVillager6.id;
stubVotesIncorrect1[stubWolf.id] = stubVillager6.id;
stubVotesIncorrect1[stubHealer.id] = stubVillager6.id;

export const stubVotesIncorrect2: Votes = {};
stubVotesIncorrect2[stubVillager6.id] = stubWolf.id;
stubVotesIncorrect2[stubMayor.id] = stubVillager6.id;
stubVotesIncorrect2[stubWolf.id] = stubVillager6.id;
stubVotesIncorrect2[stubHealer.id] = stubVillager6.id;

export const stubVotesCorrect: Votes = {};
stubVotesCorrect[stubVillager8.id] = stubWolf.id;
stubVotesCorrect[stubMayor.id] = stubVillager6.id;
stubVotesCorrect[stubWolf.id] = stubVillager6.id;
stubVotesCorrect[stubHealer.id] = stubWolf.id;

export const stubVotesTie: Votes = {};
stubVotesTie[stubVillager7.id] = stubHealer.id;
stubVotesTie[stubVillager8.id] = stubWolf.id;
stubVotesTie[stubMayor.id] = stubVillager6.id;
stubVotesTie[stubWolf.id] = stubVillager6.id;
stubVotesTie[stubHealer.id] = stubVillager7.id;

export const stubVotesDeadHealer: Votes = {};
stubVotesDeadHealer[stubVillager6.id] = stubVillager7.id;
stubVotesDeadHealer[stubVillager7.id] = stubWolf.id;
stubVotesDeadHealer[stubVillager8.id] = stubWolf.id;
stubVotesDeadHealer[stubMayor.id] = stubVillager6.id;
stubVotesDeadHealer[stubWolf.id] = stubVillager6.id;

export const stubVotesWolf1: Votes = {};
stubVotesWolf1[stubVillager8.id] = stubMayor.id;
stubVotesWolf1[stubMayor.id] = stubVillager8.id;
stubVotesWolf1[stubWolf.id] = stubVillager8.id;
stubVotesWolf1[stubHealer.id] = stubMayor.id;

export const stubVotesWolf2: Votes = {};
stubVotesWolf2[stubWolf.id] = stubHealer.id;
stubVotesWolf2[stubHealer.id] = stubVillager8.id;

export const stubActivityBlank: Activity = {
	wolf: null,
	healer: null,
	votes: {},
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
export const stubActivityIncorrectVotes1: Activity = {
	wolf: stubVillager8.id,
	healer: stubVillager7.id,
	votes: stubVotesIncorrect1,
};
export const stubActivityIncorrectVotes2: Activity = {
	wolf: stubVillager8.id,
	healer: stubVillager7.id,
	votes: stubVotesIncorrect2,
};
export const stubActivityCorrectVotes: Activity = {
	wolf: stubVillager7.id,
	healer: stubVillager8.id,
	votes: stubVotesCorrect,
};
export const stubActivityTie: Activity = {
	wolf: stubVillager7.id,
	healer: stubVillager7.id,
	votes: stubVotesTie,
};
export const stubActivityDeadHealer: Activity = {
	wolf: stubHealer.id,
	healer: stubVillager6.id,
	votes: stubVotesTie,
};
export const stubActivitiesWolfWin: Array<Activity> = [
	{
		wolf: stubVillager7.id,
		healer: stubVillager8.id,
		votes: stubVotesIncorrect1,
		evicted: stubVillager6.id,
	},
	{
		wolf: stubVillager8.id,
		healer: stubVillager8.id,
		votes: stubVotesWolf1,
		evicted: null,
	},
	{
		wolf: stubVillager8.id,
		healer: stubWolf.id,
		votes: stubVotesWolf2,
	},
];

export const stubGameIdPutError = 'PUTF';
export const stubGameIdDuplicateError = 'DUPE';
export const stubGameIdUpdateError = 'UPDF';
export const stubGameIdConcurrentUpdateError = 'CONC';
export const stubGameIdConcurrentUpdateRetry = 'RETR';
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
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityNotSaved1],
};
export const stubGameIncorrectVotes1: Game = {
	id: 'M8N7',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityIncorrectVotes1],
};
export const stubGameIncorrectVotes2: Game = {
	id: 'M8N7',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityIncorrectVotes2],
};
export const stubGameCorrectVotes: Game = {
	id: 'O6P5',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityCorrectVotes],
};
export const stubGameTie: Game = {
	id: 'Q4R3',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityTie],
};
export const stubGameDeadHealer: Game = {
	id: 'S2T1',
	created: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityDeadHealer],
};
export const stubGameWolfWin: Game = {
	id: 'U0V1',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: stubActivitiesWolfWin,
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
export const stubGameConcurrentFailure: Game = {
	id: stubGameIdConcurrentUpdateError,
	created: new Date(),
	active: false,
	players: [stubMayor, stubWolf, stubHealer, stubVillager6, stubVillager7, stubVillager8],
	pending: [stubVillager1],
};
export const stubGameConcurrentRetry: Game = {
	id: stubGameIdConcurrentUpdateRetry,
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
