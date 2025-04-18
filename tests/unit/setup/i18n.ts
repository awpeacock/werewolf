import { vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { ref } from 'vue';
import type { LocaleObject } from '@nuxtjs/i18n';

// Nuxt composables (e.g. useI18n, useRoute) must be mocked in two phases:
// 1. A basic implementation is required up front — mockNuxtImport expects a working mock during setup.
//    Without this, tests will fail to initialise properly.
// 2. Later, the mock's behaviour can be updated (e.g. via setI18n) to simulate different scenarios.
export const mockUseI18n = {
	locale: 'en',
	defaultLocale: 'en',
	locales: [{ code: 'en' } as LocaleObject, { code: 'de' } as LocaleObject],
	localeCodes: ref(['en', 'de']),
	t: vi.fn((key: string) => key + ' (en)'),
};
mockNuxtImport('useI18n', () => {
	return () => mockUseI18n;
});
export const setLocale = (locale: string): void => {
	mockUseI18n.locale = locale;
	mockUseI18n.defaultLocale = locale;
	mockUseI18n.t = vi.fn((key: string) => `${key} (${locale})`);
};
export const mockT = vi.fn((key: string) => mockUseI18n.t(key));

export const mockUseLocalePath = vi.fn((path) => {
	return path;
});
mockNuxtImport('useLocalePath', () => {
	return () => mockUseLocalePath;
});
export const setLocalePath = (locale: string): void => {
	mockUseLocalePath.mockImplementation((path) => {
		return '/' + locale + path;
	});
	setLocale(locale);
};
