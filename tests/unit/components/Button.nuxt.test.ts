import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Button from '@/components/Button.vue';

import { mockT, mockUseLocalePath, setLocalePath } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink, stubNuxtLinkWithMethod } from '@tests/unit/setup/navigation';

describe('Button', async () => {
	const setupStandard = async (
		locale: string,
		link: string,
		label: string,
		clazz: string,
		disabled: boolean,
		translate: boolean
	): Promise<VueWrapper> => {
		setLocalePath(locale);

		const wrapper = await mountSuspended(Button, {
			props: {
				link: link,
				label: label,
				class: clazz,
				disabled: disabled,
				translate: translate,
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
		return wrapper;
	};

	const setupExternal = async (locale: string, method: Mock): Promise<VueWrapper> => {
		setLocalePath(locale);

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
		return wrapper;
	};

	const expectButton = async (
		wrapper: VueWrapper,
		locale: string,
		label: string,
		link: string,
		disabled: boolean
	) => {
		const button = wrapper.find('a');
		expect(button).not.toBeNull();
		expect(button.text()).toEqual(`${label} (${locale})`);
		expect(button.attributes('role')).toEqual('link');
		expect(button.attributes('class')).toContain('w-full');
		expect(button.attributes('class')).toContain(disabled ? 'bg-stone-400' : 'bg-yellow-600');

		const path = locale == 'en' ? link : '/' + locale + link;
		const stub = wrapper.find('[data-test-link]');
		expect(stub.attributes('data-to')).toContain(path);

		await button.trigger('click');
		expect(mockNavigate).toHaveBeenCalled();
		expect(mockUseLocalePath).toHaveBeenCalledWith(link);
	};

	const expectMethod = async (wrapper: VueWrapper, method: Mock, disabled: boolean) => {
		const button = wrapper.find('a');

		await button.trigger('click');
		expect(method).toHaveBeenCalled();
		if (disabled) {
			expect(mockNavigate).not.toHaveBeenCalled();
		} else {
			expect(mockNavigate).toHaveBeenCalled();
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully (enabled)', async (locale: string) => {
		const link = '/create';
		const label = 'label 1';
		const clazz = 'w-full';
		const wrapper = await setupStandard(locale, link, label, clazz, false, true);
		await expectButton(wrapper, locale, label, link, false);
	});

	it.each(['en', 'de'])('should mount successfully (disabled)', async (locale: string) => {
		const link = '/join';
		const label = 'label 2';
		const clazz = 'w-full';
		const wrapper = await setupStandard(locale, link, label, clazz, true, true);
		await expectButton(wrapper, locale, label, link, true);
	});

	it.each(['en', 'de'])('should mount successfully (untranslated)', async (locale: string) => {
		const link = '/';
		const label = 'label 3';
		const clazz = 'w-full';
		const wrapper = await setupStandard(locale, link, label, clazz, false, false);

		expect(wrapper.text()).toContain(label);
		expect(wrapper.text()).not.toContain(`(${locale})`);
	});

	it.each(['en', 'de'])(
		'should still navigate after calling an external method',
		async (locale: string) => {
			const method = vi.fn((_e: MouseEvent) => {});
			const wrapper = await setupExternal(locale, method);
			await expectMethod(wrapper, method, false);
		}
	);

	it.each(['en', 'de'])(
		'should NOT navigate if prevented by the external method',
		async (locale: string) => {
			const prevent = vi.fn((e: MouseEvent) => e.preventDefault());
			const wrapper = await setupExternal(locale, prevent);
			await expectMethod(wrapper, prevent, true);
		}
	);
});
