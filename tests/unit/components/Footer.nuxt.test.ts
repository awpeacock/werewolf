import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';

import Footer from '@/components/Footer.vue';

import { waitFor } from '@tests/unit/setup/global';
import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Footer', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully', async (locale: string) => {
		setLocale(locale);

		const routes = ['/', '/create'];
		const footers: Array<Undefinable<FooterMeta>> = [
			undefined,
			{ src: 'carpenter.webp', alt: 'carpenter-alt-text' },
		];
		for (let r = 0; r < routes.length; r++) {
			const meta = footers[r];
			const wrapper = await mountSuspended(Footer, {
				global: {
					mocks: {
						$t: mockT,
					},
				},
				attachTo: document.body,
			});
			await wrapper.vm.$router.push(routes[r]);
			await nextTick();
			await flushPromises();

			if (!meta) {
				expect(wrapper.find('footer').exists()).toBeFalsy();
			} else {
				const image = wrapper.find('img');
				expect(image.element.src).toContain(meta!.src);
				expect(image.element.alt).toEqual(`${meta.alt} (${locale})`);
			}
		}
	});

	it('should animate between two images successfully', async () => {
		// We need to do this seemingly pointless loop in order to catch the scenario
		// where the router having been active might cause an immediate update to the
		// meta object before the Footer has mounted, causing imageA to be updated
		// initially and imageB remaining undefined
		for (let r = 0; r < 2; r++) {
			const wrapper = await mountSuspended(Footer, {
				global: {
					mocks: {
						$t: mockT,
					},
				},
				attachTo: document.body,
			});

			const router = wrapper.vm.$router;

			await router.push('/create');
			await nextTick();
			await flushPromises();

			let images = wrapper.findAll('img');
			await waitFor(() => images.length == 1);
			expect(images[0].attributes('src')).toContain('carpenter.webp');
			expect(images[0].classes()).toContain('opacity-100');

			await router.push('/create/invite');
			await nextTick();
			await flushPromises();

			images = wrapper.findAll('img');
			await waitFor(() => images.length == 2);

			const sources = images.map((img) => img.attributes('src'));
			const filenames = sources.map((src) => src!.split('/').pop());
			expect(filenames).toContain('carpenter.webp');
			expect(filenames).toContain('mailman.webp');

			const opacity = images.map((img) => img.classes());
			expect(opacity.some((c) => c.includes('opacity-100'))).toBeTruthy();
			expect(opacity.some((c) => c.includes('opacity-0'))).toBeTruthy();

			wrapper.unmount();
		}
	});
});
