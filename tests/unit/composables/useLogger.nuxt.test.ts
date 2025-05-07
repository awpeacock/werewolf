import { describe, expect, it, vi } from 'vitest';

describe('useLogger', () => {
	it('should successfully log a success message', () => {
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		useLogger().success('Success message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[32m\u2713\x1b[0m Success message');
	});
	it('should successfully log an error message', () => {
		const spyLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		useLogger().error('Error message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[31m\u2718\x1b[0m Error message');
		useLogger().error('Error message', new Error('Error details'));
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[31m\u2718\x1b[0m Error message - Error details');
	});
	it('should successfully log an information message', () => {
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		useLogger().info('Info message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[34m\u2139\x1b[0m Info message');
	});
	it('should successfully log a warning message', () => {
		const spyLog = vi.spyOn(console, 'warn').mockImplementation(() => {});
		useLogger().warn('Warning message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[31m!\x1b[0m Warning message');
	});
});
