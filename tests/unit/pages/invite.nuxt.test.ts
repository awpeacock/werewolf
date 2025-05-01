import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';

import page from '@/pages/create/invite.vue';
import { useGameStore } from '@/stores/game';
import IconCopy from '@/components/IconCopy.vue';
import IconMail from '@/components/IconMail.vue';
import IconShare from '@/components/IconShare.vue';

import { mockT, setLocale } from '@tests/unit/setup/i18n';
import { stubGameNew, stubMayor, stubVillager1 } from '@tests/unit/setup/stubs';

describe('Invite page', () => {
	const store = useGameStore();
	const mockShare = vi.fn();
	const mockWriteText = vi.fn();

	const setupPage = async (
		locale: string,
		hasShare: boolean,
		hasCanShare: boolean,
		hasClipboard: boolean,
		game?: Game,
		player?: Player
	): Promise<VueWrapper<InstanceType<typeof page>>> => {
		setLocale(locale);
		let share;
		if (hasShare) {
			share = mockShare;
		}
		Object.defineProperty(navigator, 'share', {
			value: share,
			configurable: true,
		});
		navigator.canShare = vi.fn().mockReturnValue(hasCanShare);
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
		const wrapper = await setupPage(locale, true, true, true, stubGameNew, stubMayor);

		expect(wrapper.text()).toContain(`invite-introduction (${locale})`);
		expect(wrapper.text()).toContain(`invite-instructions (${locale})`);
		expect(wrapper.text()).toContain(useGameStore().invite);
		expect(wrapper.text()).toContain(`go-back (${locale})`);

		expect(wrapper.findComponent(IconShare).exists()).toBeTruthy();
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
			const wrapper = await setupPage(locale, true, true, true);

			expect(wrapper.text()).toContain(`invite-no-game (${locale})`);
			expect(wrapper.text()).not.toContain(`invite-introduction (${locale})`);
			expect(wrapper.text()).toContain(`go-back (${locale})`);
		}
	);

	it.each(['en', 'de'])(
		'shows a warning page if the user is not the mayor the game being created',
		async (locale: string) => {
			const wrapper = await setupPage(locale, true, true, true, stubGameNew, stubVillager1);

			expect(wrapper.text()).toContain(`invite-not-mayor (${locale})`);
			expect(wrapper.text()).not.toContain(`invite-introduction (${locale})`);
			expect(wrapper.text()).toContain(`go-back (${locale})`);
		}
	);

	it.each(['en', 'de'])('uses the Web Share API to send a link', async (locale: string) => {
		// sessionStorage.setItem('create', JSON.stringify(stubStatus));
		const wrapper = await setupPage(locale, true, true, true, stubGameNew, stubMayor);

		expect(wrapper.findComponent(IconShare).exists()).toBeTruthy();
		const button = wrapper.findComponent(IconShare);
		await button.trigger('click');
		await flushPromises();

		expect(mockShare).toBeCalled();
	});

	it.each(['en', 'de'])(
		'hides the share icon for incompatible browsers',
		async (locale: string) => {
			const wrapper = await setupPage(locale, false, true, true, stubGameNew, stubMayor);

			expect(wrapper.findComponent(IconShare).exists()).toBeFalsy();
		}
	);

	it.each(['en', 'de'])('prevents sharing for incompatible data', async (locale: string) => {
		const wrapper = await setupPage(locale, true, false, true, stubGameNew, stubMayor);

		expect(wrapper.findComponent(IconShare).exists()).toBeTruthy();
		const button = wrapper.findComponent(IconShare);
		await button.trigger('click');
		await flushPromises();

		expect(mockShare).not.toBeCalled();
	});

	it.each(['en', 'de'])('triggers the "Copy to clipboard" action', async (locale: string) => {
		const wrapper = await setupPage(locale, true, true, true, stubGameNew, stubMayor);

		const icon = wrapper.findComponent(IconCopy);
		await icon.trigger('click');

		expect(mockWriteText).toBeCalled();
	});

	it.each(['en', 'de'])(
		'hides the "Copy to clipboard" icon for incompatible browsers',
		async (locale: string) => {
			const wrapper = await setupPage(locale, true, true, false, stubGameNew, stubMayor);

			expect(wrapper.findComponent(IconCopy).exists()).toBeFalsy();
		}
	);
});
