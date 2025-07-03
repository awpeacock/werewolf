import { defineVitestConfig } from '@nuxt/test-utils/config';
import path from 'path';

export default defineVitestConfig({
	test: {
		environment: 'nuxt',
		env: {
			BROADCAST_PROVIDER: 'websocket',
			IS_INTEGRATION: 'true',
		},
		root: path.resolve(__dirname),
		setupFiles: [path.resolve(__dirname, 'tests/common/expect.ts')],
		globals: true,
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
