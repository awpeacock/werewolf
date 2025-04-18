import { describe, expect, it } from 'vitest';

import { validateNickname as validateNicknameClient } from '@/utils/validation';
import { validateNickname as validateNicknameServer } from '@/server/utils/validation';

describe('Validation utilities', () => {
	it('should successfully validate a nickname', () => {
		const funcs = [validateNicknameClient, validateNicknameServer];
		funcs.forEach((func) => {
			const valid = 'Valid Nickname';
			let result = func(valid);
			expect(result).not.toBeNull();
			expect(result.length).toBe(0);

			const short = 'Nom';
			result = func(short);
			expect(result).not.toBeNull();
			expect(result.length).toBe(1);
			expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-min' });

			const long = 'Overly Long Nickname';
			result = func(long);
			expect(result).not.toBeNull();
			expect(result.length).toBe(1);
			expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-max' });

			const invalid = 'Invalid-Nickname';
			result = func(invalid);
			expect(result).not.toBeNull();
			expect(result.length).toBe(1);
			expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-invalid' });
		});
	});
});
