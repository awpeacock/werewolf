import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Button from '@/components/Button.vue';

import { mockT, mockUseLocalePath, setLocalePath } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink, stubNuxtLinkWithMethod } from '@tests/unit/setup/navigation';

describe('Button', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully', async (locale: string) => {
		const link = '/create';
		const label = 'label';
		const clazz = 'w-full';

		setLocalePath(locale);

		const wrapper = await mountSuspended(Button, {
			props: {
				link: link,
				label: label,
				class: clazz,
			},
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: stubNuxtLink,
				},
			},
		});

		const button = wrapper.find('button');
		expect(button).not.toBeNull();
		expect(button.text()).toEqual(`${label} (${locale})`);
		expect(button.attributes('role')).toEqual('link');
		expect(button.attributes('class')).toContain('w-full');

		const path = locale == 'en' ? link : '/' + locale + link;
		const stub = wrapper.find('[data-test-link]');
		expect(stub.attributes('data-to')).toContain(path);

		await button.trigger('click');
		expect(mockNavigate).toHaveBeenCalled();
		expect(mockUseLocalePath).toHaveBeenCalledWith(link);
	});

	it.each(['en', 'de'])(
		'successfully passes through a single query parameter',
		async (locale: string) => {
			const link = '/create?param=value';
			const label = 'label';
			const clazz = 'w-full';

			setLocalePath(locale);

			const wrapper = await mountSuspended(Button, {
				props: {
					link: link,
					label: label,
					class: clazz,
				},
				global: {
					mocks: {
						$t: mockT,
					},
					stubs: {
						NuxtLink: stubNuxtLink,
					},
				},
			});

			const button = wrapper.find('button');

			const path =
				locale == 'en'
					? link.substring(0, link.indexOf('?'))
					: '/' + locale + link.substring(0, link.indexOf('?'));
			const stub = wrapper.find('[data-test-link]');
			expect(stub.attributes('data-to')).toContain(path);
			const query = stub.attributes('data-query');
			expect(JSON.parse(query!)).toEqual({ param: 'value' });

			await button.trigger('click');
			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith(link);
		}
	);

	it.each(['en', 'de'])(
		'successfully passes through multiple query parameters',
		async (locale: string) => {
			const link = '/create?param1=value1&param2=value2';
			const label = 'label';
			const clazz = 'w-full';

			setLocalePath(locale);

			const wrapper = await mountSuspended(Button, {
				props: {
					link: link,
					label: label,
					class: clazz,
				},
				global: {
					mocks: {
						$t: mockT,
					},
					stubs: {
						NuxtLink: stubNuxtLink,
					},
				},
			});

			const button = wrapper.find('button');

			const path =
				locale == 'en'
					? link.substring(0, link.indexOf('?'))
					: '/' + locale + link.substring(0, link.indexOf('?'));
			const stub = wrapper.find('[data-test-link]');
			expect(stub.attributes('data-to')).toContain(path);
			const query = stub.attributes('data-query');
			expect(JSON.parse(query!)).toEqual({ param1: 'value1', param2: 'value2' });

			await button.trigger('click');
			expect(mockNavigate).toHaveBeenCalled();
			expect(mockUseLocalePath).toHaveBeenCalledWith(link);
		}
	);

	it.each(['en', 'de'])(
		'should still navigate after calling an external method',
		async (locale: string) => {
			setLocalePath(locale);

			const method = vi.fn((_e: MouseEvent) => {});

			const wrapper = await mountSuspended(
				defineComponent({
					template: `<Button link="/create" label="create-game" class="w-full" @click="handleClick" />`,
					components: { Button },
					setup() {
						return { handleClick: method };
					},
				}),
				{
					global: {
						mocks: { $t: mockT },
						stubs: {
							NuxtLink: stubNuxtLinkWithMethod(method),
						},
					},
				}
			);

			const button = wrapper.find('button');

			await button.trigger('click');
			expect(method).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalled();
		}
	);

	it.each(['en', 'de'])(
		'should NOT navigate if prevented by the external method',
		async (locale: string) => {
			setLocalePath(locale);

			const prevent = vi.fn((e: MouseEvent) => e.preventDefault());

			const wrapper = await mountSuspended(
				defineComponent({
					template: `<Button link="/create" label="create-game" class="w-full" @click="handleClick" />`,
					components: { Button },
					setup() {
						return { handleClick: prevent };
					},
				}),
				{
					global: {
						mocks: { $t: mockT },
						stubs: {
							NuxtLink: stubNuxtLinkWithMethod(prevent),
						},
					},
				}
			);

			const button = wrapper.find('button');

			await button.trigger('click');
			expect(prevent).toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		}
	);
});
