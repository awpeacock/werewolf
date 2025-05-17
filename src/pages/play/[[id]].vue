<script setup lang="ts">
import { Role } from '@/types/enums';

definePageMeta({
	title: 'play-game',
	footer: {
		src: '/images/village/howling.webp',
		alt: 'howling-alt-text',
	},
});

type PlayState = 'initial' | 'selection' | 'day' | 'night' | 'eviction' | 'completion' | 'invalid';

const min = ref(6);

const game = useGameStore();
const player = usePlayerStore();
const util = useGame(game);
// We always want to be sure we're dealing with the latest state of the game (user might click "Play"
// AFTER the mayor has started the game, for example)
try {
	const latest = await util.getLatest();
	game.set(latest);
	player.set(game.findPlayer(player.id) as Player);
} catch (e) {
	useLogger().error('Could not retrieve latest game state', e as Error);
	// Lack of game in the session is handled with later checks, no need to do anything specific now
}
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
const hasDecided = computed(() => {
	const current: Undefinable<Activity> = game.activities?.at(-1);
	if (!current) {
		return false;
	}
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
	const current = game.activities?.at(-1);
	if (current && current.votes) {
		return Object.keys(current.votes).includes(player.id);
	}
	return false;
});
const victim = computed(() => {
	const current = game.activities?.at(-1);
	if (current && current.wolf) {
		return game.findPlayer(current.wolf)?.nickname;
	}
	return '';
});
const evicted = computed(() => {
	const current = game.activities?.at(-1);
	if (current && current.evicted) {
		return game.findPlayer(current.evicted)?.nickname;
	}
	return null;
});
const alive = computed(() => util.getAlivePlayers());
const dead = computed(() => util.getDeadPlayers());
const evictees = computed(() => util.getEvictedPlayers());
const loading: Ref<boolean> = ref(false);
const error: Ref<Nullable<string>> = ref(null);

// Navigation - check which stage we're at
const route = useRoute();
// If the game is active, always show the player the selection screen initially
// (in case the user was not already aware of their role)
const state: Ref<PlayState> = ref(
	!game.active ? (game.finished ? 'completion' : 'initial') : 'selection'
);
const code = ref(route.params.id as string);
if (code.value !== game.id) {
	state.value = 'invalid';
	if (code.value === undefined || code.value === '') {
		error.value = 'you-must-come-here-with-a-valid-game-code';
	} else {
		error.value = 'you-have-the-wrong-game-code';
	}
} else {
	if (!player || player.id === '') {
		state.value = 'invalid';
		error.value = 'you-have-not-yet-joined';
	}
}

// Prep the WebSocket client to handle all the game state updates
const socket = useWebSocketClient();

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
onMounted(() => {
	// Configurable values
	const config = useRuntimeConfig().public.MIN_PLAYERS;
	if (config) {
		min.value = parseInt(config);
	}

	const player = usePlayerStore();
	// If already invalidated, use the error already supplied
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
});

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
			})
			.catch((e) => {
				loading.value = false;

				if (e.status === 404) {
					error.value = 'game-not-found';
				} else {
					error.value = 'unexpected-error';
				}
			});
	}
};
// Play the game (ie move it to night time so the wolf and healer pick)
const play = async (event: MouseEvent) => {
	event.preventDefault();
	if (game.stage) {
		state.value = game.stage;
	} else {
		state.value = 'night';
	}
};
// Handle the choices of the wolf and the healer
const choose = async (event: MouseEvent) => {
	event.preventDefault();
	const target: Player = game.findPlayer((event.target as HTMLButtonElement).innerText) as Player;
	loading.value = true;
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
			loading.value = false;
		})
		.catch((e) => {
			loading.value = false;

			if (e.status === 404) {
				error.value = 'game-not-found';
			} else {
				error.value = 'unexpected-error';
			}
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
			loading.value = false;
		})
		.catch((e) => {
			loading.value = false;

			if (e.status === 404) {
				error.value = 'game-not-found';
			} else {
				error.value = 'unexpected-error';
			}
		});
};
// Move the game on after the eviction notice
const night = async (event: MouseEvent) => {
	event.preventDefault();
	state.value = 'night';
	game.activities?.push({});
};

watch(
	() => socket.latest.value,
	(event) => {
		if (event) {
			let update = false;
			if (state.value === 'initial') {
				if (event.type === 'start-game') {
					const start = event as StartGameEvent;
					player.addRole(start.role);
					state.value = 'selection';
					update = true;
				}
			}
			if (state.value === 'night') {
				if (event.type === 'morning') {
					state.value = 'day';
					update = true;
				}
			}
			if (state.value === 'day') {
				if (event.type === 'eviction') {
					state.value = 'eviction';
					update = true;
				} else if (event.type === 'game-over') {
					state.value = 'completion';
					update = true;
				}
			}
			if (update) {
				game.set(event.game);
			}
		}
	}
);
</script>

<template>
	<div>
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
			<h3 class="mb-4 font-oswald text-center text-6xl text-yellow-200">
				{{ $t(role).toUpperCase() }}
			</h3>
			<Button link="" label="play" class="w-full" @click="play" />
		</div>
		<div v-if="state === 'night'">
			<BodyText>{{ $t('night-descends') }}</BodyText>
			<div v-if="isWolf || isHealer">
				<div v-if="hasDecided">
					<BodyText>{{
						$t('you-have-chosen', { wait: isWolf ? 'the healer' : 'the wolf' })
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
						victim: victim,
					})
				}}
			</BodyText>
			<div v-if="!isDead">
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
			<BodyText v-else>{{ $t('you-cannot-vote-as-you-are-dead') }}</BodyText>
		</div>
		<div v-if="state === 'eviction'">
			<div v-if="isEvicted">
				<BodyText>{{ $t('you-have-been-evicted') }}</BodyText>
			</div>
			<div v-else>
				<BodyText>{{ $t('you-have-not-chosen-the-wolf') }}</BodyText>
				<BodyText v-if="evicted">
					{{
						$t('you-have-evicted', {
							evicted: evicted,
						})
					}}
				</BodyText>
				<BodyText v-else>
					{{ $t('you-have-evicted-nobody') }}
				</BodyText>
				<Button link="" label="continue" class="w-full" @click="night" />
			</div>
		</div>
		<div v-if="state === 'completion'">
			<Heading class="text-center">{{ $t('game-over') }}</Heading>
			<BodyText v-if="game.winner === 'wolf' && isWolf">
				{{ $t('congratulations-wolf') }}
			</BodyText>
			<BodyText v-if="game.winner === 'wolf' && !isWolf">
				{{ $t('you-lost-village', { wolf: game.wolf!.nickname }) }}
			</BodyText>
			<BodyText v-if="game.winner === 'village' && isWolf">
				{{ $t('you-lost-wolf') }}
			</BodyText>
			<BodyText v-if="game.winner === 'village' && !isWolf">
				{{ $t('congratulations-village', { wolf: game.wolf!.nickname }) }}
			</BodyText>
		</div>
	</div>
</template>
