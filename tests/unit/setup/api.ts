import { afterAll, beforeAll, vi } from 'vitest';

import { setupServer } from 'msw/node';
import { createFetch } from 'ofetch';

export const server = setupServer();
export const spyApi = vi.fn();
beforeAll(() => {
	// If we set any default handlers ALL responses will be processed by that.
	// But... if we don't MSW complains that there is no handler registered, so
	// we have to set this to bypass all the squawking.
	server.listen({
		onUnhandledRequest: 'bypass',
	});
	// Needed to make MSW work with Nuxt's implementation of fetch
	globalThis.$fetch = createFetch({
		fetch: globalThis.fetch,
		Headers: globalThis.Headers,
	}) as typeof $fetch;
});
afterAll(() => {
	server.close();
});
