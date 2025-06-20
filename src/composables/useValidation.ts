import type { ZodSchema } from 'zod';
import { z } from 'zod';

// Expose one schema for everything about a game - we can pick and choose
// from it later as we need
interface Schema {
	[key: string]: ZodSchema;
}
const schemas: Schema = {
	code: z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) return undefined;
			return val;
		},
		z
			.string({ required_error: 'code-required', invalid_type_error: 'code-required' })
			.min(4, 'code-no-spaces')
			.max(4, 'code-max')
			.regex(/^[^\s]+$/, 'code-no-spaces')
			.regex(/^[A-Z0-9]+$/, 'code-invalid')
	),
	nickname: z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) return undefined;
			return val;
		},
		z
			.string({
				required_error: 'nickname-required',
				invalid_type_error: 'nickname-required',
			})
			.min(5, 'nickname-min')
			.max(16, 'nickname-max')
			.regex(/^[A-Za-z0-9 ]+$/, 'nickname-invalid')
	),
};

export const useValidation = () => {
	const validate = (field: string, input: Nullable<Undefinable<string>>): Array<APIError> => {
		const result = schemas[field].safeParse(input);
		if (result.success) {
			return [];
		}
		const messages = [];
		for (const error of result.error.errors) {
			const message = { field: field, message: error.message };
			messages.push(message);
		}
		return messages;
	};

	const validateCode = (code: Nullable<Undefinable<string>>): Array<APIError> => {
		if (code !== null && code !== undefined) {
			code = code.trim();
		}
		return validate('code', code);
	};

	const validateNickname = (nickname: Nullable<Undefinable<string>>): Array<APIError> => {
		return validate('nickname', nickname);
	};

	return {
		validateCode,
		validateNickname,
	};
};
