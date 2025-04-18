import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Error from '@/components/Error.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Error', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully', async (locale: string) => {
		const message = 'error-message';

		setLocale(locale);

		const wrapper = await mountSuspended(Error, {
			props: {
				message: message,
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		const div = wrapper.find('div');
		expect(div).not.toBeNull();
		expect(div.text()).toEqual(`${message} (${locale})`);
	});
});
