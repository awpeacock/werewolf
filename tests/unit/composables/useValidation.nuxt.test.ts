import { describe, expect, it } from 'vitest';

describe('Validation utilities', () => {
	const test = (
		type: 'code' | 'nickname',
		value: Undefinable<Nullable<string>>,
		err?: Array<string>
	) => {
		let result;
		if (type == 'code') {
			result = useValidation().validateCode(value);
		} else {
			result = useValidation().validateNickname(value);
		}
		expect(result).not.toBeNull();
		if (err) {
			expect(result.length).toBe(err.length);
			for (let e = 0; e < err.length; e++) {
				expect(result[e]).toEqual({ field: type, message: err[e] });
			}
		} else {
			expect(result.length).toBe(0);
		}
	};

	it('should successfully validate a code', () => {
		test('code', 'A1B2');
		test('code', null, ['code-required']);
		test('code', undefined, ['code-required']);
		test('code', '', ['code-required']);
		test('code', 'A1B', ['code-no-spaces']);
		test('code', 'A1B2C', ['code-max']);
		test('code', 'A1-B', ['code-invalid']);
		test('code', 'A1B ', ['code-no-spaces']);
		test('code', ' A1B', ['code-no-spaces']);
		test('code', 'A1 B', ['code-no-spaces', 'code-invalid']);
		test('code', 'A-1', ['code-no-spaces', 'code-invalid']);
		test('code', 'A1-B2', ['code-max', 'code-invalid']);
	});

	it('should successfully validate a nickname', () => {
		test('nickname', 'Valid Nickname');
		test('nickname', 'Space at end ');
		test('nickname', ' Space at start');
		test('nickname', ' Space both ');
		test('nickname', null, ['nickname-required']);
		test('nickname', undefined, ['nickname-required']);
		test('nickname', '', ['nickname-required']);
		test('nickname', 'Nom', ['nickname-min']);
		test('nickname', 'Overly Long Nickname', ['nickname-max']);
		test('nickname', 'Invalid-Nickname', ['nickname-invalid']);
		test('nickname', 'I-N', ['nickname-min', 'nickname-invalid']);
		test('nickname', 'Invalid-Long-Nickname', ['nickname-max', 'nickname-invalid']);
	});
});
