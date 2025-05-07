import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import DefaultLayout from '@/layouts/default.vue';

import { mockT } from '@tests/unit/setup/i18n';
import { stubNuxtLink } from '@tests/unit/setup/navigation';

describe('Default layout', async () => {
	it('should mount successfully, delaying loading', async () => {
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

		expect(wrapper.findComponent({ name: 'Notifications' }).exists).toBeTruthy();
		expect(wrapper.findComponent({ name: 'LocaleSwitcher' }).exists).toBeTruthy();
	});

	it('should mount successfully with and without a footer', async () => {
		const wrapper = await mountSuspended(DefaultLayout, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: stubNuxtLink,
				},
			},
		});

		await wrapper.vm.$router.push('/');
		await flushPromises();
		expect(wrapper.find('main').classes('max-sm:mb-[250px]')).toBeFalsy();

		await wrapper.vm.$router.push('/create');
		await flushPromises();
		expect(wrapper.find('main').classes('max-sm:mb-[250px]')).toBeTruthy();
	});
});
