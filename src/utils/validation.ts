import { z } from 'zod';

// Expose one schema for everything about a game - we can pick and choose
// from it later as we need
const schema = z.object({
	nickname: z
		.string()
		.min(5, 'nickname-min')
		.max(16, 'nickname-max')
		.regex(/^[A-Za-z0-9 ]+$/, 'nickname-invalid'),
});

export const validateNickname = (nickname: string): Array<APIError> => {
	const result = schema.safeParse({ nickname: nickname });
	if (result.success) {
		return [];
	}
	const messages = [];
	for (const error of result.error.errors) {
		const message = { field: 'nickname', message: error.message };
		messages.push(message);
	}
	return messages;
};
