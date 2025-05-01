import { mockNuxtImport } from '@nuxt/test-utils/runtime';

let mockRetries: Nullable<number> = 5;
export const setupRuntimeConfigForApis = () => {
	mockNuxtImport('useRuntimeConfig', () => {
		return () => {
			return {
				AWS_REGION: 'AWS_REGION',
				AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
				AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
				AWS_DYNAMODB_TABLE: 'AWS_DYNAMODB_TABLE',
				CREATE_MAX_RETRIES: mockRetries,
			};
		};
	});
};
export const setMockRetries = (max: Nullable<number>) => {
	mockRetries = max;
};
