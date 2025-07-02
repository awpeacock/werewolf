import type { Page } from '@playwright/test';

export const mockApi = async (
	page: Page,
	url: string,
	code: number,
	response: string,
	repeat?: boolean
) => {
	const path = `**${url}`;
	await page.route(
		path,
		async (route) => {
			await new Promise((res) => setTimeout(res, 500));
			await route.fulfill({
				status: code,
				contentType: 'application/json',
				body: response,
			});
		},
		!repeat ? { times: 1 } : {}
	);
};

export const unmockApi = async (page: Page, url: string) => {
	const path = `**${url}`;
	await page.unroute(path);
};
