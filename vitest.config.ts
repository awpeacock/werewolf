import { defineVitestConfig } from '@nuxt/test-utils/config';
import path from 'path';

export default defineVitestConfig({
	test: {
		environment: 'nuxt',
		setupFiles: [
			'../tests/unit/setup/api.ts',
			'../tests/unit/setup/dynamodb.ts',
			'../tests/unit/setup/global.ts',
			'../tests/unit/setup/i18n.ts',
			'../tests/unit/setup/navigation.ts',
			'../tests/unit/setup/storage.ts',
			'../tests/unit/setup/websocket.ts',
		],
		coverage: {
			provider: 'istanbul',
			include: ['**/*'],
			exclude: ['**/types/**'],
			reportsDirectory: '../tests/coverage/unit',
			all: true,
		},
	},
	resolve: {
		alias: {
			'#app': path.resolve(__dirname, 'node_modules/nuxt/dist/app'),
			'#app/*': path.resolve(__dirname, 'node_modules/nuxt/dist/app/*'),
			'@': path.resolve(__dirname, 'src'),
			'@tests': path.resolve(__dirname, 'tests'),
		},
	},
});
