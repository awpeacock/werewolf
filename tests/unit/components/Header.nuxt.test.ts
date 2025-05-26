import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';

import Header from '@/components/Header.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Header', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully', async (locale: string) => {
		setLocale(locale);

		const routes = ['/', '/create'];
		const titles = ['werewolf', 'create-game'];
		for (let r = 0; r < routes.length; r++) {
			const route = routes[r];
			const title = titles[r];
			const wrapper = await mountSuspended(Header, {
				global: {
					mocks: {
						$t: mockT,
					},
				},
			});
			await wrapper.vm.$router.push(routes[r]);
			await nextTick();
			await flushPromises();

			const h1 = wrapper.find('h1');
			expect(h1).not.toBeNull();
			expect(mockT).toHaveBeenCalled();
			expect(h1.text()).toEqual(`werewolf (${locale})`);
			const clazz = route === '/' ? 'text-7xl' : 'text-5xl';
			expect(h1.classes(clazz)).toBeTruthy();
			if (route !== '/') {
				const h2 = wrapper.find('h2');
				expect(h2).not.toBeNull();
				expect(h2.text()).toEqual(`${title} (${locale})`);
			}
			expect(wrapper.html()).toContain('werewolf.webp');
		}
	});

	it.each(['en', 'de'])('should mount successfully for errors', async (locale: string) => {
		setLocale(locale);
		vi.mock('#app', async () => {
			const original = await vi.importActual('#app');
			return {
				...original,
				useNuxtApp: () => ({
					payload: {
						error: {
							statusCode: 404,
							message: 'Page not found',
						},
					},
				}),
			};
		});

		const wrapper = await mountSuspended(Header, {
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});
		await wrapper.vm.$router.push('/no-such-page');
		await nextTick();
		await flushPromises();

		const h1 = wrapper.find('h1');
		expect(h1).not.toBeNull();
		expect(mockT).toHaveBeenCalled();
		expect(h1.text()).toEqual(`werewolf (${locale})`);
		expect(wrapper.html()).not.toContain('werewolf.webp');
	});
});
