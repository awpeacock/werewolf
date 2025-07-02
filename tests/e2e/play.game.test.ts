import { expect } from '@tests/e2e/setup/expect';
import { simulate } from '@tests/e2e/setup/simulate';
import { test } from '@tests/e2e/setup/test';

test.describe('Play games', () => {
	const nicknames = [
		'Mayor',
		'Villager 1',
		'Villager 2',
		'Villager 3',
		'Villager 4',
		'Villager 5',
		'Villager 6',
		'Villager 7',
		'Villager 8',
	];

	test.each(['en', 'de'])(
		'Play a game where the Werewolf wins',
		async ({ locale, page, browser }) => {
			const simulation = await simulate(page, locale, '/');

			await simulation.createGame(
				{
					parameters: { nickname: nicknames[0] },
					result: { success: true },
				},
				true,
				true
			);
			await expect(page).not.toBeReady();

			await simulation.addPlayers(browser, nicknames);
			await simulation.handleAdmissions(
				6,
				[nicknames[3], nicknames[4], nicknames[6], nicknames[7]],
				[nicknames[5], nicknames[8]]
			);

			// Before we start the game, move one of each of our non-automatic joins on
			// (again to cover each scenario - moving through to "Play Game" before and
			// after the mayor has started it)
			await simulation.enter([nicknames[3], nicknames[6]], false);
			// Now start the game, and move the other 2 sessions on
			await expect(page).toBeReady();
			await simulation.start();
			await simulation.enter([nicknames[4], nicknames[7]], true);

			await simulation.determineRoles();

			// // First go round, make the wolf and healer choose the same.
			await simulation.progress(false, { refresh: simulation.getDetails().wolf! });
			const target = simulation.getDetails().canary!;
			await simulation.choose({
				parameters: {
					healer: target,
					wolf: target,
				},
			});
			// Also go for stalemate on the voting
			await simulation.vote();
			await simulation.results();

			// Next go round, healer fails to prevent the wolf
			await simulation.progress(false);
			await simulation.choose({
				parameters: {
					healer: simulation.getDetails().wolf!,
					wolf: simulation.getDetails().healer!,
				},
				refresh: simulation.getDetails().healer!,
			});
			await simulation.progress(true, {
				navigate: true,
				refresh: simulation.findLastVillager(),
			});
			// This time, evict the wrong person
			const evicted = simulation.findLastVillager();
			await simulation.vote({
				parameters: { killed: simulation.getDetails().healer!, majority: evicted },
			});
			await simulation.results(evicted);

			// This time, the healer can't vote so the wolf will always be successful
			// and, if we vote out the wrong person again, the wolf should win
			await simulation.progress(false);
			const victim = simulation.findLastVillager();
			await simulation.choose({
				parameters: {
					wolf: victim,
				},
			});
			await simulation.progress(true);
			await simulation.vote({
				parameters: { killed: victim, majority: simulation.findLastVillager() },
			});

			await simulation.finish();
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Play a game where the Werewolf loses',
		async ({ locale, page, browser }) => {
			const simulation = await simulate(page, locale, '/');

			await simulation.createGame(
				{
					parameters: { nickname: nicknames[0] },
					result: { success: true },
				},
				true,
				true
			);
			await expect(page).not.toBeReady();

			await simulation.addPlayers(browser, nicknames);
			await simulation.handleAdmissions(
				6,
				[nicknames[3], nicknames[4], nicknames[6], nicknames[7]],
				[nicknames[5], nicknames[8]]
			);

			// For this test, let's not move anybody on till after the mayor has started
			await expect(page).toBeReady();
			await simulation.start();
			await simulation.enter([nicknames[3], nicknames[4], nicknames[6], nicknames[7]], true);

			await simulation.determineRoles();

			// This time success for the wolf on the first go
			await simulation.progress(false);
			const dead = simulation.findLastVillager();
			await simulation.choose({
				parameters: {
					wolf: dead,
					healer: simulation.getDetails().canary!,
				},
				refresh: simulation.getDetails().healer!,
			});
			// And evict someone straight away too
			const evicted = simulation.findLastVillager();
			await simulation.vote({ parameters: { killed: dead, majority: evicted } });
			await simulation.results(evicted);

			// Next go round, we will have a tie on the choices
			await simulation.progress(false, {
				refresh: simulation.getDetails().healer!,
			});
			await simulation.choose({
				parameters: {
					healer: simulation.getDetails().canary!,
					wolf: simulation.getDetails().canary!,
				},
			});
			await simulation.progress(true);
			// This time, pick the wolf
			await simulation.vote({ parameters: { majority: simulation.getDetails().wolf! } });

			await simulation.finish();
			await page.reload();
			await expect(page).toBeFinished();
		}
	);

	test.each(['en', 'de'])(
		'Play a game where the Healer gets evicted',
		async ({ locale, page, browser }) => {
			const simulation = await simulate(page, locale, '/');

			await simulation.createGame(
				{
					parameters: { nickname: nicknames[0] },
					result: { success: true },
				},
				true,
				true
			);
			await expect(page).not.toBeReady();

			await simulation.addPlayers(browser, nicknames);
			await simulation.handleAdmissions(
				6,
				[nicknames[3], nicknames[4], nicknames[6], nicknames[7]],
				[nicknames[5], nicknames[8]]
			);

			// Before we start the game, move one of each of our non-automatic joins on
			// (this time let's move everybody all on at the first go)
			await simulation.enter([nicknames[3], nicknames[4], nicknames[6], nicknames[7]], false);
			await expect(page).toBeReady();
			await simulation.start();

			await simulation.determineRoles();

			await simulation.progress(false);
			await simulation.progress(true);
			const dead = simulation.findLastVillager();
			await simulation.choose({
				parameters: {
					wolf: dead,
					healer: simulation.getDetails().canary!,
				},
			});

			await simulation.vote({
				parameters: { killed: dead, majority: simulation.getDetails().healer! },
			});
			await simulation.results(simulation.getDetails().healer!);

			// Next go round, the healer can't choose as they've been evicted
			await simulation.progress(false);
			await simulation.progress(true);
			await simulation.choose({
				parameters: {
					wolf: simulation.getDetails().canary!,
				},
			});

			const evicted = simulation.findLastVillager();
			await simulation.vote({
				parameters: { killed: simulation.getDetails().canary!, majority: evicted },
			});

			await simulation.finish();
			await page.reload();
			await expect(page).toBeFinished();
		}
	);
});
