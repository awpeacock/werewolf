import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import Notifications from '@/components/Notifications.vue';

import {
	stubGameInactive,
	stubGameNew,
	stubGamePending,
	stubMayor,
	stubVillager1,
	stubVillager2,
} from '@tests/common/stubs';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockT, setLocalePath } from '@tests/unit/setup/i18n';
import { mockWSLatest, mockWSRemove } from '@tests/unit/setup/websocket';

type WebSocketType = 'join-request' | 'invite-accept' | 'admission';

describe('Notifications', async () => {
	const game = useGameStore();
	const player = usePlayerStore();

	const url = '/api/games/';

	const setupStores = (g: Game, p: Player) => {
		game.$reset();
		game.set(g);
		player.$reset();
		player.set(p);
	};

	const setupComponent = async (
		locale: string,
		game?: Game,
		player?: Player,
		pending?: Array<Player>,
		ws?: Nullable<WebSocketType>
	): Promise<VueWrapper<InstanceType<typeof Notifications>>> => {
		setLocalePath(locale);
		if (game && player) {
			setupStores(game, player);
		}

		const wrapper = await mountSuspended(Notifications, {
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});

		expectInitial(wrapper, game, player);
		if (player && pending) {
			await setupRequest(game, pending, ws);
			expectPending(wrapper, pending, player, ws);
		}
		return wrapper;
	};

	const expectInitial = (wrapper: VueWrapper, game?: Game, player?: Player) => {
		if (!game || !player || game.id === stubGameNew.id || player.id !== stubMayor.id) {
			expect(wrapper.text()).toEqual('');
			expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeFalsy();
		}
	};

	const setupRequest = async (
		game?: Game,
		pending?: Array<Player>,
		ws?: Nullable<WebSocketType>
	) => {
		if (ws !== undefined && pending) {
			for (const p of pending) {
				if (ws === null) {
					mockWSLatest.value = null;
				} else {
					mockWSLatest.value = {
						type: ws,
						game: game,
						player: p,
					};
				}
				await nextTick();
			}
		}
	};

	const expectPending = (
		wrapper: VueWrapper,
		pending: Array<Player>,
		player: Player,
		ws?: Nullable<'join-request' | 'invite-accept' | 'admission'>
	) => {
		const visible = player.id === stubMayor.id && (ws === undefined || ws === 'join-request');
		if (visible) {
			expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain(' waiting-to-be-admitted');

			for (const p of pending) {
				expect(wrapper.text()).toContain(p.nickname);
			}
		} else {
			expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeFalsy();
			for (const p of pending) {
				expect(wrapper.text()).not.toContain(p.nickname);
			}
		}
	};

	const triggerUpdate = async (
		wrapper: VueWrapper<InstanceType<typeof Notifications>>,
		admit: boolean,
		id: string,
		responseCode: number,
		responseData: Game | APIErrorResponse
	) => {
		let body;
		server.use(
			http.put(url + id + '/admit', async ({ request }) => {
				body = await request.json();
				spyApi(body);
				return HttpResponse.json(responseData, { status: responseCode });
			})
		);

		const yesno = wrapper.findComponent({ name: 'YesNo' });
		const buttons = yesno.findAll('span');
		expect(buttons.length).toBe(2);
		if (admit) {
			buttons[0].trigger('click');
		} else {
			buttons[1].trigger('click');
		}

		await flushPromises();

		expect(spyApi).toHaveBeenCalled();
		expect(spyApi).toHaveBeenCalledWith(expect.objectContaining({ admit: admit }));
		if (responseCode === 200) {
			expect(mockWSRemove).toBeCalled();
			const responseGame: Game = responseData as Game;
			if (!responseGame.pending || responseGame.pending?.length === 0) {
				expect(wrapper.text()).toEqual('');
				expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeFalsy();
			}
		} else {
			expect(mockWSRemove).not.toBeCalled();
			expect(wrapper.text()).toContain(stubVillager1.nickname);
			expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeTruthy();
			expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
			expect(wrapper.text()).toContain('unexpected-error');
		}
		return body;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		sessionStorage.clear();
	});

	it.each(['en', 'de'])('should mount successfully', async (locale: string) => {
		await setupComponent(locale);
	});

	it.each(['en', 'de'])(
		'should display existing requests for the mayor',
		async (locale: string) => {
			await setupComponent(locale, stubGamePending, stubMayor, [stubVillager1]);
		}
	);

	it.each(['en', 'de'])(
		'should hide existing requests for all but the mayor',
		async (locale: string) => {
			await setupComponent(locale, stubGamePending, stubVillager2, [stubVillager1]);
		}
	);

	it.each(['en', 'de'])(
		'should display incoming requests for the mayor',
		async (locale: string) => {
			await setupComponent(locale, stubGameNew, stubMayor, [stubVillager1], 'join-request');
		}
	);

	it.each(['en', 'de'])(
		'should NOT display incoming requests for other villagers',
		async (locale: string) => {
			await setupComponent(
				locale,
				stubGameNew,
				stubVillager1,
				[stubVillager2],
				'join-request'
			);
		}
	);

	it.each(['en', 'de'])(
		'should update game state on invitation acceptances',
		async (locale: string) => {
			await setupComponent(locale, stubGameNew, stubMayor, [stubVillager1], 'invite-accept');
		}
	);

	it.each(['en', 'de'])(
		'should ignore any events that are not join requests or invite accepts',
		async (locale: string) => {
			await setupComponent(locale, stubGameNew, stubMayor, [], 'admission');
		}
	);

	it.each(['en', 'de'])('should ignore any null events', async (locale: string) => {
		await setupComponent(locale, stubGameNew, stubMayor, [], null);
	});

	it.each(['en', 'de'])(
		'should trigger the correct update if admitted',
		async (locale: string) => {
			const wrapper = await setupComponent(
				locale,
				stubGameNew,
				stubMayor,
				[stubVillager1],
				'join-request'
			);

			const body: Undefinable<AdmissionBody> = await triggerUpdate(
				wrapper,
				true,
				stubGameNew.id,
				200,
				stubGameInactive
			);
			expect(body).toEqual({ auth: stubMayor.id, villager: stubVillager1.id, admit: true });
		}
	);

	it.each(['en', 'de'])('should trigger the correct update if denied', async (locale: string) => {
		const wrapper = await setupComponent(
			locale,
			stubGameNew,
			stubMayor,
			[stubVillager1],
			'join-request'
		);

		const body: Undefinable<AdmissionBody> = await triggerUpdate(
			wrapper,
			false,
			stubGameNew.id,
			200,
			stubGameNew
		);
		expect(body).toEqual({ auth: stubMayor.id, villager: stubVillager1.id, admit: false });
	});

	it.each(['en', 'de'])(
		'should correctly update for multiple requests',
		async (locale: string) => {
			const wrapper = await setupComponent(
				locale,
				stubGameNew,
				stubMayor,
				[stubVillager1, stubVillager2],
				'join-request'
			);

			setLocalePath(locale);
			setupStores(stubGameNew, stubMayor);

			let yesnos = wrapper.findAllComponents({ name: 'YesNo' });
			expect(yesnos.length).toBe(2);

			let body;
			server.use(
				http.put(url + stubGameNew.id + '/admit', async ({ request }) => {
					body = await request.json();
					spyApi(body);
					return HttpResponse.json(stubGameInactive, { status: 200 });
				})
			);

			const buttons = yesnos[1].findAll('span');
			expect(buttons.length).toBe(2);
			buttons[1].trigger('click');

			await flushPromises();

			expect(body).toEqual({ auth: stubMayor.id, villager: stubVillager2.id, admit: false });

			expect(wrapper.text()).toContain(stubVillager1.nickname);
			expect(wrapper.text()).not.toContain(stubVillager2.nickname);
			expect(wrapper.findComponent({ name: 'YesNo' }).exists()).toBeTruthy();
			yesnos = wrapper.findAllComponents({ name: 'YesNo' });
			expect(yesnos.length).toBe(1);
		}
	);

	it.each(['en', 'de'])('should handle errors correctly', async (locale: string) => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		const wrapper = await setupComponent(
			locale,
			stubGameNew,
			stubMayor,
			[stubVillager1],
			'join-request'
		);

		const body: Undefinable<AdmissionBody> = await triggerUpdate(
			wrapper,
			true,
			stubGameNew.id,
			400,
			stubGamePending
		);
		expect(body).toEqual({ auth: stubMayor.id, villager: stubVillager1.id, admit: true });
		expect(spyError).toBeCalled();
	});

	it.each(['en', 'de'])('remove the error message when clicked on', async (locale: string) => {
		const spyError = vi.spyOn(console, 'error').mockImplementation(() => null);
		const wrapper = await setupComponent(
			locale,
			stubGameNew,
			stubMayor,
			[stubVillager1],
			'join-request'
		);

		const body: Undefinable<AdmissionBody> = await triggerUpdate(
			wrapper,
			false,
			stubGameNew.id,
			500,
			stubGamePending
		);
		expect(body).toEqual({ auth: stubMayor.id, villager: stubVillager1.id, admit: false });

		const error = wrapper.findComponent({ name: 'Error' });
		await error.trigger('click');
		await nextTick();
		expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeFalsy();
		expect(spyError).toBeCalled();
	});
});
