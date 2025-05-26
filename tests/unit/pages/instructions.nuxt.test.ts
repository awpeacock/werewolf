import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import page from '@/pages/instructions.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Instructions page', () => {
	it.each(['en', 'de'])('renders the "How to Play" page', async (locale: string) => {
		setLocale(locale);

		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});
		expect(wrapper.text()).toContain(`instructions-intro (${locale})`);
		expect(wrapper.text()).toContain(`instructions-game-end (${locale})`);
	});
});
