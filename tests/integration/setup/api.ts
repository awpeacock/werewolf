import { expect, it } from 'vitest';

import {
	GameIdNotFoundErrorResponse,
	InvalidActionErrorResponse,
	UnexpectedErrorResponse,
} from '@/types/constants';

import {
	stubGameIdNotFound,
	stubGameIdUpdateError,
	stubGameIdUpdateErrorDay,
	stubGameIdUpdateErrorNight,
	stubGameNew,
	stubInvalidCodes,
} from '@tests/common/stubs';

export const runCommonApiFailureTests = async (
	action: PutAction,
	callback: (_code: Undefinable<Nullable<string>>, _action: boolean) => Promise<Response>
) => {
	it('should return an ErrorResponse (with validation messages) if the code is invalid', async () => {
		for (const code of stubInvalidCodes) {
			const response = await callback(code.code, true);
			expect(response.status).toBe(400);
			const error: APIErrorResponse = await response.json();
			// HTTP encoding will amend the input so the errors change from what the front-end gets
			if (code.code === null || code.code === undefined) {
				expect(error).toHaveError('code-invalid');
			} else if (code.code?.includes(' ')) {
				expect(error).toHaveError('code-invalid');
			} else {
				expect(error).toHaveError(code.error);
			}
		}
	});

	it('should return a 404 if the code is not found', async () => {
		const response = await callback(stubGameIdNotFound, true);
		expect(response.status).toBe(404);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(GameIdNotFoundErrorResponse);
	});

	it('should return an ErrorResponse if no action is supplied', async () => {
		const response = await callback(stubGameNew.id, false);
		expect(response.status).toBe(400);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(InvalidActionErrorResponse);
	});

	it('should return an ErrorResponse (with unexpected error) if DynamoDB fails', async () => {
		let response;
		if (action === 'day') {
			response = await callback(stubGameIdUpdateErrorDay, true);
		} else if (action === 'night') {
			response = await callback(stubGameIdUpdateErrorNight, true);
		} else {
			response = await callback(stubGameIdUpdateError, true);
		}
		expect(response.status).toBe(500);
		const error: APIErrorResponse = await response.json();
		expect(error).toEqual(UnexpectedErrorResponse);
	});
};
