import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Population from '@/components/Population.vue';

import {
	stubHealer,
	stubMayor,
	stubVillager1,
	stubVillager6,
	stubVillager7,
	stubVillager8,
	stubWolf,
} from '@tests/common/stubs';
import { mockT, setLocalePath } from '@tests/unit/setup/i18n';

describe('Population', async () => {
	const test = async (
		locale: string,
		alive: Array<Player>,
		dead: Array<Player>,
		evicted: Array<Player>
	) => {
		setLocalePath(locale);
		const wrapper = await mountSuspended(Population, {
			props: {
				alive: alive,
				dead: dead,
				evicted: evicted,
			},
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		expect(wrapper.text()).toContain(`population (${locale}) : ${alive.length}`);
		for (const player of alive) {
			expect(wrapper.text()).toContain(player.nickname);
		}
		if (dead.length === 0) {
			expect(wrapper.text()).not.toContain('rip');
		} else {
			for (const player of dead) {
				expect(wrapper.text()).toContain(player.nickname);
			}
			const expression: RegExp = new RegExp('rip \\{.*?\\}  \\(' + locale + '\\)');
			expect(wrapper.text()).toMatch(expression);
		}
		if (evicted.length > 0) {
			for (const player of evicted) {
				expect(wrapper.text()).toContain(player.nickname);
			}
			const expression: RegExp = new RegExp('evicted \\{.*?\\}  \\(' + locale + '\\)');
			expect(wrapper.text()).toMatch(expression);
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])(
		'should mount successfully (with no dead and no evictees)',
		async (locale: string) => {
			await test(locale, [stubMayor, stubVillager1], [], []);
		}
	);

	it.each(['en', 'de'])(
		'should mount successfully (with dead but no evictees)',
		async (locale: string) => {
			await test(
				locale,
				[stubMayor, stubWolf, stubVillager6, stubVillager7],
				[stubHealer, stubVillager8],
				[]
			);
		}
	);

	it.each(['en', 'de'])(
		'should mount successfully (with evictees but no dead)',
		async (locale: string) => {
			await test(
				locale,
				[stubMayor, stubWolf, stubVillager6, stubVillager7],
				[],
				[stubHealer, stubVillager8]
			);
		}
	);

	it.each(['en', 'de'])(
		'should mount successfully (with dead and evictees)',
		async (locale: string) => {
			await test(
				locale,
				[stubWolf, stubVillager7],
				[stubMayor, stubVillager6],
				[stubHealer, stubVillager8]
			);
		}
	);
});
