import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Population from '@/components/Population.vue';

import { mockT, setLocalePath } from '@tests/unit/setup/i18n';
import {
	stubHealer,
	stubMayor,
	stubVillager1,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/unit/setup/stubs';

describe('Population', async () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('should mount successfully (with no dead)', async (locale: string) => {
		setLocalePath(locale);

		const wrapper = await mountSuspended(Population, {
			props: {
				alive: [stubMayor, stubVillager1],
				dead: [],
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		expect(wrapper.text()).toContain(`population (${locale}) : 2`);
		expect(wrapper.text()).toContain(stubMayor.nickname);
		expect(wrapper.text()).toContain(stubVillager1.nickname);
		expect(wrapper.text()).not.toContain('rip');
	});

	it.each(['en', 'de'])('should mount successfully (with dead)', async (locale: string) => {
		setLocalePath(locale);

		const wrapper = await mountSuspended(Population, {
			props: {
				alive: [stubMayor, stubWolf, stubVillager6, stubVillager7],
				dead: [stubHealer, stubVillager8],
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		expect(wrapper.text()).toContain(`population (${locale}) : 4`);
		expect(wrapper.text()).toContain(stubMayor.nickname);
		expect(wrapper.text()).toContain(stubWolf.nickname);
		expect(wrapper.text()).toContain(stubVillager6.nickname);
		expect(wrapper.text()).toContain(stubVillager7.nickname);
		expect(wrapper.text()).toContain(stubHealer.nickname);
		expect(wrapper.text()).toContain(stubVillager8.nickname);
		const expression: RegExp = new RegExp('rip \\{.*?\\}  \\(' + locale + '\\)');
		expect(wrapper.text()).toMatch(expression);
	});
});
