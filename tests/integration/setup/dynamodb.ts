import { DynamoDBServiceException } from '@aws-sdk/client-dynamodb';

import {
	stubActivitySaved1,
	stubGameActive,
	stubGameCorrectVotes,
	stubGameHealerOnly,
	stubGameIdGetError,
	stubGameIdUpdateError,
	stubGameIdUpdateErrorDay,
	stubGameIdUpdateErrorNight,
	stubGameInactive,
	stubGameIncompleteActivity,
	stubGameIncorrectVotes1,
	stubGameNew,
	stubGamePending,
	stubGameReady,
	stubGameTie,
	stubGameUpdateFailure,
	stubGameWolfOnly,
	stubGameWolfWin,
	stubNameDuplicate,
	stubNameError,
} from '@tests/common/stubs';

class ConditionalCheckFailedException extends DynamoDBServiceException {
	constructor(message: string) {
		super({
			name: 'ConditionalCheckFailedException',
			$fault: 'client',
			message,
			$metadata: {},
		});
	}
}

let count = 0;

export const getDynamoMock = () => {
	const dynamo: DynamoDBWrapper = {
		put: async (game: Game) => {
			const nickname = game.players.at(0)!.nickname;
			if (nickname === stubNameError) {
				throw new Error('Simulated "put" failure');
			}
			if (nickname.startsWith(stubNameDuplicate)) {
				const amount = parseInt(nickname.slice(-1));
				if (count++ < amount) {
					throw new ConditionalCheckFailedException('Simulated unique "put" failure');
				} else {
					count = 0;
				}
			}
		},
		update: async (game: Game) => {
			if (
				game.id === stubGameIdUpdateError ||
				game.id === stubGameIdUpdateErrorNight ||
				game.id === stubGameIdUpdateErrorDay
			) {
				throw new Error('Simulated "put" failure');
			}
		},
		get: async (id: string) => {
			switch (id) {
				case stubGameIdGetError: {
					throw new Error('Simulated "get" failure');
				}
				case stubGameIdUpdateError: {
					return structuredClone(stubGameUpdateFailure);
				}
				case stubGameIdUpdateErrorNight: {
					const game = structuredClone(stubGameUpdateFailure);
					game.id = stubGameIdUpdateErrorNight;
					game.active = true;
					game.stage = 'night';
					return game;
				}
				case stubGameIdUpdateErrorDay: {
					const game = structuredClone(stubGameUpdateFailure);
					game.id = stubGameIdUpdateErrorDay;
					game.active = true;
					game.stage = 'day';
					game.activities = [stubActivitySaved1];
					return game;
				}
				case stubGameNew.id: {
					return structuredClone(stubGameNew);
				}
				case stubGameInactive.id: {
					return structuredClone(stubGameInactive);
				}
				case stubGamePending.id: {
					return structuredClone(stubGamePending);
				}
				case stubGameActive.id: {
					return structuredClone(stubGameActive);
				}
				case stubGameReady.id: {
					return structuredClone(stubGameReady);
				}
				case stubGameWolfOnly.id: {
					return structuredClone(stubGameWolfOnly);
				}
				case stubGameWolfOnly.id.substring(0, 3) + 'D': {
					const game = structuredClone(stubGameWolfOnly);
					game.stage = 'day';
					return game;
				}
				case stubGameHealerOnly.id: {
					return structuredClone(stubGameHealerOnly);
				}
				case stubGameHealerOnly.id.substring(0, 3) + 'D': {
					const game = structuredClone(stubGameHealerOnly);
					game.stage = 'day';
					return game;
				}
				case stubGameIncompleteActivity.id: {
					return structuredClone(stubGameIncompleteActivity);
				}
				case stubGameCorrectVotes.id: {
					return structuredClone(stubGameCorrectVotes);
				}
				case stubGameIncorrectVotes1.id: {
					return structuredClone(stubGameIncorrectVotes1);
				}
				case stubGameTie.id: {
					return structuredClone(stubGameTie);
				}
				case stubGameWolfWin.id: {
					return structuredClone(stubGameWolfWin);
				}
				default: {
					return null;
				}
			}
		},
	};
	return dynamo;
};
