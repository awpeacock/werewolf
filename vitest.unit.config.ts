import { defineVitestConfig } from '@nuxt/test-utils/config';
import path from 'path';

export default defineVitestConfig({
	test: {
		environment: 'nuxt',
		setupFiles: [
			path.resolve(__dirname, 'tests/common/expect.ts'),
			path.resolve(__dirname, 'tests/unit/setup/dynamodb.ts'),
			path.resolve(__dirname, 'tests/unit/setup/api.ts'),
			path.resolve(__dirname, 'tests/unit/setup/game.ts'),
			path.resolve(__dirname, 'tests/unit/setup/global.ts'),
			path.resolve(__dirname, 'tests/unit/setup/i18n.ts'),
			path.resolve(__dirname, 'tests/unit/setup/navigation.ts'),
			path.resolve(__dirname, 'tests/unit/setup/storage.ts'),
			path.resolve(__dirname, 'tests/unit/setup/websocket.ts'),
		],
		coverage: {
			provider: 'istanbul',
			include: ['**/*'],
			exclude: ['**/types/**'],
			reporter: ['html', 'text', 'lcov'],
			reportsDirectory: path.resolve(__dirname, 'tests/coverage/unit'),
			all: true,
			thresholds: {
				global: {
					lines: 80,
					functions: 80,
					branches: 80,
					statements: 80,
				},
			},
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
