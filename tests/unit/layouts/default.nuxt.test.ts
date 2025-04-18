import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import DefaultLayout from '@/layouts/default.vue';
import { mockT } from '../setup/i18n';
import { stubNuxtLink } from '../setup/navigation';

describe('Default layout', async () => {
	it('should mount successfully', async () => {
		const wrapper = mount(DefaultLayout, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: stubNuxtLink,
				},
			},
		});

		// Nothing should be visible initially
		expect(wrapper.attributes('style')).toContain('display: none');

		await flushPromises();

		expect(wrapper.attributes('style')).toBeUndefined();
	});
});
