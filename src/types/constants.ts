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
