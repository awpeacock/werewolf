import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import DefaultLayout from '@/layouts/default.vue';

import { mockT } from '@tests/unit/setup/i18n';
import { stubNuxtLink } from '@tests/unit/setup/navigation';
import { stubGameActive, stubWolf } from '@tests/unit/setup/stubs';

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

	it('should mount successfully with a player in session', async () => {
		const game = useGameStore();
		game.set(stubGameActive);
		const player = usePlayerStore();
		player.set(stubWolf);

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

		let bar = wrapper.find('.justify-between');
		let links = bar.findAll('[data-test-link][data-to="/"]');
		expect(links.length).toBe(1);
		expect(links.some((link) => link.text().includes('go-home'))).toBeFalsy();
		expect(bar.text()).toContain(`${stubWolf.nickname} (wolf (en))`);
		expect(bar.text()).toContain(game.id);

		await wrapper.vm.$router.push('/join');
		await flushPromises();

		bar = wrapper.find('.justify-between');
		links = bar.findAll('[data-test-link][data-to="/"]');
		expect(links.length).toBe(1);
		expect(links.some((link) => link.text().includes('go-home'))).toBeTruthy();
	});
});
