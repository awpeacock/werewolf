import { mockNuxtImport } from '@nuxt/test-utils/runtime';

let mockRetries: Undefinable<number> = 5;
let mockMinPlayers: Undefinable<number> = 5;
export const setupRuntimeConfigForApis = () => {
	mockNuxtImport('useRuntimeConfig', () => {
		return () => {
			return {
				AWS_REGION: 'AWS_REGION',
				AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
				AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
				AWS_DYNAMODB_TABLE: 'AWS_DYNAMODB_TABLE',
				CREATE_MAX_RETRIES: mockRetries,
				public: {
					MIN_PLAYERS: mockMinPlayers?.toString(),
				},
			};
		};
	});
};
export const setMockRetries = (max: Undefinable<number>) => {
	mockRetries = max;
};
export const setMockMinPlayers = (min: Undefinable<number>) => {
	mockMinPlayers = min;
};
