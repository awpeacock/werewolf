import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, RouterLinkStub } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/join/[[id]].vue';
import { useGameStore } from '@/stores/game';
import { GameIdNotFoundErrorResponse, UnexpectedErrorResponse } from '@/types/constants';

import {
	stubErrorCode,
	stubErrorNickname,
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubPlayerBlank,
	stubVillager1,
	stubVillager2,
} from '@tests/common/stubs';
import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { mockWSDisconnect, mockWSLatest } from '@tests/unit/setup/websocket';

describe('Join Game page', () => {
	const storeGame = useGameStore();
	const spyGame = vi.spyOn(storeGame, 'set').mockImplementation((game: Game) => {
		storeGame.$state = { ...game };
	});
	const storePlayer = usePlayerStore();
	const spyPlayer = vi.spyOn(storePlayer, 'set').mockImplementation((player: Player) => {
		storePlayer.$state = { ...player };
	});
	vi.spyOn(storePlayer, '$reset').mockImplementation(() => {
		storePlayer.$state = { ...stubPlayerBlank };
	});

	const url = '/api/games/';

	const reset = () => {
		sessionStorage.clear();
		useGameStore().$reset();
		usePlayerStore().$reset();
	};

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
		await flushPromises();
		await nextTick();
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
		let body;
		server.use(
			http.put(url + id + '/join', async ({ request }) => {
				body = await request.json();
				spyApi(body);
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
		const button = wrapper.find('a');
		await button.trigger('click');
		await flushPromises();

		if (submit) {
			await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
			expect(spyApi).toHaveBeenCalled();

			const expected: JoinRequestBody = {
				villager: name.trim(),
			};
			expect(body).toEqual(expected);
		} else {
			expect(spyApi).not.toHaveBeenCalled();
		}
		if (responseCode === 200) {
			expect(spyGame).toHaveBeenCalledWith(responseData);
			if (JSON.stringify(responseData).includes(name.trim())) {
				expect(spyPlayer).toHaveBeenCalledWith(
					expect.objectContaining({ nickname: name.trim(), roles: [] })
				);
			}

			const data: Game = responseData as Game;
			const game: Game = useGameStore().$state;
			if (data.pending !== undefined) {
				expect(game).toMatchObject(responseData);
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
			expect(spyGame).not.toHaveBeenCalled();
			expect(spyPlayer).not.toHaveBeenCalled();
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
		waitFor(() => wrapper.text().includes(`you-are-waiting-to-be-admitted (${locale})`));
		expect(wrapper.text()).toContain(`you-are-waiting-to-be-admitted (${locale})`);
	};

	const expectAdmitted = (wrapper: VueWrapper<InstanceType<typeof page>>, locale: string) => {
		waitFor(() => wrapper.text().includes(`you-are-in (${locale})`));
		expect(wrapper.text()).toContain(`you-are-in (${locale})`);
	};

	const expectDenied = (wrapper: VueWrapper<InstanceType<typeof page>>, locale: string) => {
		waitFor(() => wrapper.text().includes(`denied (${locale})`));
		expect(wrapper.text()).toContain(`denied (${locale})`);
	};

	beforeEach(() => {
		reset();
		vi.clearAllMocks();
		// Each page visit will call this API now
		server.use(
			http.get('/api/games/:code/', async (request) => {
				const { code } = request.params;
				spyApi(request);
				switch (code) {
					case stubGamePending.id: {
						return HttpResponse.json(stubGamePending, { status: 200 });
					}
					case stubGameInactive.id: {
						return HttpResponse.json(stubGameInactive, { status: 200 });
					}
					default: {
						return HttpResponse.json(GameIdNotFoundErrorResponse, { status: 404 });
					}
				}
			})
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it.each(['en', 'de'])('renders the initial form state', async (locale: string) => {
		const wrapper = await setupPage(locale);
		expectForm(wrapper, locale);
	});

	it.each(['en', 'de'])(
		'renders the correct state if pending progress in session',
		async (locale: string) => {
			useGameStore().set(stubGamePending);
			usePlayerStore().set(stubVillager1);
			const wrapper = await setupPage(locale);
			expectWait(wrapper, locale);
		}
	);

	it.each(['en', 'de'])(
		'renders the correct state if admitted progress in session',
		async (locale: string) => {
			useGameStore().set(stubGameInactive);
			usePlayerStore().set(stubVillager1);
			const wrapper = await setupPage(locale);
			expectAdmitted(wrapper, locale);
		}
	);

	it.each(['en', 'de'])(
		'renders the correct state if denied progress in session',
		async (locale: string) => {
			useGameStore().set(stubGameInactive);
			usePlayerStore().set(stubVillager2);
			const wrapper = await setupPage(locale);
			expectDenied(wrapper, locale);
		}
	);

	it.each(['en', 'de'])(
		'submits the form successfully for a pending request',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(
				wrapper,
				stubGamePending.id,
				stubGamePending.pending![0].nickname,
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
			const router = useRouter();
			const spyPush = vi.spyOn(router, 'push');

			const wrapper = await setupPage(
				locale,
				`/join/${stubGameInactive.id}?invite=${stubGameInactive.players[0].nickname}`
			);

			await triggerInput(
				wrapper,
				stubGameInactive.id,
				stubGameInactive.players[1].nickname,
				true,
				200,
				stubGameInactive
			);
			expect(spyPush).toHaveBeenCalledWith(`/play/${stubGameInactive.id}`);
		}
	);

	it.each(['en', 'de'])('trims the nickname where necessary', async (locale: string) => {
		const names = [
			stubGamePending.pending![0].nickname + ' ',
			' ' + stubGamePending.pending![0].nickname,
			' ' + stubGamePending.pending![0].nickname + ' ',
		];
		for (const name of names) {
			reset();
			const wrapper = await setupPage(locale);
			await triggerInput(wrapper, stubGamePending.id, name, true, 200, stubGamePending);
			expectWait(wrapper, locale);
			wrapper.unmount();
		}
	});

	it.each(['en', 'de'])(
		'reacts appropriately when an admitted response is published to a join request',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(
				wrapper,
				stubGamePending.id,
				stubGamePending.pending![0].nickname,
				true,
				200,
				stubGamePending
			);

			mockWSLatest.value = {
				type: 'admission',
				game: stubGamePending,
				response: true,
			};
			await flushPromises();

			expectAdmitted(wrapper, locale);
		}
	);

	it.each(['en', 'de'])(
		'reacts appropriately when a denied response is published to a join request',
		async (locale: string) => {
			const wrapper = await setupPage(locale);
			await triggerInput(
				wrapper,
				stubGamePending.id,
				stubGamePending.pending![0].nickname,
				true,
				200,
				stubGamePending
			);

			mockWSLatest.value = {
				type: 'admission',
				game: stubGameNew,
				response: false,
			};
			await flushPromises();

			expect(mockWSDisconnect).toBeCalled();
			expect(usePlayerStore().$reset).toBeCalled();
			expectDenied(wrapper, locale);

			const button = wrapper.find('a');
			await button.trigger('click');
			await flushPromises();

			expectForm(wrapper, locale);
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

	it.each(['en', 'de'])('ignores join requests', async (locale: string) => {
		const wrapper = await setupPage(locale);
		await triggerInput(
			wrapper,
			stubGamePending.id,
			stubGamePending.pending![0].nickname,
			true,
			200,
			stubGamePending
		);

		mockWSLatest.value = {
			type: 'join-request',
			game: stubGamePending,
			player: stubVillager2,
		};
		await flushPromises();

		expectWait(wrapper, locale);
	});
});
