import { describe, expect, it } from 'vitest';

describe('Validation utilities', () => {
	it('should successfully validate a code', () => {
		let result = useValidation().validateCode('A1B2');
		expect(result).not.toBeNull();
		expect(result.length).toBe(0);

		result = useValidation().validateCode(null);
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-required' });

		result = useValidation().validateCode(undefined);
		expect(result).not.toBeNull();
		expect(result[0]).toEqual({ field: 'code', message: 'code-required' });

		result = useValidation().validateCode('');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-required' });

		result = useValidation().validateCode('A1B');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-no-spaces' });

		result = useValidation().validateCode('A1B2C');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-max' });

		result = useValidation().validateCode('A1-B');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-invalid' });

		result = useValidation().validateCode('A1B ');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-no-spaces' });

		result = useValidation().validateCode(' A1B');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'code', message: 'code-no-spaces' });

		result = useValidation().validateCode('A1 B');
		expect(result).not.toBeNull();
		expect(result.length).toBe(2);
		expect(result[0]).toEqual({ field: 'code', message: 'code-no-spaces' });
		expect(result[1]).toEqual({ field: 'code', message: 'code-invalid' });

		result = useValidation().validateCode('A-1');
		expect(result).not.toBeNull();
		expect(result.length).toBe(2);
		expect(result[0]).toEqual({ field: 'code', message: 'code-no-spaces' });
		expect(result[1]).toEqual({ field: 'code', message: 'code-invalid' });

		result = useValidation().validateCode('A1-B2');
		expect(result).not.toBeNull();
		expect(result.length).toBe(2);
		expect(result[0]).toEqual({ field: 'code', message: 'code-max' });
		expect(result[1]).toEqual({ field: 'code', message: 'code-invalid' });
	});

	it('should successfully validate a nickname', () => {
		let result = useValidation().validateNickname('Valid Nickname');
		expect(result).not.toBeNull();
		expect(result.length).toBe(0);

		result = useValidation().validateNickname(null);
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-required' });

		result = useValidation().validateNickname(undefined);
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-required' });

		result = useValidation().validateNickname('');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-required' });

		result = useValidation().validateNickname('Nom');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-min' });

		result = useValidation().validateNickname('Overly Long Nickname');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-max' });

		result = useValidation().validateNickname('Invalid-Nickname');
		expect(result).not.toBeNull();
		expect(result.length).toBe(1);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-invalid' });

		result = useValidation().validateNickname('I-N');
		expect(result).not.toBeNull();
		expect(result.length).toBe(2);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-min' });
		expect(result[1]).toEqual({ field: 'nickname', message: 'nickname-invalid' });

		result = useValidation().validateNickname('Invalid-Long-Nickname');
		expect(result).not.toBeNull();
		expect(result.length).toBe(2);
		expect(result[0]).toEqual({ field: 'nickname', message: 'nickname-max' });
		expect(result[1]).toEqual({ field: 'nickname', message: 'nickname-invalid' });
	});
});
