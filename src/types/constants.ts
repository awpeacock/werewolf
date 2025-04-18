export const UnexpectedErrorResponse: APIErrorResponse = {
	errors: [{ message: 'An unexpected error has occurred' }],
};
export const NoUniqueIdErrorResponse: APIErrorResponse = {
	errors: [{ message: 'Could not find a unique game ID' }],
};
