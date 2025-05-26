import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import type { NuxtError } from '#app';

import page from '@/error.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Error Page', async () => {
	it.each(['en', 'de'])('should display 404 error pages successfully', async (locale: string) => {
		setLocale(locale);

		const mock404 = (overrides: Partial<NuxtError> = {}) => ({
			statusCode: 404,
			message: 'Page not found',
			fatal: false,
			unhandled: false,
			name: 'Error',
			toJSON() {
				return {
					statusCode: this.statusCode,
					message: this.message,
				};
			},
			...overrides,
		});

		const component = mount(page, {
			props: {
				error: mock404(),
			},
			global: {
				stubs: {
					NuxtLayout: { template: '<div><slot /></div>' },
					Heading: { template: '<h3><slot /></h3>' },
					BodyText: { template: '<p><slot /></p>' },
				},
				mocks: {
					$t: mockT,
				},
			},
		});
		expect(component.html()).toMatch(/<h3.+?>page-not-found.*<\/h3>/);
		expect(component.html()).toMatch(/lost-werewolf.webp/);
	});

	it.each(['en', 'de'])(
		'should display server error pages successfully',
		async (locale: string) => {
			setLocale(locale);

			const mock500 = (overrides: Partial<NuxtError> = {}) => ({
				statusCode: 404,
				message: 'Server error',
				fatal: false,
				unhandled: false,
				name: 'Error',
				toJSON() {
					return {
						statusCode: this.statusCode,
						message: this.message,
					};
				},
				...overrides,
			});

			const component = mount(page, {
				error: mock500(),
				global: {
					stubs: {
						NuxtLayout: { template: '<div><slot /></div>' },
						Heading: { template: '<h3><slot /></h3>' },
						BodyText: { template: '<p><slot /></p>' },
					},
					mocks: {
						$t: mockT,
					},
				},
			});
			expect(component.html()).toMatch(/<h3.+?>server-error.*<\/h3>/);
			expect(component.html()).toMatch(/dead-werewolf.webp/);
		}
	);
});
