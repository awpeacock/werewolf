import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { RouterLinkStub } from '@vue/test-utils';
import type { LocaleObject } from '@nuxtjs/i18n';

import LocaleSwitcher from '@/components/LocaleSwitcher.vue';

import { mockUseI18n, setLocale } from '@tests/unit/setup/i18n';

describe('LocaleSwitcher', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(mockUseI18n.locales)('should mount successfully', async (locale: LocaleObject) => {
		setLocale(locale.code);

		const wrapper = await mountSuspended(LocaleSwitcher, {
			global: {
				stubs: {
					NuxtLink: RouterLinkStub,
				},
			},
		});

		const switchLocalePath = useSwitchLocalePath();
		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links).not.toBeNull();
		expect(links.length).toBe(mockUseI18n.locales.length);

		const images = wrapper.findAll('img');
		expect(images).not.toBeNull();
		expect(images.length).toBe(mockUseI18n.locales.length);

		for (let l = 0; l < links.length; l++) {
			const path = switchLocalePath(mockUseI18n.locales[l]!.code);
			expect(links[l]!.props('to')).toEqual(path);
			const src = `/images/locale/${mockUseI18n.locales[l]!.code}.webp`;
			expect(images[l]!.element.src.endsWith(src)).toBeTruthy();
		}
	});
});
