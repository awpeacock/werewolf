import { Role } from '@/types/enums';

export const stubNameDuplicate = 'Duplicate Name';
export const stubNameError = 'Error Name';

export const stubInvalidCodes = [
	{ code: null, error: 'code-required' },
	{ code: undefined, error: 'code-required' },
	{ code: '', error: 'code-required' },
	{ code: 'ABC', error: 'code-no-spaces' },
	{ code: 'ABCDE', error: 'code-max' },
	{ code: 'abcd', error: 'code-invalid' },
	{ code: 'AB-C', error: 'code-invalid' },
	{ code: 'A BC', error: 'code-no-spaces' },
	{ code: 'AB<1', error: 'code-invalid' },
	{ code: "AB'1", error: 'code-invalid' },
	{ code: 'AB,1', error: 'code-invalid' },
	{ code: 'AB;1', error: 'code-invalid' },
];

export const stubInvalidNicknames = [
	{ nickname: null, error: 'nickname-required' },
	{ nickname: undefined, error: 'nickname-required' },
	{ nickname: '', error: 'nickname-required' },
	{ nickname: 'Jim', error: 'nickname-min' },
	{ nickname: 'Jim James Jimmy Jameson', error: 'nickname-max' },
	{ nickname: 'Jim-Bob', error: 'nickname-invalid' },
	{ nickname: "Jim O'James", error: 'nickname-invalid' },
];

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
	nickname: 'Test Player 1',
	roles: [],
};
export const stubVillager2: Player = {
	id: '29cb873f-59d9-440c-a61a-0681ab9866fb',
	nickname: 'Test Player 2',
	roles: [],
};
export const stubVillager3: Player = {
	id: 'accd6ea8-8910-4744-add2-8068dd9e1f53',
	nickname: 'Test Player 3',
	roles: [],
};
export const stubVillager4: Player = {
	id: '4125e688-2ec2-42dc-b117-2abb72033357',
	nickname: 'Test Player 4',
	roles: [],
};
export const stubVillager5: Player = {
	id: '8b46c9b9-f33c-425e-8b7d-75ce630a8ea8',
	nickname: 'Test Player 5',
	roles: [],
};
export const stubVillager6: Player = {
	id: '6ab26b51-171f-4eba-8d01-c04b2f7d846f',
	nickname: 'Test Player 6',
	roles: [Role.VILLAGER],
};
export const stubVillager7: Player = {
	id: 'e0aa6035-f740-4480-8acc-5ab1c1e8312f',
	nickname: 'Test Player 7',
	roles: [Role.VILLAGER],
};
export const stubVillager8: Player = {
	id: '4fd5fc5b-d92e-48f5-be3d-213f07c3cfa6',
	nickname: 'Test Player 8',
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

export const stubVotesWolf1: Votes = {};
stubVotesWolf1[stubVillager8.id] = stubMayor.id;
stubVotesWolf1[stubMayor.id] = stubVillager8.id;
stubVotesWolf1[stubWolf.id] = stubVillager8.id;
stubVotesWolf1[stubHealer.id] = stubMayor.id;

export const stubVotesWolf2: Votes = {};
stubVotesWolf2[stubWolf.id] = stubHealer.id;
stubVotesWolf2[stubHealer.id] = stubMayor.id;

export const stubVotesComplete1: Votes = {};
stubVotesComplete1[stubMayor.id] = stubVillager8.id;
stubVotesComplete1[stubWolf.id] = stubHealer.id;
stubVotesComplete1[stubHealer.id] = stubWolf.id;
stubVotesComplete1[stubVillager6.id] = stubHealer.id;
stubVotesComplete1[stubVillager7.id] = stubVillager6.id;
stubVotesComplete1[stubVillager8.id] = stubHealer.id;

export const stubVotesComplete2: Votes = {};
stubVotesComplete2[stubMayor.id] = stubWolf.id;
stubVotesComplete2[stubWolf.id] = stubVillager7.id;
stubVotesComplete2[stubVillager7.id] = stubWolf.id;
stubVotesComplete2[stubVillager8.id] = stubWolf.id;

export const stubActivityWolfOnly: Activity = {
	wolf: stubVillager6.id,
	healer: null,
	votes: {},
};
export const stubActivityHealerOnly: Activity = {
	wolf: null,
	healer: stubVillager6.id,
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
export const stubActivitiesComplete: Array<Activity> = [
	{
		wolf: stubVillager7.id,
		healer: stubVillager7.id,
		votes: stubVotesComplete1,
		evicted: stubHealer.id,
	},
	{
		wolf: stubVillager6.id,
		votes: stubVotesComplete2,
		evicted: stubWolf.id,
	},
];

export const stubGameIdPutError = 'PUTF';
export const stubGameIdDuplicateError = 'DUPE';
export const stubGameIdUpdateError = 'UPDF';
export const stubGameIdUpdateErrorNight = 'UPDN';
export const stubGameIdUpdateErrorDay = 'UPDD';
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
	version: 1,
};
export const stubGamePending: Game = {
	id: 'C3D4',
	created: new Date(),
	active: false,
	players: [stubMayor],
	pending: [stubVillager1],
	version: 2,
};
export const stubGameInactive: Game = {
	id: 'E5F6',
	created: new Date(),
	active: false,
	players: [stubMayor, stubVillager1],
	activities: [],
	version: 3,
};
export const stubGameReady: Game = {
	id: 'G7H8',
	created: new Date(),
	active: false,
	players: [stubMayor, stubVillager1, stubVillager2, stubVillager3, stubVillager4, stubVillager5],
	activities: [],
	version: 10,
};
export const stubGameActive: Game = {
	id: 'I9J0',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [],
	version: 11,
};
export const stubGameWolfOnly: Game = {
	id: 'K0L9',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityWolfOnly],
	version: 12,
};
export const stubGameHealerOnly: Game = {
	id: 'M8N7',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityHealerOnly],
	version: 12,
};
export const stubGameIncompleteActivity: Game = {
	id: 'O6P5',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityNotSaved1],
	version: 13,
};
export const stubGameIncorrectVotes1: Game = {
	id: 'Q4R3',
	created: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityIncorrectVotes1],
	version: 14,
};
export const stubGameIncorrectVotes2: Game = {
	id: 'S2T1',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityIncorrectVotes2],
	version: 15,
};
export const stubGameCorrectVotes: Game = {
	id: 'U0V1',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityCorrectVotes],
	version: 16,
};
export const stubGameTie: Game = {
	id: 'W2X3',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityTie],
	version: 17,
};
export const stubGameDeadHealer: Game = {
	id: 'Y4Z5',
	created: new Date(),
	active: true,
	stage: 'night',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: [stubActivityDeadHealer],
	version: 18,
};
export const stubGameWolfWin: Game = {
	id: '6A7B',
	created: new Date(),
	started: new Date(),
	active: true,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	activities: stubActivitiesWolfWin,
	version: 19,
};
export const stubGameComplete: Game = {
	id: '8C9D',
	created: new Date(),
	started: new Date(),
	finished: new Date(),
	active: false,
	stage: 'day',
	players: [stubMayor, stubVillager6, stubVillager7, stubVillager8, stubWolf, stubHealer],
	pending: [],
	activities: stubActivitiesComplete,
	winner: 'village',
	version: 20,
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
	version: 1,
};
export const stubGameConcurrentRetry: Game = {
	id: stubGameIdConcurrentUpdateRetry,
	created: new Date(),
	active: false,
	players: [stubMayor, stubWolf, stubHealer, stubVillager6, stubVillager7, stubVillager8],
	pending: [stubVillager1],
	version: 1,
};

export const stubErrorCode: APIErrorResponse = {
	errors: [{ field: 'code', message: 'code-required' }],
};
export const stubErrorNickname: APIErrorResponse = {
	errors: [{ field: 'nickname', message: 'nickname-min' }],
};
export const stubErrorCodeAndNickname: APIErrorResponse = {
	errors: [
		{ field: 'code', message: 'code-required' },
		{ field: 'nickname', message: 'nickname-min' },
	],
};
