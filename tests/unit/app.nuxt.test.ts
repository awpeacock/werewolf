import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import App from '@/app.vue';

describe('Werewolf App', async () => {
	it('should mount successfully', async () => {
		const component = await mountSuspended(App, { route: '/' });
		expect(component.html()).toMatch(/<h1.+?>Werewolf<\/h1>/);
		expect(component.html()).toMatch(
			/<nav><button.+?>Create Game<\/button><button.+?>Join Game<\/button>/
		);
	});
});
