import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Button from '@/components/Button.vue';

import { mockT, mockUseLocalePath, setLocalePath } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink, stubNuxtLinkWithMethod } from '@tests/unit/setup/navigation';

describe('Button', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully (enabled)', async (locale: string) => {
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
		expect(button.attributes('class')).toContain('bg-yellow-600');

		const path = locale == 'en' ? link : '/' + locale + link;
		const stub = wrapper.find('[data-test-link]');
		expect(stub.attributes('data-to')).toContain(path);

		await button.trigger('click');
		expect(mockNavigate).toHaveBeenCalled();
		expect(mockUseLocalePath).toHaveBeenCalledWith(link);
	});

	it.each(['en', 'de'])('should mount successfully (disabled)', async (locale: string) => {
		const link = '/create';
		const label = 'label';
		const clazz = 'w-full';

		setLocalePath(locale);

		const wrapper = await mountSuspended(Button, {
			props: {
				link: link,
				label: label,
				class: clazz,
				disabled: true,
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
		expect(button.attributes('class')).toContain('bg-stone-400');

		const path = locale == 'en' ? link : '/' + locale + link;
		const stub = wrapper.find('[data-test-link]');
		expect(stub.attributes('data-to')).toContain(path);

		await button.trigger('click');
		expect(mockNavigate).toHaveBeenCalled();
		expect(mockUseLocalePath).toHaveBeenCalledWith(link);
	});

	it.each(['en', 'de'])('should mount successfully (untranslated)', async (locale: string) => {
		const link = '/';
		const label = 'This is my label';
		const clazz = 'w-full';

		setLocalePath(locale);

		const wrapper = await mountSuspended(Button, {
			props: {
				link: link,
				label: label,
				class: clazz,
				translate: false,
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

		expect(wrapper.text()).toContain('This is my label');
		expect(wrapper.text()).not.toContain(`(${locale})`);
	});

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
