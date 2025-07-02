import { describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

let isProduction = false;
let isClient = false;
let isTest = false;

mockNuxtImport('useEnvironment', () => {
	return () => {
		return {
			isClient: vi.fn(() => isClient),
			isProduction: vi.fn(() => isProduction),
			isTest: vi.fn(() => isTest),
		};
	};
});

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
		const spyLog = vi.spyOn(console, 'info').mockImplementation(() => {});
		useLogger().info('Info message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[34m\u2139\x1b[0m Info message');
	});

	it('should successfully log a warning message', () => {
		const spyLog = vi.spyOn(console, 'warn').mockImplementation(() => {});
		useLogger().warn('Warning message');
		expect(spyLog).toBeCalledWith('\x1b[1m\x1b[31m!\x1b[0m Warning message');
	});

	it('should not log anything in production mode on the client', () => {
		isProduction = true;
		isClient = true;
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		useLogger().success('Success message');
		expect(spyLog).not.toBeCalled();
		useLogger().success('Info message');
		expect(spyInfo).not.toBeCalled();
		useLogger().error('Error message');
		expect(spyError).not.toBeCalled();
		useLogger().info('Info message');
		expect(spyLog).not.toBeCalled();
		useLogger().warn('Warning message');
		expect(spyWarn).not.toBeCalled();
	});

	it('should log on the client if in dev mode', () => {
		isProduction = false;
		isClient = true;
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		useLogger().success('Success message');
		expect(spyLog).toBeCalled();
		useLogger().error('Error message');
		expect(spyError).toBeCalled();
		useLogger().info('Info message');
		expect(spyLog).toBeCalled();
		useLogger().warn('Warning message');
		expect(spyWarn).toBeCalled();
	});

	it('should not log anything in E2E testing mode', () => {
		isProduction = false;
		isClient = true;
		isTest = true;
		const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		useLogger().success('Success message');
		expect(spyLog).not.toBeCalled();
		useLogger().error('Error message');
		expect(spyError).not.toBeCalled();
		useLogger().info('Info message');
		expect(spyLog).not.toBeCalled();
		useLogger().warn('Warning message');
		expect(spyWarn).not.toBeCalled();

		isClient = false;

		useLogger().success('Success message');
		expect(spyLog).not.toBeCalled();
		useLogger().error('Error message');
		expect(spyError).not.toBeCalled();
		useLogger().info('Info message');
		expect(spyLog).not.toBeCalled();
		useLogger().warn('Warning message');
		expect(spyWarn).not.toBeCalled();
	});
});
