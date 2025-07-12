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
			attachTo: document.body,
		});
	};

	const triggerInput = async (value: string) => {
		const input = wrapper.find('input');
		await input.setValue(value);
		wrapper.vm.validate();
		await nextTick();
		return input;
	};

	const expectDefaultLayout = (input: DOMWrapper<HTMLInputElement>) => {
		expect(input).not.toBeNull();
		expect(input.classes('border-yellow-200')).toBeTruthy();
		expect(wrapper.find('.bg-red-600').exists()).toBeFalsy();
	};

	const expectSuccessLayout = (input: DOMWrapper<HTMLInputElement>) => {
		expect(input).not.toBeNull();
		expect(input.classes('border-green-600')).toBeTruthy();
		expect(wrapper.find('.bg-red-600').exists()).toBeFalsy();
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
		wrapper.unmount();
	});

	it('should validate successfully when a valid name is entered', async () => {
		mountComponent();

		const input = await triggerInput('TestPlayer');

		expectSuccessLayout(input);
		expect(wrapper.props('modelValue')).toEqual('TestPlayer');
		wrapper.unmount();
	});

	it.each(['en', 'de'])(
		'should invalidate successfully when a name less than 5 characters is entered',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = await triggerInput('Test');

			expectInvalidLayout(input, 'Test', `nickname-min (${locale})`);
			wrapper.unmount();
		}
	);

	it.each(['en', 'de'])(
		'should invalidate successfully when a name more than 16 characters is entered',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = await triggerInput('Overly Long Test Nickname');

			expectInvalidLayout(input, 'Overly Long Test Nickname', `nickname-max (${locale})`);
			wrapper.unmount();
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
				wrapper.vm.validate();
				await nextTick();

				expectInvalidLayout(input, name, `nickname-invalid (${locale})`);
			}
			wrapper.unmount();
		}
	);

	it.each(['en', 'de'])(
		'should update successfully when invalidated externally',
		async (locale: string) => {
			setLocale(locale);
			mountComponent();

			const input = await triggerInput('ServerSide');

			wrapper.setProps({ error: 'nickname-invalid' });
			await nextTick();

			expectInvalidLayout(input, 'ServerSide', `nickname-invalid (${locale})`, true);
			wrapper.unmount();
		}
	);

	it.each(['en', 'de'])('should successfully reset when re-focused', async (locale: string) => {
		setLocale(locale);
		mountComponent();

		const input = await triggerInput('TestPlayer');

		expectSuccessLayout(input);

		await input.trigger('focus');
		expectDefaultLayout(input);

		await input.setValue('More Than 16 Characters');
		wrapper.vm.validate();
		await nextTick();
		expectInvalidLayout(input, 'More Than 16 Characters', `nickname-max (${locale})`);

		await input.trigger('focus');
		expectDefaultLayout(input);

		wrapper.setProps({ error: 'nickname-invalid' });
		await nextTick();
		expectInvalidLayout(input, 'More Than 16 Characters', `nickname-invalid (${locale})`, true);

		// And also try focus being called externally
		wrapper.setProps({ error: null });
		wrapper.vm.focus();
		await nextTick();
		expectDefaultLayout(input);
		wrapper.unmount();
	});
});
