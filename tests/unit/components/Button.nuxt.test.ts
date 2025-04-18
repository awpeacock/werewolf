import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Button from '@/components/Button.vue';

import { mockT, mockUseLocalePath, setLocalePath } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink } from '@tests/unit/setup/navigation';

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
});
