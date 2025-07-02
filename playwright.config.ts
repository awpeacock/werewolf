import { defineConfig, devices } from '@playwright/test';
import type { ConfigOptions } from '@nuxt/test-utils/playwright';
import { isCI, isWindows } from 'std-env';

const devicesToTest: Array<string> = ['Desktop Chrome', 'Pixel 5', 'iPhone 12'];

/* See https://playwright.dev/docs/test-configuration. */
export default defineConfig<ConfigOptions>({
	testDir: './tests/e2e',
	outputDir: './tests/reports/e2e',
	fullyParallel: true,
	forbidOnly: !!isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	timeout: isWindows ? 180000 : 60000,
	expect: {
		timeout: 10000,
	},
	reporter: [
		['html', { outputFolder: './tests/reports/e2e' }],
		['json', { outputFile: './tests/reports/e2e/coverage-report.json' }],
	],
	webServer: {
		command: 'nuxt preview',
		url: 'http://localhost:3000',
		timeout: 120 * 1000,
		reuseExistingServer: !isCI,
		env: {
			IS_E2E: 'true',
			VITE_COVERAGE: 'true',
		},
	},
	use: {
		baseURL: 'http://localhost:3000',
		headless: true,
		video: 'off',
		trace: 'off',
		actionTimeout: 0,
		navigationTimeout: 30000,
	},
	projects: devicesToTest.map((name) => {
		const base = {
			name,
			use: devices[name],
		};
		// Run iPhone tests with 1 worker only (Webkit is flakey on Windows devices)
		if (name === 'iPhone 12') {
			return { ...base, workers: 1 };
		}
		return base;
	}),
});
