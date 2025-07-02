import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { test as base } from '@playwright/test';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const test = base.extend<{
	locale: string;
	collectCoverage: Page;
}>({
	/* eslint-disable-next-line */
	locale: async ({}, use, testInfo: TestInfo) => {
		const match = /\((\w+)\)$/.exec(testInfo.title);
		const locale = match?.[1] ?? 'en';
		await use(locale);
	},
	collectCoverage: [
		async ({ page, context, browser }, use) => {
			const pages = new Set<Page>();
			const contexts = new Set<BrowserContext>();
			pages.add(page);
			contexts.add(context);

			// Track additional pages (ie extra players)
			context.on('page', (newPage) => pages.add(newPage));

			const newContext = browser.newContext.bind(browser);
			browser.newContext = async (...args) => {
				const context = await newContext(...args);
				contexts.add(context);
				context.on('page', (newPage) => pages.add(newPage));
				return context;
			};

			for (const p of pages) {
				const reload = p.reload.bind(p);
				p.reload = async (...args) => {
					await writeCoverage(p);
					return reload(...args);
				};
			}

			await use(page);
			await Promise.all(
				[...pages].map(async (p) => {
					try {
						if (!p.isClosed()) await writeCoverage(p);
					} catch (e) {
						console.warn('Error writing coverage:', (e as Error).message);
					}
				})
			);
			await Promise.all(
				[...contexts].map(async (ctx) => {
					try {
						await ctx.close();
					} catch (e) {
						console.warn('Error closing context:', (e as Error).message);
					}
				})
			);
			browser.newContext = newContext;
		},
		{ auto: true },
	],
});

const writeCoverage = async (page: Page) => {
	try {
		if (page.isClosed()) {
			console.warn('No coverage data collected for page as already closed.');
			return;
		}
		const coverage = await page.evaluate(() => window.__coverage__);
		if (coverage) {
			const tempDir = join(process.cwd(), 'tests/.nyc_output');
			if (!existsSync(tempDir)) {
				mkdirSync(tempDir, { recursive: true });
			}
			const title = test
				.info()
				.title.replace(/[^a-zA-Z]/g, '_')
				.toLowerCase();
			const filename = title + '_' + Date.now() + '.json';
			const path = join(tempDir, filename);
			writeFileSync(path, JSON.stringify(coverage));
		} else {
			console.warn(
				'No coverage data found on the page. Is vite-plugin-istanbul configured correctly and code executed?'
			);
		}
	} catch (e) {
		console.error(`Failed to get coverage for "${test.info().title}": ${(e as Error).message}`);
	}
};

const each = (locales: readonly string[]) => {
	return (
		title: string,
		fn: (_args: {
			page: Page;
			browser: Browser;
			context: BrowserContext;
			locale: string;
		}) => Promise<void>
	) => {
		for (const locale of locales) {
			test(`${title} (${locale})`, fn);
		}
	};
};

const patched = Object.assign(test, { each });

export { patched as test };
