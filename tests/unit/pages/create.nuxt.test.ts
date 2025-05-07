import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/create/index.vue';
import { useGameStore } from '@/stores/game';
import { UnexpectedErrorResponse } from '@/types/constants';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { mockNavigate, stubNuxtLink } from '@tests/unit/setup/navigation';
import { stubGameNew, stubErrorNickname, stubMayor } from '@tests/unit/setup/stubs';
import { mockWSConnect } from '@tests/unit/setup/websocket';

interface UnsafeCreateStatus {
	stage: number;
	code: Nullable<string>;
}

describe('Create Game page', () => {
	const stubStatus: UnsafeCreateStatus = {
		stage: 2,
		code: stubGameNew.id,
	};

	const storeGame = useGameStore();
	vi.spyOn(storeGame, 'set').mockImplementation((game: Game) => {
		storeGame.$state = game;
	});
	const storePlayer = usePlayerStore();
	vi.spyOn(storePlayer, 'set').mockImplementation((player: Player) => {
		storePlayer.$state = player;
	});

	const url = '/api/games';

	const setupPage = async (
		locale: string,
		responseCode?: number,
		responseData?: object
	): Promise<VueWrapper<InstanceType<typeof page>>> => {
		setLocale(locale);

		server.use(
			http.post(url, (request) => {
				spyApi(request);
				return HttpResponse.json(responseData, { status: responseCode });
			})
		);

		const wrapper = await mountSuspended(page, {
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

	const triggerInput = async (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		value: string,
		submit: boolean,
		expected?: Game
	): Promise<void> => {
		const input = wrapper.find('input');
		await input.setValue(value);
		await input.trigger('blur');
		const button = wrapper.find('button');
		await button.trigger('click');
		await flushPromises();

		if (submit) {
			await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
			expect(spyApi).toHaveBeenCalled();
		} else {
			expect(spyApi).not.toHaveBeenCalled();
		}
		if (expected) {
			expect(useGameStore().set).toHaveBeenCalledWith(stubGameNew);
			expect(usePlayerStore().set).toHaveBeenCalledWith(stubMayor);
			expect(sessionStorage.getItem('create')).not.toBeNull();

			const game: Game = useGameStore().$state;
			expect(game).toEqual(expect.objectContaining(stubGameNew));
			const player: Player = usePlayerStore().$state;
			expect(player).toEqual(expect.objectContaining(stubMayor));
			expect(mockWSConnect).toHaveBeenCalled();
		} else {
			expect(useGameStore().set).not.toHaveBeenCalled();
			expect(usePlayerStore().set).not.toHaveBeenCalled();
			expect(sessionStorage.getItem('create')).toBeNull();
			expect(mockWSConnect).not.toHaveBeenCalled();
		}
	};

	const expectStage1 = (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		locale: string,
		validation?: string,
		error?: boolean
	) => {
		expect(wrapper.text()).toContain(`create (${locale})`);
		expect(wrapper.findComponent({ name: 'Nickname' }).exists()).toBe(true);
		expect(wrapper.text()).not.toContain(`invite-players (${locale})`);
		expect(wrapper.text()).not.toContain(`play-game (${locale})`);

		if (validation) {
			expect(wrapper.findComponent({ name: 'Nickname' }).text()).toContain(validation);
		}
		if (error !== undefined) {
			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBe(error);
		}
	};

	const expectStage2 = (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		locale: string,
		code: string
	) => {
		expect(wrapper.text()).toContain(`invite-players (${locale})`);
		expect(wrapper.text()).toContain(`play-game (${locale})`);

		const links = wrapper.findAllComponents(stubNuxtLink);
		expect(links).not.toBeNull();
		expect(links.length).toBe(2);
		expect(links[1]!.props('to')).toEqual({ path: `/play/${code}`, query: {} });
	};

	beforeEach(() => {
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it.each(['en', 'de'])('renders the initial form state', async (locale: string) => {
		const wrapper = await setupPage(locale);
		expectStage1(wrapper, locale);
	});

	it.each(['en', 'de'])('submits the form successfully', async (locale: string) => {
		const wrapper = await setupPage(locale, 200, stubGameNew);
		await triggerInput(wrapper, 'TestPlayer', true, stubGameNew);
		expectStage2(wrapper, locale, stubGameNew.id);
	});

	it.each(['en', 'de'])('will invalidate the form appropriately', async (locale: string) => {
		const wrapper = await setupPage(locale, 400, stubErrorNickname);
		await triggerInput(wrapper, 'Jim', false);
		expectStage1(wrapper, locale, stubErrorNickname.errors[0].message, false);
	});

	it.each(['en', 'de'])('handles API validation failures', async (locale: string) => {
		const wrapper = await setupPage(locale, 400, stubErrorNickname);
		await triggerInput(wrapper, 'TestPlayer', true);
		expectStage1(wrapper, locale, stubErrorNickname.errors[0].message, false);
	});

	it.each(['en', 'de'])('handles API errors', async (locale: string) => {
		const wrapper = await setupPage(locale, 500, UnexpectedErrorResponse);
		await triggerInput(wrapper, 'TestPlayer', true);
		expectStage1(wrapper, locale, undefined, true);
	});

	it.each(['en', 'de'])(
		'moves to stage 2 if an inactive game is on the session',
		async (locale: string) => {
			sessionStorage.setItem('create', JSON.stringify(stubStatus));
			const wrapper = await setupPage(locale);
			expect(sessionStorage.getItem('create')).toContain(JSON.stringify(stubStatus));
			expectStage2(wrapper, locale, stubGameNew.id);
		}
	);

	it.each(['en', 'de'])('routes to the invite page', async (locale: string) => {
		setLocale(locale);
		sessionStorage.setItem('create', JSON.stringify(stubStatus));
		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
				stubs: {
					NuxtLink: stubNuxtLink,
				},
			},
		});
		expectStage2(wrapper, locale, stubGameNew.id);

		const button = wrapper.find('button[data-test="invite-button"]');
		await button.trigger('click');
		await flushPromises();

		expect(mockNavigate).toHaveBeenCalled();
	});

	it.each(['en', 'de'])(
		'will reset to stage 1 if any stage 2 mandatory data is not present',
		async (locale: string) => {
			const codes = [null, '', 'XXXX'];
			for (const code of codes) {
				const status: UnsafeCreateStatus = {
					stage: 2,
					code: code,
				};
				sessionStorage.setItem('create', JSON.stringify(status));
				const wrapper = await setupPage(locale);
				expect(sessionStorage.getItem('create')).toBeNull();
				expectStage1(wrapper, locale);
			}
		}
	);
});
