import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';

import Footer from '@/components/Footer.vue';

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
			});
			await wrapper.vm.$router.push(routes[r]);
			await nextTick();
			await flushPromises();

			if (!meta) {
				expect(wrapper.find('footer').exists()).not.toBeTruthy();
			} else {
				const image = wrapper.find('img');
				expect(image.element.src).toContain(meta!.src);
				expect(image.element.alt).toEqual(`${meta.alt} (${locale})`);
			}
		}
	});
});
