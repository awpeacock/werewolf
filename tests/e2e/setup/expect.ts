import { expect as base } from '@playwright/test';
import type { Page } from '@playwright/test';

import { Role } from '@/types/enums';

const getLocale = async (page: Page) => {
	let locale = 'en';

	const path = new URL(page.url()).pathname;
	const matches = /^\/(\w{2})\//.exec(path);
	if (matches) {
		locale = matches[1];
	} else {
		const homepage = /^\/(\w{2})$/.exec(path);
		if (homepage) {
			locale = homepage[1];
		}
	}

	const { default: i18n } = await import(`@/i18n/locales/${locale}.json`, {
		with: { type: 'json' },
	});

	return {
		translate: (label: string) => i18n[label],
	};
};

export const expect = base.extend({
	async toMatchPage(received: Page, url: string, title: string, heading?: string) {
		const locale = await getLocale(received);
		if (!heading) {
			heading = title;
		}

		// First, match the URL
		const regex =
			url === '/'
				? new RegExp(`(/[a-z]{2})?${url}?(/[A-Z0-9]{4})?(\\?.*)?$`)
				: new RegExp(`(/[a-z]{2})?${url}(/[A-Z0-9]{4})?(\\?.*)?$`);
		await received.waitForURL(regex);
		const path = new URL(received.url()).pathname;
		if (!path.includes(url)) {
			return {
				pass: false,
				message: () => `URL does not match ${url} (${path})`,
			};
		}

		// Then, match the page title
		await expect(received).toHaveTitle(new RegExp(locale.translate(title)));

		// Finally, match the heading
		const el = received.getByRole('heading', { name: locale.translate(heading), exact: true });
		await el.waitFor({ state: 'visible', timeout: 10000 });

		return {
			pass: true,
			message: () => `Page is ${url}`,
		};
	},

	async toBeHomePage(received: Page) {
		await expect(received).toMatchPage('/', 'werewolf-game', 'werewolf');
		const locale = await getLocale(received);

		await expect(
			received.getByRole('link', { name: locale.translate('join-game') })
		).toBeVisible();
		await expect(
			received.getByRole('link', { name: locale.translate('how-to-play') })
		).toBeVisible();
		await expect(
			received.getByRole('link', { name: locale.translate('resume-game') })
		).not.toBeVisible();

		return {
			pass: true,
			message: () => `page IS homepage`,
		};
	},

	async toBeCreatePage(received: Page) {
		await expect(received).toMatchPage('/create', 'create-game');
		return {
			pass: true,
			message: () => `page IS Create page`,
		};
	},

	async toBeInvitePage(received: Page) {
		await expect(received).toMatchPage('/create/invite', 'invite-players');
		return {
			pass: true,
			message: () => `page IS Invite page`,
		};
	},

	async toBeJoinPage(received: Page) {
		await expect(received).toMatchPage('/join', 'join-game');
		return {
			pass: true,
			message: () => `page IS Join page`,
		};
	},

	async toBePlayPage(received: Page, code?: string) {
		if (code) {
			await expect(received).toMatchPage(`/play/${code}`, 'play-game');
		} else {
			await expect(received).toMatchPage('/play', 'play-game');
		}
		return {
			pass: true,
			message: () => `page IS Play page`,
		};
	},

	async toBeRolePage(received: Page, role?: Role) {
		await expect(received).toBePlayPage();

		await expect(received).toMatchText(['the-game-is-under-way', 'you-are']);
		if (role) {
			switch (role) {
				case Role.WOLF: {
					await expect(received).toMatchText('the-wolf', { translate: 'UPPER' });
					break;
				}
				case Role.HEALER: {
					await expect(received).toMatchText('the-healer', { translate: 'UPPER' });
					break;
				}
				default: {
					await expect(received).toMatchText('a-villager', { translate: 'UPPER' });
				}
			}
		}
		return {
			pass: true,
			message: () => `page IS the role page`,
		};
	},

	async toBeInstructionsPage(received: Page) {
		await expect(received).toMatchPage('/instructions', 'how-to-play');
		const locale = await getLocale(received);

		const image = received.getByAltText(locale.translate('reading-werewolf-alt-text'));
		await expect(image).toBeVisible();
		await expect(image).toHaveAttribute('src', '/images/village/reading-werewolf.webp');
		await expect(received.getByText(locale.translate('instructions-game-end'))).toBeVisible();
		return {
			pass: true,
			message: () => `page IS How to Play page`,
		};
	},

	async toBeErrorPage(received: Page, error: string) {
		const locale = await getLocale(received);

		const el = received.getByRole('heading', { name: locale.translate(error) });
		await el.waitFor({ state: 'visible', timeout: 10000 });

		const src = error === 'page-not-found' ? 'lost-werewolf' : 'dead-werewolf';
		const image = received.getByAltText(locale.translate(`${src}-alt-text`));
		await expect(image).toBeVisible();
		await expect(image).toHaveAttribute('src', `/images/village/${src}.webp`);
		return {
			pass: true,
			message: () => `page IS an error page (${error === 'page-not-found' ? '404' : '500'})`,
		};
	},

	async toHaveCreatedGame(received: Page, code?: string) {
		const isNot = this?.isNot ?? false;
		const locale = await getLocale(received);

		await expect(received).toBeCreatePage();

		const chars = received.getByTestId('code-char');
		if (isNot) {
			await expect(chars).toHaveCount(0);
		} else {
			await expect(chars).toHaveCount(4);
		}
		const spans = await chars.all();
		for (let c = 0; c < spans.length; c++) {
			await expect(spans[c]).toBeAttached();
			expect(await spans[c].evaluate((node) => node.tagName)).toBe('SPAN');
			if (code) {
				await expect(spans[c]).toHaveText(code[c]);
			}
		}
		if (isNot) {
			await expect(
				received.getByRole('link', { name: locale.translate('invite-players') })
			).not.toBeVisible();
		} else {
			await expect(
				received.getByRole('link', { name: locale.translate('invite-players') })
			).toBeVisible();
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Game was not created' : 'Game was successfully created'),
		};
	},

	async toHaveJoinedGame(received: Page) {
		const isNot = this?.isNot ?? false;

		await expect(received).toBeJoinPage();

		const text = ['welcome-to-lycanville', 'you-are-waiting-to-be-admitted', 'you-are-in'];
		if (isNot) {
			await expect(received).not.toMatchText(text, { condition: 'OR' });
		} else {
			await expect(received).toMatchText(text, { condition: 'OR' });
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Join attempt failed' : 'Join attempt succeeded'),
		};
	},

	async toBeAwaitingAdmittance(received: Page, name: string) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await received.getByTestId('join-name').getByText(name).waitFor({ state: 'hidden' });
		} else {
			await received.getByTestId('join-name').getByText(name).waitFor({ state: 'visible' });
		}
		return {
			pass: !isNot,
			message: () =>
				isNot ? 'Player is not waiting admittance' : 'Player is waiting admittance',
		};
	},

	async toBeAdmitted(received: Page) {
		const isNot = this?.isNot ?? false;

		// Can't check the page URL - could still be on join or straight through to play
		if (isNot) {
			await expect(received).not.toMatchText(['welcome-to-lycanville', 'you-are-in'], {
				condition: 'OR',
			});
		} else {
			await expect(received).toMatchText(['welcome-to-lycanville', 'you-are-in'], {
				condition: 'OR',
			});
			await expect(received).not.toMatchText(
				['you-are-waiting-to-be-admitted', 'mayor-has-rejected-your-request'],
				{ condition: 'OR', replacements: { mayor: '' } }
			);
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Player is not admitted' : 'Player is admitted'),
		};
	},

	async toBeDenied(received: Page) {
		const isNot = this?.isNot ?? false;

		// Can't check the page URL - could still be on join or straight through to play
		if (isNot) {
			await expect(received).not.toMatchText('mayor-has-rejected-your-request', {
				replacements: { mayor: '' },
			});
		} else {
			await expect(received).toMatchText('mayor-has-rejected-your-request', {
				replacements: { mayor: '' },
			});
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Player is not denied' : 'Player is denied'),
		};
	},

	async toBeWaiting(received: Page) {
		await expect(received).toBePlayPage();
		await expect(received).toMatchText('welcome-to-lycanville');
		await expect(received).toHaveBouncingDots();
		return {
			pass: true,
			message: () => 'Player is waiting to play',
		};
	},

	async toHaveJoinRequests(received: Page, count: number) {
		await expect(received.getByTestId('join-name')).toHaveCount(count);
		await expect(received.getByTestId('yes')).toHaveCount(count);
		await expect(received.getByTestId('no')).toHaveCount(count);
		return {
			pass: true,
			message: () => `Game has ${count} outstanding join requests`,
		};
	},

	async toBeReady(received: Page) {
		const isNot = this?.isNot ?? false;
		const locale = await getLocale(received);

		const start = received.getByRole('link', { name: locale.translate('start-game') });
		await start.waitFor({ state: 'visible' });
		const clazz = await start.getAttribute('class');
		if (isNot) {
			expect(clazz).toContain('border-stone-900');
			expect(clazz).toContain('bg-stone-400');
			expect(clazz).toContain('text-stone-900');
		} else {
			expect(clazz).toContain('border-yellow-200');
			expect(clazz).toContain('bg-yellow-600');
			expect(clazz).toContain('text-yellow-100');
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Game is not ready to start' : 'Game is ready to start'),
		};
	},

	async toBeNight(received: Page) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await expect(received).not.toMatchText('night-descends');
		} else {
			await expect(received).toMatchText('night-descends');
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'It is not night time' : 'It is night time'),
		};
	},

	async toBeDay(received: Page) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await expect(received).not.toMatchText(
				['activity-summary-saved', 'activity-summary-not-saved'],
				{ condition: 'OR', replacements: { victim: '[\\w\\s]*' } }
			);
		} else {
			await expect(received).toMatchText(
				['activity-summary-saved', 'activity-summary-not-saved'],
				{ condition: 'OR', replacements: { victim: '[\\w\\s]*' } }
			);
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'It is not day time' : 'It is day time'),
		};
	},

	async toBeMakingDecision(received: Page) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await expect(received).not.toMatchText(
				['make-your-decision-the-wolf', 'make-your-decision-the-healer'],
				{ condition: 'OR' }
			);
		} else {
			await expect(received).toMatchText(
				['make-your-decision-the-wolf', 'make-your-decision-the-healer'],
				{ condition: 'OR' }
			);
		}
		return {
			pass: !isNot,
			message: () =>
				isNot
					? 'Player is not required to make a decision'
					: 'Player is required to make a decision',
		};
	},

	async toHaveMadeDecision(received: Page) {
		await expect(received).toMatchText(
			['you-have-chosen', 'activity-summary-saved', 'activity-summary-not-saved'],
			{ condition: 'OR', replacements: { wait: '[\\w\\s]*', victim: '[\\w\\s]*' } }
		);
		return {
			pass: true,
			message: () => 'Player has made a decision',
		};
	},

	async toHaveBeenKilled(received: Page, name?: string) {
		if (name) {
			await expect(received).toMatchText('activity-summary-not-saved', {
				replacements: { victim: name },
			});
		} else {
			await expect(received).toMatchText('activity-summary-saved');
		}
		return {
			pass: true,
			message: () => (name ? `${name} has been killed` : 'Nobody has been killed'),
		};
	},

	async toBeVoting(received: Page) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await expect(received).toMatchText(
				[
					'you-cannot-vote-as-you-are-dead',
					'you-cannot-vote-as-you-have-been-evicted',
					'you-have-evicted',
					'you-have-evicted-nobody',
				],
				{
					condition: 'OR',
					replacements: { evicted: '[\\w\\s]*' },
				}
			);
		} else {
			await expect(received).toMatchText('time-for-the-village-to-vote');
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Player is voting' : 'Player is not voting'),
		};
	},

	async toHaveVoted(received: Page) {
		await expect(received).toMatchText(
			[
				'you-have-voted',
				'you-have-not-chosen-the-wolf',
				'you-have-been-evicted',
				'we-wait',
				'game-over',
			],
			{ condition: 'OR' }
		);
		return {
			pass: true,
			message: () => 'Player has voted',
		};
	},

	async toHaveEvicted(received: Page, name?: string) {
		if (name) {
			await expect(received).toMatchText('you-have-evicted', {
				replacements: { evicted: name },
			});
		} else {
			await expect(received).toMatchText('you-have-evicted-nobody');
		}
		return {
			pass: true,
			message: () => (name ? `${name} has been evicted` : 'Nobody has been evicted'),
		};
	},

	async toHaveBeenEvicted(received: Page) {
		const isNot = this?.isNot ?? false;

		if (isNot) {
			await expect(received).not.toMatchText('you-have-been-evicted');
		} else {
			await expect(received).toMatchText('you-have-been-evicted');
		}
		return {
			pass: !isNot,
			message: () =>
				isNot ? 'The player has NOT been evicted' : 'The player has been evicted',
		};
	},

	async toBeFinished(received: Page) {
		const isNot = this?.isNot ?? false;

		const text = [
			'congratulations-wolf',
			'you-lost-wolf',
			'congratulations-village',
			'you-lost-village',
		];
		if (isNot) {
			await expect(received).not.toMatchText('game-over');
			await expect(received).not.toMatchText(text, { condition: 'OR' });
		} else {
			await expect(received).toMatchText('game-over');
			await expect(received).toMatchText(text, { condition: 'OR' });
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'The game is NOT over' : 'The game IS over'),
		};
	},

	async toHaveWon(received: Page, who: 'wolf' | 'village', wolf?: string) {
		const isNot = this?.isNot ?? false;

		const text = isNot ? [`you-lost-${who}`] : [`congratulations-${who}`];
		if (who !== 'wolf') {
			text.push('the-wolf-was');
		}
		await expect(received).toMatchText(text, { replacements: { wolf: wolf } });
		return {
			pass: !isNot,
			message: () => (isNot ? 'Player won' : 'Player lost'),
		};
	},

	async toValidateNickname(received: Page, value?: string) {
		const isNot = this?.isNot ?? false;

		const errors: Record<string, string> = {
			'': 'nickname-required',
			' ': 'nickname-min',
			'A B': 'nickname-min',
			'<script>': 'nickname-invalid',
			'"Nope";': 'nickname-invalid',
		};

		const values: Array<string> = [];
		if (value) {
			values.push(value);
		} else {
			for (const key of Object.keys(errors)) {
				values.push(key);
			}
		}

		for (const nickname of values) {
			const input = received.getByTestId('nickname-input');
			await expect(input).toBeVisible();
			await input.clear();
			await input.focus();
			await expect(received.getByTestId('nickname-error')).not.toBeVisible();
			await received.keyboard.type(nickname, { delay: 50 });
			await input.blur();
			await input.focus();
			await received.keyboard.press('Backspace');
			await received.keyboard.type(nickname.charAt(nickname.length - 1));
			await expect(input).toHaveValue(nickname);
			await input.blur();

			if (isNot) {
				if (errors[nickname]) {
					await expect(received).toHaveError(errors[nickname]!);
					await expect(received.getByTestId('nickname-error')).toBeVisible();
				} else {
					await expect(received.getByTestId('nickname-error')).not.toBeVisible();
				}
			} else {
				await expect(received.getByTestId('nickname-error')).not.toBeVisible();
			}
		}

		return {
			pass: !isNot,
			message: () =>
				isNot ? 'Nickname was invalidated' : 'Nickname was successfully validated',
		};
	},

	async toValidateCode(received: Page, value?: string) {
		const isNot = this?.isNot ?? false;

		const inputs = await received.locator('input[data-testid="code-char"]').all();

		const button = received.getByTestId('join-button');
		await expect(button).toBeVisible();

		if (isNot) {
			const code = 'ABCD';
			for (let c = 0; c < 4; c++) {
				await inputs[c].clear();
			}
			await button.click();
			await expect(received).toHaveError('code-required');
			await expect(received.getByTestId('code-error')).toBeVisible();

			await inputs[0].focus();
			await inputs[0].press(code[0]);
			await button.click();
			await expect(received).toHaveError('code-no-spaces');
			await expect(received.getByTestId('code-error')).toBeVisible();

			await inputs[2].focus();
			await inputs[2].press(code[2]);
			await inputs[3].press(code[3]);
			await button.click();
			await expect(received).toHaveError('code-no-spaces');
			await expect(received.getByTestId('code-error')).toBeVisible();

			await inputs[1].fill(' ');
			await button.click();
			await expect(received).toHaveError('code-no-spaces');
			await expect(received.getByTestId('code-error')).toBeVisible();

			await inputs[1].focus();
			await inputs[1].press('-');
			expect(inputs[1].innerHTML()).not.toEqual('-');

			await inputs[1].fill('-');
			await button.click();
			await expect(received).toHaveError('code-invalid');
			await expect(received.getByTestId('code-error')).toBeVisible();
		} else {
			for (let c = 0; c < 4; c++) {
				await inputs[c].clear();
			}
			await inputs[0].focus();
			for (let c = 0; c < 4; c++) {
				await received.keyboard.down(value![c]);
				await received.keyboard.up(value![c]);
				await expect(inputs[c]).toHaveValue(value![c]);
				if (c < 3) {
					await expect(inputs[c + 1]).toBeFocused();
				} else {
					await expect(received.getByTestId('nickname-input')).toBeFocused();
				}
			}
			await expect(received.getByTestId('code-error')).not.toBeVisible();
		}

		return {
			pass: !isNot,
			message: () => (isNot ? 'Code was invalidated' : 'Code was successfully validated'),
		};
	},

	async toMatchText(
		received: Page,
		expected: string | Array<string>,
		options?: {
			condition?: 'AND' | 'OR';
			translate?: 'UPPER';
			replacements?: Record<string, Undefinable<string>>;
		}
	) {
		const isNot = this?.isNot ?? false;
		const locale = await getLocale(received);

		if (!Array.isArray(expected)) {
			expected = [expected];
		}
		for (let t = 0; t < expected.length; t++) {
			expected[t] = locale.translate(expected[t]).replace(/\s+/g, ' ').trim();
			if (options?.translate === 'UPPER') {
				expected[t] = expected[t].toUpperCase();
			}
			if (options?.replacements) {
				for (const key of Object.keys(options.replacements)) {
					if (options.replacements[key] !== undefined) {
						expected[t] = expected[t].replaceAll(`{${key}}`, options.replacements[key]);
					}
				}
			}
		}
		if (options?.condition === 'OR') {
			const re = new RegExp(expected.join('|').replace(/\s+/g, ' ').trim());
			if (isNot) {
				await expect
					.poll(async () => {
						const raw = await received.locator('main').textContent();
						return raw ? raw.replace(/\s+/g, ' ').trim() : '';
					})
					.not.toMatch(re);
			} else {
				await expect
					.poll(async () => {
						const raw = await received.locator('main').textContent();
						return raw ? raw.replace(/\s+/g, ' ').trim() : '';
					})
					.toMatch(re);
			}
		} else {
			for (const text of expected) {
				if (isNot) {
					await expect
						.poll(async () => {
							const raw = await received.locator('main').textContent();
							return raw ? raw.replace(/\s+/g, ' ').trim() : '';
						})
						.not.toContain(text);
				} else {
					await expect
						.poll(async () => {
							const raw = await received.locator('main').textContent();
							return raw ? raw.replace(/\s+/g, ' ').trim() : '';
						})
						.toContain(text);
				}
			}
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Text does NOT match' : 'Text matches'),
		};
	},

	async toHaveError(received: Page, error: string) {
		const isNot = this?.isNot ?? false;
		const locale = await getLocale(received);

		const el = received.getByText(locale.translate(error), {
			exact: false,
		});
		if (isNot) {
			await expect(el).not.toBeVisible();
		} else {
			await el.waitFor({ state: 'visible', timeout: 10000 });
			await expect(el).toContainClass('bg-red-600');
		}
		return {
			pass: !isNot,
			message: () =>
				isNot ? `error "${error}" is NOT on the page` : `error "${error}" IS on the page`,
		};
	},

	async toHaveSpinner(received: Page) {
		const isNot = this?.isNot ?? false;

		let appeared = false;
		try {
			await received.waitForSelector('[data-testid="spinner"]', {
				state: 'visible',
				timeout: 3000,
			});
			appeared = true;
		} catch {
			return {
				pass: !isNot,
				message: () => 'Spinner never appeared',
			};
		}

		if (!appeared) {
			return {
				pass: true,
				message: () => 'It is likely the spinner appeared/disappeared before the test',
			};
		}
		await received.waitForSelector('[data-testid="spinner"]', {
			state: 'detached',
		});
		return {
			pass: true,
			message: () => 'Spinner appeared and disappeared successfully',
		};
	},

	async toHaveBouncingDots(received: Page) {
		const isNot = this?.isNot ?? false;

		const el = received.getByTestId('bounce');
		if (isNot) {
			await expect(el).toBeHidden();
		} else {
			await expect(el).toBeVisible();
		}
		return {
			pass: !isNot,
			message: () => (isNot ? 'Bouncing dots are hidden' : 'Bouncing dots are visible'),
		};
	},
});
