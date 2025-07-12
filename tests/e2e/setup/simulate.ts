import type { Browser, BrowserContext, Page } from '@playwright/test';

import { expect } from '@tests/e2e/setup/expect';

export interface Simulation {
	inject: (_game: Game, _player?: Player) => Promise<void>;
	go: (_path: string, _options?: Options) => Promise<void>;
	begin: (_browser: Browser, _names: Array<string>) => Promise<void>;
	createGame: (_options: Options, _invite?: boolean, _play?: boolean) => Promise<void>;
	joinGame: (_options: Options) => Promise<void>;
	addPlayers: (_browser: Browser, _names: Array<string>) => Promise<void>;
	admitPlayer: (_options: Options) => Promise<void>;
	denyPlayer: (_options: Options) => Promise<void>;
	handleAdmissions: (
		_count: number,
		_admit: Array<string>,
		_deny: Array<string>
	) => Promise<void>;
	start: (_options?: Options) => Promise<void>;
	enter: (_names: Array<string>, _active: boolean) => Promise<void>;
	determineRoles: () => Promise<void>;
	rejoin: (_options?: Options) => Promise<void>;
	progress: (_all: boolean, _options?: Options) => Promise<void>;
	choose: (_options: Options) => Promise<void>;
	vote: (_options?: Options) => Promise<void>;
	results: (_evicted?: string) => Promise<void>;
	finish: () => Promise<void>;
	findLastVillager: () => string;
	getDetails: () => GameDetails;
}

export interface GameDetails {
	code?: string;
	invite?: string;
	mayor?: string;
	wolf?: string;
	healer?: string;
	canary?: string;
	dead: Array<string>;
	evicted: Array<string>;
}

export interface Options {
	session?: Page;
	navigate?: boolean;
	parameters?: Record<string, Undefinable<string>>;
	result?: {
		success: boolean;
		message?: string;
	};
	refresh?: string;
}

interface SimPlayer {
	name: string;
	page: Page;
	context: BrowserContext;
}

export const simulate = async (page: Page, locale: string, entry: string): Promise<Simulation> => {
	const { default: i18n } = await import(`@/i18n/locales/${locale}.json`, {
		with: { type: 'json' },
	});
	const prefix = locale === 'en' ? '' : '/' + locale;
	const details: GameDetails = { dead: [], evicted: [] };
	const players: Array<SimPlayer> = [];

	const inject = async (game: Game, player?: Player): Promise<void> => {
		await page.evaluate(
			(args) => {
				sessionStorage.setItem('game', JSON.stringify(args[0]));
				if (args[1]) {
					sessionStorage.setItem('player', JSON.stringify(args[1]));
				}
			},
			[game, player]
		);
	};

	const go = async (path: string, options?: Options): Promise<void> => {
		let session = page;
		if (options?.session) {
			session = options.session;
		}

		const current = new URL(session.url()).pathname;
		const target = path.startsWith(prefix) ? path : prefix + path;
		const regex = new RegExp(`${target}(/[A-Z0-9]{4})?(\\?.*)?$`);
		if (regex.test(session.url())) {
			return;
		}

		if (
			current === prefix + '/' &&
			options?.navigate &&
			options?.parameters?.button &&
			target.indexOf('?') === -1
		) {
			const button = session.getByRole('link', { name: i18n[options.parameters.button] });
			await expect(button).toBeVisible();
			await button.click();
		} else {
			await session.goto(target, { waitUntil: 'networkidle' });
		}
		await session.addStyleTag({
			content: '* { transition: none !important; animation: none !important; }',
		});
	};

	const get = (role: string): SimPlayer => {
		if (role !== 'wolf' && role !== 'healer') {
			throw new Error('Attempt to retrieve player other than wolf or healer');
		}
		for (const player of players) {
			if (player.name === details[role]) {
				return player;
			}
		}
		throw new Error(`Player with role "${role}" not found`);
	};

	const begin = async (browser: Browser, names: Array<string>): Promise<void> => {
		await createGame(
			{
				parameters: { nickname: names[0] },
				result: { success: true },
			},
			true,
			true
		);
		await expect(page).not.toBeReady();

		await addPlayers(browser, names);
		await handleAdmissions(6, [names[3], names[4], names[6], names[7]], [names[5], names[8]]);
	};

	const createGame = async (
		options: Options,
		invite?: boolean,
		play?: boolean
	): Promise<void> => {
		await go('/create', { parameters: { button: 'create-game' } });
		await expect(page).toBeCreatePage();

		await expect(page).toValidateNickname(options.parameters!.nickname);

		const button = page.getByTestId('create-button');
		await expect(button).toBeVisible();
		await button.click();
		await expect(page).toHaveSpinner();

		if (options.result!.success) {
			await expect(page).toHaveCreatedGame();
			details.code = (await page.getByTestId('game-code').textContent()) as string;
			details.mayor = options.parameters!.nickname!;
			players.push({ name: details.mayor, page: page, context: page.context() });
			log('Game created');
		} else {
			await expect(page).toHaveError(options.result!.message!);
		}

		// Also allow the option to create an invite for the newly created game
		if (invite) {
			const invite = page.getByRole('link', { name: i18n['invite-players'] });
			await expect(invite).toBeVisible();
			await invite.click();

			await expect(page).toBeInvitePage();
			const link = (await page.getByTestId('invite-url').textContent()) as string;
			const url = link.substring(link.indexOf(prefix + '/join'));
			expect(url).not.toBeNull();
			const matches = /\/join\/([A-Z0-9]{4})\?invite/.exec(url);
			expect(matches).not.toBeNull();
			expect(matches!.length).toBe(2);
			details.invite ??= url;
		}

		if (play) {
			if (invite) {
				await go('/create', {
					navigate: true,
					parameters: { button: 'go-back' },
				});
			}
			await go(`/play/${details.code}`, {
				navigate: true,
				parameters: { button: 'play-game' },
			});
		}
	};

	const joinGame = async (options: Options): Promise<void> => {
		let session = page;
		if (options.session) {
			session = options.session;
		}
		options.parameters!.button = 'join-game';
		await go('/join', options);
		await expect(session).toBeJoinPage();

		const accepted = session.url().includes('?invite=');
		if (accepted && session.url().endsWith('?invite=')) {
			throw new Error('Invalid invite URL: ' + session.url());
		}

		// Before we try the join, double check if this is a previously
		// rejected attempt to join - in which case, click the retry button first
		const retry = session.getByRole('link', { name: i18n['try-again'] });
		if (await retry.isVisible()) {
			await retry.click();

			await expect(session.getByTestId('join-button')).toBeVisible();
		}

		if (options.parameters!.code) {
			await expect(session).toValidateCode(options.parameters!.code);
		}
		await expect(session).toValidateNickname(options.parameters!.nickname);

		const button = session.getByTestId('join-button');
		await expect(button).toBeVisible();
		await button.click();
		await expect(session).toHaveSpinner();

		if (options.result?.success) {
			if (accepted) {
				await expect(session).toBeAdmitted();
			} else {
				await expect(session).toHaveJoinedGame();
			}
		} else if (options.result) {
			await expect(session).toHaveError(options.result.message!.replace('{mayor}', ''));
		}
	};

	const addPlayers = async (browser: Browser, nicknames: Array<string>): Promise<void> => {
		// First off, create new browser sessions for each new player, and
		// either join or request to join.  Handle each scenario:
		// 1. Straight in using link with invite code
		// 2. Use link with code so only input nickname
		// 3. Manually input nickname AND code
		// Create the sessions sequentially so they map up to the names
		for (let p = 1; p < nicknames.length; p++) {
			const context = await browser.newContext();
			const session = await context.newPage();
			await session.addStyleTag({
				content: '* { transition: none !important; animation: none !important; }',
			});
			players.push({ name: nicknames[p], page: session, context: context });
		}

		// Now run the actions concurrently
		await Promise.all(
			players.slice(1).map(async (player, p) => {
				const { name, page } = player;
				const invited = p < 2,
					prefilled = p >= 2 && p < 5;
				if (invited) {
					await page.goto(details.invite!, { waitUntil: 'networkidle' });
				} else if (prefilled) {
					await page.goto(prefix + '/join/' + details.code, { waitUntil: 'networkidle' });
				} else {
					await page.goto(prefix + '/join', { waitUntil: 'networkidle' });
				}
				await expect(page).toBeJoinPage();

				await joinGame({
					session: page,
					parameters: { nickname: name, code: p >= 5 ? details.code : undefined },
					result: { success: true },
				});
				if (invited) {
					await expect(page).toBeAdmitted();
					log(`${name} joined and is waiting for the game to start.`);
				} else {
					await expect(page).toHaveJoinedGame();
					await expect(page).not.toBeAdmitted();
					log(`${name} requested to join and is waiting to be admitted.`);
				}
			})
		);
	};

	const resolveJoinRequest = async (admit: boolean, options: Options): Promise<void> => {
		let session = page;
		if (options.session) {
			session = options.session;
		}

		let pos: number = -1;
		const names = await session.getByTestId('join-name').all();
		for (let n = 0; n < names.length; n++) {
			if ((await names[n].innerHTML()) === options.parameters!.name!) {
				pos = n;
			}
		}
		if (pos === -1) {
			throw Error('Player selected who is not waiting to be admitted');
		}

		const text = admit ? 'yes' : 'no';
		const before = await session.getByTestId(text).count();
		const button = session.getByTestId(text).nth(pos);
		await expect(button).toBeVisible();
		await button.click();

		const success = options.result?.success ?? true;
		if (success) {
			await expect(session.getByTestId('yes')).toHaveCount(before - 1);
			await expect(session.getByTestId('no')).toHaveCount(before - 1);
		}
	};

	const admitPlayer = async (options: Options): Promise<void> => {
		await resolveJoinRequest(true, options);
	};

	const denyPlayer = async (options: Options): Promise<void> => {
		await resolveJoinRequest(false, options);
	};

	const handleAdmissions = async (
		count: number,
		admit: Array<string>,
		deny: Array<string>
	): Promise<void> => {
		await expect(page).toHaveJoinRequests(count);
		expect(count).toEqual(admit.length + deny.length);

		for (const name of admit) {
			await admitPlayer({ parameters: { name: name } });
			log(`${name} admitted.`);
			count--;
			await expect(page).toHaveJoinRequests(count);
			// Do I wait for it to say they're in?
		}
		for (const name of deny) {
			await denyPlayer({ parameters: { name: name } });
			for (let p = 0; p < players.length; p++) {
				if (name === players[p].name) {
					players.splice(p, 1);
					break;
				}
			}
			log(`${name} rejected.`);
			count--;
			await expect(page).toHaveJoinRequests(count);
			// Do I wait for it to say they're out?
		}
	};

	const start = async (options?: Options): Promise<void> => {
		await expect(page).toBeReady();

		const start = page.getByRole('link', { name: i18n['start-game'] });
		await start.click();
		await expect(page).toHaveSpinner();
		const success = options?.result?.success ?? true;
		if (success) {
			log(`Game started`);
		}
	};

	const enter = async (names: Array<string>, active: boolean): Promise<void> => {
		await Promise.all(
			names.map(async (name) => {
				for (const player of players) {
					if (player.name === name) {
						await expect(player.page).toBeAdmitted();
						const button = player.page.getByRole('link', { name: i18n['play-game'] });
						await expect(button).toBeVisible();
						await button.click();
						if (!active) {
							await expect(player.page).toBeWaiting();
						}
						await expect(player.page).toBePlayPage(details.code);
					}
				}
			})
		);
	};

	const determineRoles = async (): Promise<void> => {
		// Now every session should be ready to play - keep track of who's the wolf
		// and who's the healer so we know which sessions to interact with at night;
		// and also set our "canary" - the villager that will advance at each step to
		// cover that scenario (the rest will only advance AFTER the wolf/healer have
		// done their bits)
		let message = '';
		await Promise.all(
			players.map(async (player) => {
				await expect(player.page).toBeRolePage();
				const role = await player.page.getByTestId('role').textContent();
				if (role?.toLowerCase() === i18n['the-wolf'].toLowerCase()) {
					details.wolf = player.name;
					message += `${player.name} is the werewolf. `;
				} else if (role?.toLowerCase() === i18n['the-healer'].toLowerCase()) {
					details.healer = player.name;
					message += `${player.name} is the healer. `;
				} else {
					details.canary ??= player.name;
				}
			})
		);
		log(message);
	};

	const rejoin = async (options?: Options): Promise<void> => {
		let session = page;
		if (options?.session) {
			session = options.session;
			if (options.navigate) {
				await go('/', { session: session });
				await go(`/play/${details.code}`, {
					session: session,
					navigate: true,
					parameters: { button: 'resume-game' },
				});
			} else {
				await session.reload();
				await session.waitForLoadState('networkidle');
				await session.waitForFunction(() => document.readyState === 'complete');
				await session.addStyleTag({
					content: '* { transition: none !important; animation: none !important; }',
				});
			}
		}
		await expect(session).toBeRolePage();
		await session
			.getByRole('link', {
				name: i18n['play'],
			})
			.click();
	};

	const progress = async (all: boolean, options?: Options): Promise<void> => {
		// Separate out the actual action part of this, so it can be called individually
		const action = async (session: Page) => {
			const label = new RegExp('^(' + i18n['play'] + '|' + i18n['continue'] + ')$');
			const button = session.getByRole('link', {
				name: label,
			});
			await expect(button).toBeVisible();
			await button.click();
		};
		// If we've been passed a session just progress that session alone
		if (options?.session) {
			await action(options.session);
			return;
		}

		// To test out each scenario do NOT move every screen on immediately (unless specified)
		const trinity: Array<string> = [details.wolf!, details.healer!, details.canary!];
		const chosen = all
			? players.filter((player) => !trinity.includes(player.name))
			: players.filter((player) => trinity.includes(player.name));
		await Promise.all(
			chosen.map(async (player) => {
				await action(player.page);
				if (
					(details.wolf === player.name || details.healer === player.name) &&
					!details.dead.includes(player.name) &&
					!details.evicted.includes(player.name)
				) {
					await expect(player.page).toBeMakingDecision();
					// To test all scenarios, occasionally we should check a player refreshing the page
					// does not lose the flow
					if (options && options.refresh === player.name) {
						await rejoin({ session: player.page, navigate: options.navigate });
						// If there is an eviction to report on we will see a continue button
						const button = player.page.getByRole('link', { name: i18n['continue'] });
						if (await button.isVisible()) {
							await button.click();
						}
						await expect(player.page).toBeMakingDecision();
					}
				} else {
					await expect(player.page).not.toBeMakingDecision();
					if (options && options.refresh === player.name) {
						await rejoin({ session: player.page, navigate: options.navigate });
						await expect(player.page).not.toBeMakingDecision();
					}
				}
			})
		);
	};

	const choose = async (options: Options): Promise<void> => {
		const success = options.result?.success ?? true;
		// Separate out the actual action part of this, so it can be called individually
		const action = async (session: Page, target: string, success: boolean) => {
			const button = session.getByRole('link', { name: target });
			await expect(button).toBeVisible();
			await button.click();
			await expect(session).toHaveSpinner();
			if (success) {
				await expect(session).toHaveMadeDecision();
			}
		};
		// If we've been passed a session just progress that session alone
		if (options?.session) {
			await action(options.session, options.parameters!.target!, success);
			return;
		}

		// Allow the option to choose order, so we can ensure we cover both scenarios where
		// the wolf chooses first, and vice versa
		let message = '';
		for (const key of Object.keys(options.parameters!)) {
			const player = get(key);
			await action(player.page, options.parameters![key]!, success);
			message += `${player.name} (${key}) chose ${options.parameters![key]!}. `;
		}
		if (success) {
			if (options.parameters!.wolf !== options.parameters!.healer) {
				details.dead.push(options.parameters!.wolf!);
				message += `${options.parameters!.wolf!} is now dead.`;
			}
			log(message);
		}
		for (const player of players) {
			if (options?.refresh === player.name) {
				await rejoin({ session: player.page, navigate: options?.navigate });
				await expect(player.page).toHaveMadeDecision();
			}
		}
	};

	const vote = async (options?: Options): Promise<void> => {
		// Separate out the actual action part of this, so it can be called individually
		const action = async (session: Page, target: string) => {
			const vote = session.getByRole('link', { name: target });
			await expect(vote).toBeVisible();
			await vote.click();
			await expect(session).toHaveSpinner();
		};
		// If we've been passed a session just progress that session alone
		if (options?.session) {
			await action(options.session, options.parameters!.target!);
			return;
		}

		const killed = options?.parameters?.killed;
		const majority = options?.parameters?.majority;
		await Promise.all(
			players.map(async (player, p) => {
				await player.page.waitForLoadState('networkidle');
				if (details.dead?.includes(player.name) || details.evicted.includes(player.name)) {
					await expect(player.page).not.toBeVoting();
					log(`${player.name} was unable to vote as they are dead/evicted.`);
				} else {
					await expect(player.page).toHaveBeenKilled(killed);
					await expect(player.page).toBeVoting();
					let pos = p === 0 ? players.length - 1 : p - 1;
					while (
						details.dead?.includes(players[pos].name) ||
						details.evicted?.includes(players[pos].name)
					) {
						pos--;
						if (pos == -1) {
							pos = players.length - 1;
						}
					}
					let target = players[pos].name;
					if (majority && players[p].name !== majority) {
						target = majority;
					}
					await action(player.page, target);
					log(`${player.name} voted for ${target}.`);
				}
			})
		);
		const success = options?.result?.success ?? true;
		if (success) {
			if (majority) {
				details.evicted.push(majority);
				log(`${majority} has now been evicted.`);
			} else {
				log('Nobody was evicted.');
			}

			// We need to go around again, and make sure every page updates itself recognising everyone has voted
			await Promise.all(
				players.map(async (player) => {
					if (
						details.dead?.includes(player.name) ||
						details.evicted.includes(player.name)
					) {
						await expect(player.page).toHaveVoted();
						await expect(player.page).not.toHaveBouncingDots();
					}
				})
			);
		}
	};

	const results = async (evicted?: string): Promise<void> => {
		await Promise.all(
			players.map(async (player) => {
				if (evicted === player.name) {
					await expect(player.page).toHaveBeenEvicted();
				} else {
					await expect(player.page).toHaveEvicted(evicted);
				}
			})
		);
	};

	const findLastVillager = (): string => {
		const { dead, evicted, wolf, healer, canary } = details;

		let p = players.length - 1;
		while (
			dead.includes(players[p].name) ||
			evicted.includes(players[p].name) ||
			wolf === players[p].name ||
			healer === players[p].name ||
			canary === players[p].name
		) {
			p--;
		}
		return players[p].name;
	};

	const finish = async (): Promise<void> => {
		const victor =
			players.length - details.dead?.length - details.evicted?.length === 3
				? 'wolf'
				: 'village';
		await Promise.all(
			players.map(async (player) => {
				await expect(player.page).toBeFinished();
				if (victor === 'wolf') {
					if (details.wolf === player.name) {
						await expect(player.page).toHaveWon('wolf', details.wolf);
					} else {
						await expect(player.page).not.toHaveWon('village', details.wolf);
					}
				} else if (details.wolf === player.name) {
					await expect(player.page).not.toHaveWon('wolf', details.wolf);
				} else {
					await expect(player.page).toHaveWon('village', details.wolf);
				}
				// Make sure the game stays successfully finished upon refresh
				await player.page.reload();
				await expect(player.page).toBeFinished();
			})
		);
		log(`Game is over - ${victor} wins.`);
	};

	const getDetails = () => {
		return details;
	};

	const log = (message: string) => {
		const isCI = !!process.env.CI;
		if (!isCI) console.debug(`:: Game "${details.code}" :: ${message}`);
	};

	await go(entry);

	return {
		inject,
		go,
		begin,
		createGame,
		joinGame,
		addPlayers,
		admitPlayer,
		denyPlayer,
		handleAdmissions,
		start,
		enter,
		determineRoles,
		rejoin,
		progress,
		choose,
		vote,
		results,
		finish,
		findLastVillager,
		getDetails,
	};
};
