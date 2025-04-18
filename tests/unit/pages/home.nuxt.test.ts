import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { RouterLinkStub, type VueWrapper } from '@vue/test-utils';

import page from '@/pages/index.vue';
import { useGameStore } from '@/stores/game';

import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubActiveGame } from '@tests/unit/setup/stubs';

describe('Home page', () => {
	const store = useGameStore();
	vi.spyOn(store, 'set').mockImplementation(() => {});

	const expectComponents = (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		locale: string,
		all: boolean
	) => {
		expect(wrapper.text()).toContain(`create-game (${locale})`);
		expect(wrapper.text()).toContain(`join-game (${locale})`);
		if (all) {
			expect(wrapper.text()).toContain(`resume-game (${locale})`);
		} else {
			expect(wrapper.text()).not.toContain(`resume-game (${locale})`);
		}

		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links).not.toBeNull();
		expect(links.length).toBe(all ? 3 : 2);
		expect(links[0]!.props('to')).toEqual({ path: '/create' });
		expect(links[1]!.props('to')).toEqual({ path: '/join' });
		if (all) {
			expect(links[2]!.props('to')).toEqual({ path: `/play/${stubActiveGame.id}` });
		}
	};

	beforeEach(() => {
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('renders the initial home page', async (locale: string) => {
		setLocale(locale);

		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: RouterLinkStub,
				},
			},
		});

		expectComponents(wrapper, locale, false);
	});

	it.each(['en', 'de'])('renders with an active game in session', async (locale: string) => {
		setLocale(locale);

		store.$state = stubActiveGame;

		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: RouterLinkStub,
				},
			},
		});

		expectComponents(wrapper, locale, true);
	});
});
