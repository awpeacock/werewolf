import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';

import page from '@/pages/create/invite.vue';
import { useGameStore } from '@/stores/game';
import IconMail from '@/components/IconMail.vue';
import IconCopy from '@/components/IconCopy.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubInactiveGame, stubMayor, stubVillager } from '@tests/unit/setup/stubs';

describe('Invite page', () => {
	const store = useGameStore();
	const mockWriteText = vi.fn();

	const setupPage = async (
		locale: string,
		hasClipboard: boolean,
		game?: Game,
		player?: Player
	): Promise<VueWrapper<InstanceType<typeof page>>> => {
		setLocale(locale);
		let clipboard;
		if (hasClipboard) {
			clipboard = { writeText: mockWriteText };
		}
		Object.defineProperty(navigator, 'clipboard', {
			value: clipboard,
			writable: true,
		});

		if (game) {
			if (player) {
				sessionStorage.setItem('player', JSON.stringify(player));
			}
			store.set(game);
		}

		const wrapper = await mountSuspended(page, {
			global: {
				mocks: {
					$t: mockT,
				},
			},
		});
		return wrapper;
	};

	beforeEach(() => {
		sessionStorage.clear();
		store.$reset();
		vi.clearAllMocks();
	});

	it.each(['en', 'de'])('renders the initial state', async (locale: string) => {
		const wrapper = await setupPage(locale, true, stubInactiveGame, stubMayor);

		expect(wrapper.text()).toContain(`invite-introduction (${locale})`);
		expect(wrapper.text()).toContain(`invite-instructions (${locale})`);
		expect(wrapper.text()).toContain(useGameStore().invite);
		expect(wrapper.text()).toContain(`go-back (${locale})`);

		expect(wrapper.findComponent(IconMail).exists()).toBeTruthy();
		expect(wrapper.findComponent(IconCopy).exists()).toBeTruthy();

		const link = wrapper.find('a');
		expect(link.element.href).toContain('mailto');
		expect(link.element.href).toContain(useRequestURL().hostname);
		expect(link.element.href).toContain(useGameStore().invite);
	});

	it.each(['en', 'de'])(
		'shows a warning page if no game has been created',
		async (locale: string) => {
			const wrapper = await setupPage(locale, true);

			expect(wrapper.text()).toContain(`invite-no-game (${locale})`);
			expect(wrapper.text()).not.toContain(`invite-introduction (${locale})`);
			expect(wrapper.text()).toContain(`go-back (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'shows a warning page if the user is not the mayor the game being created',
		async (locale: string) => {
			const wrapper = await setupPage(locale, true, stubInactiveGame, stubVillager);

			expect(wrapper.text()).toContain(`invite-not-mayor (${locale})`);
			expect(wrapper.text()).not.toContain(`invite-introduction (${locale})`);
			expect(wrapper.text()).toContain(`go-back (${locale})`);
		}
	);

	it.each(['en', 'de'])('triggers the "Copy to clipboard" action', async (locale: string) => {
		const wrapper = await setupPage(locale, true, stubInactiveGame, stubMayor);

		const icon = wrapper.findComponent(IconCopy);
		await icon.trigger('click');

		expect(mockWriteText).toBeCalled();
	});

	it.each(['en', 'de'])(
		'hides the "Copy to clipboard" icon for incompatible browsers',
		async (locale: string) => {
			const wrapper = await setupPage(locale, false, stubInactiveGame, stubMayor);

			expect(wrapper.findComponent(IconCopy).exists()).not.toBeTruthy();
		}
	);
});
