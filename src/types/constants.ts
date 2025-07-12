export const BlankActivity: Activity = {
	wolf: null,
	healer: null,
	votes: {},
};
export const UnexpectedErrorResponse: APIErrorResponse = {
	errors: [{ message: 'An unexpected error has occurred' }],
};
export const NoUniqueIdErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Could not find a unique game ID' }],
};
export const InvalidGameIdErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Invalid game ID supplied' }],
};
export const GameIdNotFoundErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Game ID not found' }],
};
export const PlayerIdNotFoundErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Player not found' }],
};
export const InvalidActionErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Invalid action supplied' }],
};
export const UnauthorisedErrorResponse: APIErrorResponse = {
	errors: [{ message: 'User not authorised to perform that action' }],
};
export const NicknameAlreadyExistsErrorResponse: APIErrorResponse = {
	errors: [{ field: 'nickname', message: 'nickname-already-exists' }],
};
export const PlayerAlreadyAdmittedErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Player already admitted to game' }],
};
export const NotEnoughPlayersErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Too few players added to game' }],
};
export const AttemptToChooseOutsideNightErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Can only choose during night time' }],
};
export const CannotChooseDeadPlayerErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to choose a dead player' }],
};
export const CannotChooseEvictedPlayerErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to choose an evicted player' }],
};
export const AttemptToVoteOutsideDayErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Can only vote during day time' }],
};
export const CannotVoteUntilActivityCompleteErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to vote before wolf and healer have made choices' }],
};
export const CannotVoteForDeadPlayerErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to vote for a dead player' }],
};
export const CannotVoteForEvictedPlayerErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to vote for an evicted player' }],
};
export const CannotVoteTwiceErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Attempt to vote twice' }],
};
