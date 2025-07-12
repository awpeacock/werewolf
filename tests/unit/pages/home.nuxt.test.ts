import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, RouterLinkStub } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

import page from '@/pages/index.vue';
import { useGameStore } from '@/stores/game';

import {
	stubGameActive,
	stubGameBlank,
	stubGameInactive,
	stubMayor,
	stubPlayerBlank,
	stubVillager1,
	stubVillager2,
} from '@tests/common/stubs';
import { mockT, setLocale } from '@tests/unit/setup/i18n';

describe('Home page', () => {
	const game = useGameStore();
	const player = usePlayerStore();
	vi.spyOn(game, 'set').mockImplementation(() => {});
	const spyGame = vi.spyOn(game, '$reset');
	const spyPlayer = vi.spyOn(player, '$reset');

	const expectComponents = (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		locale: string,
		hasInactiveGame: boolean,
		hasActiveGame: boolean,
		hasValidPlayer: boolean
	) => {
		expect(wrapper.text()).toContain(`create-game (${locale})`);
		expect(wrapper.text()).toContain(`join-game (${locale})`);
		if (hasInactiveGame && hasValidPlayer) {
			expect(wrapper.text()).toContain(`play-game (${locale})`);
			expect(wrapper.text()).not.toContain(`resume-game (${locale})`);
		} else if (hasActiveGame && hasValidPlayer) {
			expect(wrapper.text()).not.toContain(`play-game (${locale})`);
			expect(wrapper.text()).toContain(`resume-game (${locale})`);
		} else {
			expect(wrapper.text()).not.toContain(`play-game (${locale})`);
			expect(wrapper.text()).not.toContain(`resume-game (${locale})`);
		}
		expect(wrapper.text()).toContain(`how-to-play (${locale})`);

		const links = wrapper.findAllComponents(RouterLinkStub);
		expect(links).not.toBeNull();
		expect(links.length).toBe((hasInactiveGame || hasActiveGame) && hasValidPlayer ? 4 : 3);
		expect(links[0]!.props('to')).toEqual({ path: '/create', query: {} });
		expect(links[1]!.props('to')).toEqual({ path: '/join', query: {} });
		if (hasInactiveGame && hasValidPlayer) {
			expect(links[2]!.props('to')).toEqual({
				path: `/play/${stubGameInactive.id}`,
				query: {},
			});
		}
		if (hasActiveGame && hasValidPlayer) {
			expect(links[2]!.props('to')).toEqual({
				path: `/play/${stubGameActive.id}`,
				query: {},
			});
		}
		const last = (hasInactiveGame || hasActiveGame) && hasValidPlayer ? 3 : 2;
		expect(links[last]!.props('to')).toEqual({
			path: `/instructions`,
			query: {},
		});
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

		expectComponents(wrapper, locale, false, false, false);
	});

	it.each(['en', 'de'])(
		'renders with an inactive game in session (and a valid player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameInactive;
			player.$state = stubMayor;

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

			expectComponents(wrapper, locale, true, false, true);
		}
	);

	it.each(['en', 'de'])(
		'renders with an inactive game in session (and an invalid player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameInactive;
			player.$state = stubVillager2;

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

			expectComponents(wrapper, locale, true, false, false);
		}
	);

	it.each(['en', 'de'])(
		'renders with an inactive game in session (and no player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameInactive;

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

			expectComponents(wrapper, locale, true, false, false);
		}
	);

	it.each(['en', 'de'])(
		'renders with an active game in session (and a valid player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;
			player.$state = stubMayor;

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

			expectComponents(wrapper, locale, false, true, true);
		}
	);

	it.each(['en', 'de'])(
		'renders with an active game in session (and an invalid player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;
			player.$state = stubVillager2;

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

			expectComponents(wrapper, locale, false, true, false);
		}
	);

	it.each(['en', 'de'])(
		'renders with an active game in session (and no player)',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;

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

			expectComponents(wrapper, locale, false, true, false);
		}
	);

	it.each(['en', 'de'])(
		'should reset game and player state if clicking "Create" when not mayor',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;
			player.$state = stubVillager1;

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

			const create = wrapper.findAll('a').at(0);
			create!.trigger('click');
			await nextTick();
			await flushPromises();

			expect(spyGame).toHaveBeenCalled();
			expect(spyPlayer).toHaveBeenCalled();
			expect(game.$state).toEqual(
				expect.objectContaining({
					id: stubGameBlank.id,
					active: stubGameBlank.active,
					players: stubGameBlank.players,
				})
			);
			expect(player.$state).toEqual(stubPlayerBlank);
		}
	);

	it.each(['en', 'de'])(
		'should NOT reset game and player state if clicking "Create" when mayor',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;
			player.$state = stubMayor;

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

			const create = wrapper.findAll('a').at(0);
			create!.trigger('click');
			await nextTick();
			await flushPromises();

			expect(spyGame).not.toHaveBeenCalled();
			expect(spyPlayer).not.toHaveBeenCalled();
			expect(game.$state).toEqual(
				expect.objectContaining({
					id: stubGameActive.id,
					active: stubGameActive.active,
					players: stubGameActive.players,
				})
			);
			expect(player.$state).toEqual(stubMayor);
		}
	);

	it.each(['en', 'de'])(
		'should reset game and player state if clicking "Join"',
		async (locale: string) => {
			setLocale(locale);

			game.$state = stubGameActive;
			player.$state = stubMayor;

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

			const join = wrapper.findAll('a').at(1);
			join!.trigger('click');
			await nextTick();
			await flushPromises();

			expect(spyGame).toHaveBeenCalled();
			expect(spyPlayer).toHaveBeenCalled();
			expect(game.$state).toEqual(
				expect.objectContaining({
					id: stubGameBlank.id,
					active: stubGameBlank.active,
					players: stubGameBlank.players,
				})
			);
			expect(player.$state).toEqual(stubPlayerBlank);
		}
	);
});
