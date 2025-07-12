<script setup lang="ts">
import { BlankActivity } from '@/types/constants';
import { Role } from '@/types/enums';

definePageMeta({
	title: 'play-game',
	footer: {
		src: '/images/village/howling.webp',
		alt: 'howling-alt-text',
	},
});

type PlayState = 'initial' | 'selection' | 'day' | 'night' | 'eviction' | 'completion' | 'invalid';
interface EventHandlerResponse {
	sync?: boolean;
	update?: boolean;
	state?: Nullable<PlayState>;
}

const min = ref(6);

const game = useGameStore();
const player = usePlayerStore();
const util = useGame(game);
const activity = computed(() => {
	return game.activities?.at(-1);
});
const playable = computed(() => {
	return game.players.length >= min.value;
});
const isMayor = computed(() => {
	return game.mayor && player && game.mayor.id === player.id;
});
const isWolf = computed(() => {
	return player && player.roles.includes(Role.WOLF);
});
const isHealer = computed(() => {
	return player && player.roles.includes(Role.HEALER);
});
const isDead = computed(() => {
	return util.isPlayerDead(player.id);
});
const isEvicted = computed(() => {
	return util.isPlayerEvicted(player.id);
});
const wasEvicted = computed(() => {
	return util.wasPlayerEvicted(player.id);
});
const hasDecided = computed(() => {
	const current: Undefinable<Activity> = game.activities?.at(-1);
	if (!current) {
		return false;
	}
	// The wolf/healer could get here via refresh after the votes are complete, and there will be no
	// new activity - this would lead to a false positive as it would suggest both have chosen.  This *should*
	// be unreachable due to the logic in the night() method but, belts and braces, and all that ...
	// Playwright certainly can't hit it though, hence the ignore
	/* istanbul ignore next @preserve */
	if (util.isActivityComplete(current)) {
		return false;
	}
	if (isWolf.value && current) {
		if (current.wolf) {
			return true;
		}
	}
	if (isHealer.value && current) {
		if (current.healer) {
			return true;
		}
	}
	return false;
});
const hasVoted = computed(() => {
	let voted = false;
	const current = game.activities?.at(-1);
	if (current && current.votes) {
		voted = Object.keys(current.votes).includes(player.id);
	}
	return voted;
});
// These next two once were computed, but Playwright has shown up a flakiness here around the
// reactivity so they're now set to Refs to give us more control
const victim: Ref<Nullable<Player>> = ref(null);
const evicted: Ref<Nullable<Player>> = ref(null);
const alive = computed(() => util.getAlivePlayers());
const dead = computed(() => util.getDeadPlayers());
const evictees = computed(() => util.getEvictedPlayers());
const loading: Ref<boolean> = ref(false);
const error: Ref<Nullable<string>> = ref(null);
const override: Ref<boolean> = ref(false);

// Navigation - check which stage we're at
const route = useRoute();
// If the game is active, always show the player the selection screen initially
// (in case the user was not already aware of their role)
const state: Ref<PlayState> = ref('initial');
const code = ref(route.params.id as string);

// Prep the WebSocket client to handle all the game state updates
const socket = useBroadcastClient();

// Selection screen values
const role = computed(() => {
	switch (player.roles.find((r: Role) => r !== Role.MAYOR)) {
		case Role.HEALER: {
			return 'the-healer';
		}
		case Role.WOLF: {
			return 'the-wolf';
		}
		default: {
			return 'a-villager';
		}
	}
});

// Let's detect if we've got a player already in the process of joining
onMounted(async () => {
	// Configurable values
	const config = useRuntimeConfig().public.MIN_PLAYERS;
	/* istanbul ignore next @preserve */
	if (config) {
		min.value = parseInt(config);
	}

	const player = usePlayerStore();
	// Load the latest game state, then some sanity checks -
	// the code in the URL must match up to that in the session,
	// and the player must be in the game
	await refresh();
	validate(player);
	// If not invalidated, check the default state
	if (state.value !== 'invalid') {
		// If the game is active, always show the screen telling them who they are in case they
		// forgot (or never saw it in the first place) - their first button click will take them
		// through to the right stage
		if (game.active) {
			state.value = 'selection';
		}
		// If the game isn't active, is it because we haven't started yet or because we've finished?
		if (!game.active) {
			if (game.finished) {
				state.value = 'completion';
			} else {
				state.value = 'initial';
			}
		}
	}
});

watch(
	() => socket.latest.value,
	(event) => {
		if (event) {
			let response: EventHandlerResponse = {};
			if (event.type === 'start-game') {
				response = handleStartGameEvent(event);
			} else if (event.type === 'morning') {
				response = handleMorningEvent();
			} else if (event.type === 'eviction') {
				response = handleEvictionEvent();
			} else if (event.type === 'game-over') {
				response = handleGameOverEvent();
			}
			if (response.sync) {
				game.set(event.game);
			}
			if (response.update) {
				update();
			}
			if (response.state) {
				state.value = response.state;
			}
		}
	}
);

// Start the game
const start = async (event: MouseEvent) => {
	event.preventDefault();
	if (game.players.length >= min.value) {
		loading.value = true;
		const api = `/api/games/${code.value.toUpperCase()}/start`;
		const body: StartGameBody = { auth: player.id };
		$fetch<Game>(api, {
			method: 'PUT',
			body: body,
		})
			.then((response: Game) => {
				game.set(useGame(response).parse());
				state.value = 'selection';
				loading.value = false;
			})
			.catch((e) => {
				if (e.status === 404) {
					error.value = 'game-not-found';
				} else {
					error.value = 'unexpected-error';
				}
				loading.value = false;
			});
	}
};
// Play the game (ie move it to night time so the wolf and healer pick)
const play = async (event: MouseEvent) => {
	event.preventDefault();
	refresh();
	update();
};
// Handle the choices of the wolf and the healer
const choose = async (event: MouseEvent) => {
	event.preventDefault();
	loading.value = true;
	const target: Player = game.findPlayer((event.target as HTMLButtonElement).innerText) as Player;
	const api = `/api/games/${code.value.toUpperCase()}/night`;
	const body: ActivityBody = {
		role: isWolf.value ? Role.WOLF : Role.HEALER,
		player: player.id,
		target: target.id,
	};
	$fetch<Game>(api, {
		method: 'PUT',
		body: body,
	})
		.then((response: Game) => {
			game.set(useGame(response).parse());
			if (game.stage === 'day') {
				update();
			}
			loading.value = false;
		})
		.catch((e) => {
			if (e.status === 404) {
				error.value = 'game-not-found';
			} else {
				error.value = 'unexpected-error';
			}
			loading.value = false;
		});
};
// Handle the votes for each player
const vote = async (event: MouseEvent) => {
	event.preventDefault();
	const target: Player = game.findPlayer((event.target as HTMLButtonElement).innerText) as Player;
	loading.value = true;
	const api = `/api/games/${code.value.toUpperCase()}/day`;
	const body: VoteBody = {
		player: player.id,
		vote: target.id,
	};
	$fetch<Game>(api, {
		method: 'PUT',
		body: body,
	})
		.then((response: Game) => {
			game.set(useGame(response).parse());
			if (game.stage === 'night') {
				update();
			} else if (game.winner && !game.active) {
				state.value = 'completion';
			}
			loading.value = false;
		})
		.catch((e) => {
			if (e.status === 404) {
				error.value = 'game-not-found';
			} else {
				error.value = 'unexpected-error';
			}
			loading.value = false;
		});
};
// Move the game on after the eviction notice
const night = async (event: MouseEvent) => {
	event.preventDefault();
	if (!override.value) {
		state.value = 'night';
		const current = game.activities?.at(-1);
		if (current) {
			if (util.isActivityComplete(current)) {
				const blank: Activity = structuredClone(BlankActivity);
				game.activities!.push(blank);
			}
		}
	} else {
		state.value = 'day';
	}
	override.value = false;
};
// We always want to be sure we're dealing with the latest state of the game (user might click "Play"
// AFTER the mayor has started the game, for example)
const refresh = async () => {
	try {
		const latest = await util.getLatest();
		game.set(latest);
		player.set(game.findPlayer(player.id) as Player);
	} catch (e) {
		useLogger().error('Could not retrieve latest game state', e as Error);
	}
};
// Check the state of the game and player, and invalidate if necessary
const validate = (player: Player) => {
	if (code.value === undefined || code.value === '') {
		state.value = 'invalid';
		error.value = 'you-must-come-here-with-a-valid-game-code';
	} else if (code.value !== game.id) {
		state.value = 'invalid';
		error.value = 'you-have-the-wrong-game-code';
	} else if (!player || player.id === '') {
		state.value = 'invalid';
		error.value = 'you-have-not-yet-joined';
	}

	// Check whether the player in session is part of the game if not already
	// invalidated - if already invalidated, use the error already supplied
	if (state.value !== 'invalid') {
		if (game.hasPlayer(player.id)) {
			if (!game.isPlayerAdmitted(player.id)) {
				state.value = 'invalid';
				error.value = 'the-mayor-has-not-selected-you-to-play-in-this-game';
			}
		} else {
			state.value = 'invalid';
			error.value = 'you-are-not-a-player-in-this-game';
		}
	}
};
// Always make sure we have the correct values in place to display
const update = () => {
	const current: Undefinable<Activity> = game.activities?.at(-1);
	if (current) {
		if (util.isActivityComplete(current)) {
			// If our most recent activity is complete, then we should be showing
			// the eviction screen NOT night time - in case the user came here from a refresh
			// and did not see who was evicted.  If they have seen who was evicted, this is still
			// fine as, if we were actually at night time and either the wolf or healer had chosen
			// we would not have a complete activity as our most recent - so nobody is missing
			// anything or out of sync.
			updateDay(current);
		} else if (current.wolf) {
			// However, if it is not complete, then we need to determine if the wolf and healer
			// have both chosen so we know whether to show daytime or nighttime (and whether we
			// have a victim)
			updateNight(current);
		} else {
			state.value = 'night';
		}
	} else {
		state.value = 'night';
	}
};
const updateNight = (activity: Activity): void => {
	const healer = game.healer!;
	if (activity.healer || util.isPlayerDead(healer.id) || util.isPlayerEvicted(healer.id)) {
		if (activity.wolf !== activity.healer) {
			victim.value = game.findPlayer(activity.wolf!);
		} else {
			victim.value = null;
		}
		if (state.value !== 'eviction') {
			state.value = 'day';
		}
	} else {
		state.value = 'night';
	}
};
const updateDay = (activity: Activity): void => {
	if (activity.evicted) {
		evicted.value = game.findPlayer(activity.evicted);
	} else {
		evicted.value = null;
	}
	state.value = 'eviction';
};
// Handlers for each incoming event
const handleStartGameEvent = (event: StartGameEvent): EventHandlerResponse => {
	player.addRole(event.role);
	return { state: 'selection' };
};
const handleMorningEvent = (): EventHandlerResponse => {
	// If a villager clicks continue after the wolf and healer have
	// chosen, they will be pushed through to the night screen unless
	// we ensure that is overridden
	if (!isWolf.value && !isHealer.value) {
		override.value = true;
	}
	return { sync: true, update: true };
};
const handleEvictionEvent = (): EventHandlerResponse => {
	return { sync: true, update: true, state: 'eviction' };
};
const handleGameOverEvent = (): EventHandlerResponse => {
	return { sync: true, state: 'completion' };
};
</script>

<template>
	<div>
		<Spinner v-if="loading" />
		<Heading v-if="state === 'day' || state === 'night'" class="text-center uppercase">
			{{ $t(state + '-time') }}
			<Population :alive="alive" :dead="dead" :evicted="evictees" />
		</Heading>
		<Error v-if="error" :message="error" />
		<div v-if="state === 'invalid'">
			<BodyText>{{ $t('return-and-start-again') }}</BodyText>
			<Button link="/" label="go-back" class="w-full" />
		</div>
		<div v-if="state === 'initial'">
			<Heading>{{ $t('welcome-to-lycanville') }}</Heading>
			<BodyText>{{ $t('story-introduction-1') }}</BodyText>
			<BodyText>{{ $t('story-introduction-2') }}</BodyText>
			<BodyText>{{ $t('story-introduction-3') }}</BodyText>
			<BodyText>{{ $t('story-introduction-4') }}</BodyText>
			<BodyText>{{ $t('story-introduction-5') }}</BodyText>
			<BodyText v-if="isMayor">{{ $t('must-have-min-players', { min: min }) }}</BodyText>
			<BodyText
				><NuxtLink to="/instructions" class="font-oswald text-yellow-200">{{
					$t('link-to-instructions')
				}}</NuxtLink></BodyText
			>
			<Population v-if="isMayor" :alive="alive" :dead="dead" :evicted="evictees" />
			<Button
				v-if="isMayor"
				link=""
				label="start-game"
				class="w-full"
				:disabled="!playable"
				@click="start"
			/>
			<BodyText v-if="!isMayor">{{ $t('waiting-for-mayor-to-start') }}</BodyText>
			<BouncingDots v-if="!isMayor" />
		</div>
		<div v-if="state === 'selection'">
			<BodyText class="text-center">{{ $t('the-game-is-under-way') }}</BodyText>
			<Heading class="text-center">{{ $t('you-are') }}</Heading>
			<h3 class="mb-4 font-oswald text-center text-6xl text-yellow-200" data-testid="role">
				{{ $t(role).toUpperCase() }}
			</h3>
			<Button link="" label="play" class="w-full" @click="play" />
		</div>
		<div v-if="state === 'night'">
			<BodyText>{{ $t('night-descends') }}</BodyText>
			<div v-if="isWolf || isHealer">
				<div v-if="isDead || isEvicted">
					<div v-if="isDead">
						<BodyText>{{ $t('you-cannot-heal-because-you-are-dead') }}</BodyText>
					</div>
					<div v-else>
						<BodyText>{{
							$t('you-cannot-heal-because-you-have-been-evicted')
						}}</BodyText>
					</div>
					<BodyText>{{ $t('we-wait') }}</BodyText>
					<BouncingDots />
				</div>
				<div v-else>
					<div v-if="hasDecided">
						<BodyText>{{
							$t('you-have-chosen', {
								wait: isWolf ? $t('the healer') : $t('the wolf'),
							})
						}}</BodyText>
						<BouncingDots />
					</div>
					<div v-else>
						<BodyText>{{ $t(`make-your-decision-${role}`) }}</BodyText>
						<div class="grid grid-cols-3 gap-4">
							<Button
								v-for="(villager, idx) in util
									.getAlivePlayers()
									.filter((p) => p.id !== player.id)"
								:key="idx"
								link=""
								:label="villager.nickname"
								:translate="false"
								class="w-full"
								@click="choose"
							/>
						</div>
					</div>
				</div>
			</div>
			<div v-else>
				<BodyText>{{ $t('we-wait') }}</BodyText>
				<BouncingDots />
			</div>
		</div>
		<div v-if="state === 'day'">
			<BodyText v-if="activity?.wolf === activity?.healer">
				{{ $t('activity-summary-saved') }}
			</BodyText>
			<BodyText v-else>
				{{
					$t('activity-summary-not-saved', {
						victim: victim?.nickname,
					})
				}}
			</BodyText>
			<div v-if="!isDead && !isEvicted">
				<BodyText>{{ $t('time-for-the-village-to-vote') }}</BodyText>
				<div v-if="hasVoted">
					<BodyText>{{ $t('you-have-voted') }}</BodyText>
					<BouncingDots />
				</div>
				<div v-else class="grid grid-cols-3 gap-4">
					<Button
						v-for="(villager, idx) in util
							.getAlivePlayers()
							.filter((p) => p.id !== player.id)"
						:key="idx"
						link=""
						:label="villager.nickname"
						:translate="false"
						class="w-full"
						@click="vote"
					/>
				</div>
			</div>
			<div v-else>
				<BodyText v-if="isDead">{{ $t('you-cannot-vote-as-you-are-dead') }}</BodyText>
				<BodyText v-if="isEvicted">{{
					$t('you-cannot-vote-as-you-have-been-evicted')
				}}</BodyText>
			</div>
		</div>
		<div v-if="state === 'eviction'">
			<div v-if="wasEvicted">
				<BodyText>{{ $t('you-have-been-evicted') }}</BodyText>
			</div>
			<div v-else>
				<BodyText>{{ $t('you-have-not-chosen-the-wolf') }}</BodyText>
				<BodyText v-if="evicted">
					{{
						$t('you-have-evicted', {
							evicted: evicted.nickname,
						})
					}}
				</BodyText>
				<BodyText v-else>
					{{ $t('you-have-evicted-nobody') }}
				</BodyText>
			</div>
			<Button link="" label="continue" class="w-full" @click="night" />
		</div>
		<div v-if="state === 'completion'">
			<Heading class="text-center">{{ $t('game-over') }}</Heading>
			<BodyText v-if="game.winner === 'wolf' && isWolf">
				{{ $t('congratulations-wolf') }}
			</BodyText>
			<BodyText v-if="game.winner === 'wolf' && !isWolf">
				{{ $t('you-lost-village') }}
			</BodyText>
			<BodyText v-if="game.winner === 'village' && isWolf">
				{{ $t('you-lost-wolf') }}
			</BodyText>
			<BodyText v-if="game.winner === 'village' && !isWolf">
				{{ $t('congratulations-village') }}
			</BodyText>
			<Heading v-if="!isWolf && game.wolf" class="text-center">
				<span class="text-white">
					{{ $t('the-wolf-was', { wolf: game.wolf?.nickname }) }}
				</span>
			</Heading>
		</div>
	</div>
</template>
