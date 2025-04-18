import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

import Nickname from '@/components/Nickname.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Nickname', async () => {
	let wrapper: VueWrapper<InstanceType<typeof Nickname>>;
	let nickname: string;

	const mountComponent = () => {
		// mountSuspended does not yet work with v-model binding
		wrapper = mount(Nickname, {
			props: {
				modelValue: nickname,
				'onUpdate:modelValue': (value: string) => {
					wrapper.setProps({ modelValue: value });
				},
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});
	};

	const expectDefaultLayout = (input: DOMWrapper<HTMLInputElement>) => {
		expect(input).not.toBeNull();
		expect(input.classes('border-yellow-200')).toBeTruthy();
		expect(wrapper.find('.bg-red-600').exists()).not.toBeTruthy();
	};

	const expectSuccessLayout = (input: DOMWrapper<HTMLInputElement>) => {
		expect(input).not.toBeNull();
		expect(input.classes('border-green-600')).toBeTruthy();
		expect(wrapper.find('.bg-red-600').exists()).not.toBeTruthy();
		expect(wrapper.emitted('update:modelValue')).toBeTruthy();
	};

	const expectInvalidLayout = (
		input: DOMWrapper<HTMLInputElement>,
		value: string,
		error: string,
		server?: boolean
	) => {
		expect(input.classes('border-red-600')).toBeTruthy();
		expect(wrapper.props('modelValue')).toEqual(value);
		expect(wrapper.find('.bg-red-600').exists()).toBeTruthy();
		expect(wrapper.find('.bg-red-600').text()).toEqual(error);
		if (!server) {
			expect(wrapper.emitted('update:modelValue')).toBeTruthy();
		}
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		nickname = '';
	});

	it('should mount successfully', async () => {
		mountComponent();

		const input = wrapper.find('input');
		expectDefaultLayout(input);
		expect(input.element.value).toBe('');
	});

	it('should validate successfully when a valid name is entered', async () => {
		mountComponent();

		const input = wrapper.find('input');
		await input.setValue('TestPlayer');
		await input.trigger('blur');

		expectSuccessLayout(input);
		expect(wrapper.props('modelValue')).toEqual('TestPlayer');
	});

	it.each(['en', 'de'])(
		'should invalidate successfully when a name less than 5 characters is entered',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = wrapper.find('input');
			await input.setValue('Test');
			await input.trigger('blur');

			expectInvalidLayout(input, 'Test', `nickname-min (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should invalidate successfully when a name more than 16 characters is entered',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = wrapper.find('input');
			await input.setValue('Overly Long Test Nickname');
			await input.trigger('blur');

			expectInvalidLayout(input, 'Overly Long Test Nickname', `nickname-max (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'should invalidate successfully when a name with invalid characters is entered',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const names = [
				"'TestPlayer'",
				'TestPlayer;',
				'TestPlayer,',
				'-- TestPlayer',
				'<TestPlayer>',
				'{TestPlayer}',
			];
			for (const name of names) {
				const input = wrapper.find('input');
				await input.setValue(name);
				await input.trigger('blur');

				expectInvalidLayout(input, name, `nickname-invalid (${locale})`);
			}
		}
	);

	it.each(['en', 'de'])(
		'should update successfully when invalidated externally',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = wrapper.find('input');
			await input.setValue('ServerSide');
			await input.trigger('blur');

			wrapper.setProps({ serverError: 'nickname-invalid' });
			await nextTick();

			expectInvalidLayout(input, 'ServerSide', `nickname-invalid (${locale})`, true);
		}
	);

	it.each(['en', 'de'])('should successfully reset when re-focused', async (locale: string) => {
		setLocale(locale);
		mountComponent();

		const input = wrapper.find('input');
		await input.setValue('TestPlayer');
		await input.trigger('blur');
		expectSuccessLayout(input);

		await input.trigger('focus');
		expectDefaultLayout(input);

		await input.setValue('More Than 16 Characters');
		await input.trigger('blur');
		expectInvalidLayout(input, 'More Than 16 Characters', `nickname-max (${locale})`);

		await input.trigger('focus');
		expectDefaultLayout(input);

		wrapper.setProps({ serverError: 'nickname-invalid' });
		await nextTick();
		expectInvalidLayout(input, 'More Than 16 Characters', `nickname-invalid (${locale})`, true);

		wrapper.setProps({ serverError: null });
		await input.trigger('focus');
		await nextTick();
		expectDefaultLayout(input);
	});
});
