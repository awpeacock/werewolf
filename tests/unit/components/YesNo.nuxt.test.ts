import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import YesNo from '@/components/YesNo.vue';

import { mockT } from '@tests/unit/setup/i18n';

describe('YesNo', async () => {
	const yes = vi.fn();
	const no = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('should mount successfully', async () => {
		const wrapper = await mountSuspended(YesNo, {
			props: {
				yes: yes,
				no: no,
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		expect(wrapper.findAll('span').length).toBe(2);
	});

	it('should trigger the correct method on clicking yes', async () => {
		const wrapper = await mountSuspended(YesNo, {
			props: {
				yes: yes,
				no: no,
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		const spans = wrapper.findAll('span');
		spans[0].trigger('click');
		expect(yes).toBeCalled();
	});

	it('should trigger the correct method on clicking no', async () => {
		const wrapper = await mountSuspended(YesNo, {
			props: {
				yes: yes,
				no: no,
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		const spans = wrapper.findAll('span');
		spans[1].trigger('click');
		expect(no).toBeCalled();
	});
});
