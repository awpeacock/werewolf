module.exports = {
	extends: '@istanbuljs/nyc-config-typescript',
	all: true,
	checkCoverage: true,
	statements: 80,
	branches: 80,
	functions: 80,
	lines: 80,
	include: [
		'src/composables/**/*.ts',
		'src/components/**/*.vue',
		'src/pages/**/*.vue',
		'src/layouts/**/*.vue',
		'src/plugins/**/*.ts',
		'src/server/api/**/*.ts',
		'src/stores/**/*.ts',
	],
	exclude: [
		'node_modules',
		'**/tests/**',
		'**/test/**',
		'**/dist/**',
		'**/coverage/**',
		'**/*.d.ts',
		'**/tailwind.config.ts',
		'**/postcss.config.js',
		'**/nuxt.config.ts',
		'**/playwright.config.ts',
		'**/components/Footer.vue', // Playwright cannot collect coverage for image "B" in any scenario
		'**/composables/useBroadcastClient.ts', // Only used for switching between WebSockets/Pusher - that will be pre-determined with test build
		'**/composables/useWebSocketClient.ts', // Excluded due to not being in use in e2e tests - Pusher used to guarantee compatability
		'**/composables/useLogger.ts', // Logging is turned off in "production" builds (which is used for e2e testing) so majority of these are unreachable
		'**/composables/useGame.ts', // Again, majority of code here is not used client-side but is covered by unit and integration testing (so ignore full file here rather than individual lines and get invalid coverage on other tests)
	],
	reporter: ['html', 'text', 'lcov'],
	reportDir: 'tests/coverage/e2e',
	tempDir: 'tests/.nyc_output',
	sourceMap: true,
	instrument: false,
	extension: ['.js', '.ts', '.vue'],
};
