import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/join/[[id]].vue';
import { useGameStore } from '@/stores/game';
import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import {
	stubErrorCode,
	stubErrorNickname,
	stubGameInactive,
	stubGamePending,
} from '@tests/unit/setup/stubs';

describe('Join Game page', () => {
	const store = useGameStore();
	vi.spyOn(store, 'set').mockImplementation((game: Game) => {
		store.$state = structuredClone(game);
	});

	const url = '/api/games/';

	const setupPage = async (
		locale: string,
		route?: string
	): Promise<VueWrapper<InstanceType<typeof page>>> => {
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
			route: route ?? '/join',
		});
		return wrapper;
	};

	const triggerInput = async (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		id: string,
		name: string,
		submit: boolean,
		responseCode: number,
		responseData: Game | APIErrorResponse
	): Promise<void> => {
		server.use(
			http.put(url + id + '/join', (request) => {
				spyApi(request);
				return HttpResponse.json(responseData, { status: responseCode });
			})
		);

		const code = wrapper.findComponent({ name: 'Code' });
		const inputs = code.findAll('input');
		if (inputs.length > 0) {
			for (let i = 0; i < id.length; i++) {
				inputs[i].setValue(id[i]);
				inputs[i].trigger('keyup');
			}
			if (id.length > 0) {
				expect(code.emitted('update')).toBeTruthy();
				expect(code.emitted('update')?.at(-1)?.at(0)).toBe(id);
			}
		}
		const input = wrapper.findComponent({ name: 'Nickname' });
		await input.setValue(name);
		await input.find('input').trigger('input');
		expect(input.emitted('update:modelValue')).toBeTruthy();
		expect(input.emitted('update:modelValue')?.at(-1)?.at(0)).toBe(name);
		const button = wrapper.find('button');
		await button.trigger('click');
		await flushPromises();

		if (submit) {
			await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
			expect(spyApi).toHaveBeenCalled();
		} else {
			expect(spyApi).not.toHaveBeenCalled();
		}
		if (responseCode === 200) {
			expect(useGameStore().set).toHaveBeenCalledWith(responseData);

			const data: Game = responseData as Game;
			const game: Game = useGameStore().$state;
			if (data.pending !== undefined) {
				expect(game).toEqual(responseData);
			} else {
				expect(game).toEqual(
					expect.objectContaining({
						id: data.id,
						players: data.players,
					})
				);
			}
			await flushPromises();
			await nextTick();
		} else {
			expect(useGameStore().set).not.toHaveBeenCalled();
		}
	};

	const expectForm = (
		wrapper: VueWrapper<InstanceType<typeof page>>,
		locale: string,
		codeValidation?: string,
		nicknameValidation?: string,
		error?: boolean
	) => {
		expect(wrapper.text()).toContain(`join-now (${locale})`);
		expect(wrapper.findComponent({ name: 'Code' }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'Nickname' }).exists()).toBe(true);

		if (codeValidation) {
			expect(wrapper.findComponent({ name: 'Code' }).text()).toContain(codeValidation);
		}
		if (nicknameValidation) {
			expect(wrapper.findComponent({ name: 'Nickname' }).text()).toContain(
				nicknameValidation
			);
		}
		if (error !== undefined) {
			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBe(error);
		}
	};

	const expectWait = (wrapper: VueWrapper<InstanceType<typeof page>>, locale: string) => {
		expect(wrapper.text()).toContain(`you-are-waiting-to-be-admitted (${locale})`);
	};

	beforeEach(() => {
		sessionStorage.clear();
		useGameStore().$reset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it.each(['en', 'de'])('renders the initial form state', async (locale: string) => {
		const wrapper = await setupPage(locale);
		expectForm(wrapper, locale);
	});

	it.each(['en', 'de'])(
		'submits the form successfully for a pending request',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(
				wrapper,
				stubGamePending.id,
				stubGamePending.pending![0]!.nickname,
				true,
				200,
				stubGamePending
			);
			expectWait(wrapper, locale);
		}
	);

	it.each(['en', 'de'])(
		'submits the form successfully for an instant admission',
		async (locale: string) => {
			const wrapper = await setupPage(
				locale,
				`/join/${stubGameInactive.id}?invite=${stubGameInactive.players[0].nickname}`
			);

			await triggerInput(
				wrapper,
				stubGameInactive.id,
				stubGameInactive.players![1]!.nickname,
				true,
				200,
				stubGameInactive
			);
			//TODO: Re-enable this when the page has been created (it won't fire until it does)
			// expect(mockNavigate).toHaveBeenCalledWith(`/play/${stubGameInactive.id}`);
		}
	);

	it.each(['en', 'de'])(
		'will invalidate the form appropriately on code',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(wrapper, '', 'TestPlayer', false, 400, stubErrorNickname);
			expectForm(wrapper, locale, stubErrorCode.errors[0].message, undefined, false);
		}
	);

	it.each(['en', 'de'])(
		'will invalidate the form appropriately on nickname',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(wrapper, 'ABCD', 'Jim', false, 400, stubErrorNickname);
			expectForm(wrapper, locale, undefined, stubErrorNickname.errors[0].message, false);
		}
	);

	it.each(['en', 'de'])('handles API validation failures on code', async (locale: string) => {
		const wrapper = await setupPage(locale);
		await triggerInput(wrapper, 'ABCD', 'TestPlayer', true, 400, stubErrorCode);
		expectForm(wrapper, locale, stubErrorCode.errors[0].message, undefined, false);
	});

	it.each(['en', 'de'])(
		'handles API validation failures on player name',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(wrapper, 'ABCD', 'TestPlayer', true, 400, stubErrorNickname);
			expectForm(wrapper, locale, undefined, stubErrorNickname.errors[0].message, false);
		}
	);

	it.each(['en', 'de'])(
		'handles a 404 API response where the game has not been found',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(
				wrapper,
				'ABCD',
				'TestPlayer',
				true,
				404,
				GameIdNotFoundErrorResponse
			);
			expectForm(wrapper, locale, undefined, undefined, true);
		}
	);

	it.each(['en', 'de'])(
		'handles the scenario where the returned game does not include the player',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(wrapper, 'ABCD', 'TestPlayer', true, 200, stubGamePending);
			expectForm(wrapper, locale, undefined, undefined, true);
		}
	);

	it.each(['en', 'de'])('handles API errors', async (locale: string) => {
		const wrapper = await setupPage(locale);
		await triggerInput(wrapper, 'ABCD', 'TestPlayer', true, 500, UnexpectedErrorResponse);
		expectForm(wrapper, locale, undefined, undefined, true);
	});
});
