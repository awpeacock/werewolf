import { expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import page from '@/pages/play/[[id]].vue';

import { waitFor } from '@tests/unit/setup/global';
import { server, spyApi } from '@tests/unit/setup/api';
import { mockGame } from '@tests/unit/setup/game';
import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubNuxtLink } from '@tests/unit/setup/navigation';
import { stubGameActive, stubHealer, stubWolf } from '@tests/common/stubs';

export const setupPage = async (
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
				NuxtLink: stubNuxtLink,
			},
		},
		route: route ?? '/play',
	});
	return wrapper;
};

export const triggerAction = async (
	wrapper: VueWrapper,
	action: 'start' | 'wolf' | 'healer' | 'vote',
	game: Game,
	player: Player,
	submit: boolean,
	responseCode?: number,
	responseData?: object
) => {
	let url = `/api/games/${game.id}/`;
	switch (action) {
		case 'start': {
			url += 'start';
			break;
		}
		case 'wolf':
		case 'healer': {
			url += 'night';
			break;
		}
		case 'vote': {
			url += 'day';
			break;
		}
	}

	let body;
	server.use(
		http.put(url, async ({ request }) => {
			body = await request.json();
			spyApi(body);
			return HttpResponse.json(responseData, { status: responseCode });
		})
	);

	const button = wrapper.find('a');
	button.trigger('click');
	await flushPromises();
	await nextTick();

	if (submit) {
		await waitFor(() => !wrapper.findComponent({ name: 'Spinner' }).exists());
		expect(spyApi).toHaveBeenCalled();
		switch (action) {
			case 'start': {
				expect(body).toEqual({ auth: player.id });
				break;
			}
			case 'wolf':
			case 'healer': {
				const target = useGameStore().findPlayer(button.text());
				expect(body).toEqual({
					role: action[0].toUpperCase() + action.substring(1),
					player: player.id,
					target: target!.id,
				});
				break;
			}
			case 'vote': {
				const target = useGameStore().findPlayer(button.text());
				expect(body).toEqual({ player: player.id, vote: target!.id });
				// Make sure we no longer have any voting options
				if (responseCode === 200) {
					const buttons = wrapper.findAll('a');
					for (const p of game.players) {
						const button = buttons.filter((b) => b.text().includes(p.nickname));
						expect(button.length).toBe(0);
					}
				}
				break;
			}
		}
	} else {
		expect(spyApi).not.toHaveBeenCalled();
	}
};

export const handleError = async (
	locale: string,
	code: number,
	response: APIErrorResponse,
	message: string
) => {
	useGameStore().set(structuredClone(stubGameActive));
	mockGame.getLatest = vi.fn().mockReturnValue(stubGameActive);
	const players = [stubWolf, stubHealer];
	const roles: Array<'wolf' | 'healer'> = ['wolf', 'healer'];
	for (let p = 0; p < players.length; p++) {
		usePlayerStore().set(structuredClone(players[p]));
		const wrapper = await setupPage(locale, '/play/' + stubGameActive.id);

		await wrapper.find('a').trigger('click');
		await flushPromises();

		const game = structuredClone(stubGameActive);
		game.activities?.push({
			wolf: roles[p] === 'wolf' ? stubGameActive.players.at(0)!.id : null,
			healer: roles[p] === 'healer' ? stubGameActive.players.at(0)!.id : null,
		});
		await triggerAction(wrapper, roles[p], stubGameActive, players[p], true, code, response);

		expect(wrapper.findComponent({ name: 'Error' }).exists()).toBeTruthy();
		expect(wrapper.text()).toContain(message);
	}
};
