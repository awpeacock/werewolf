<script setup lang="ts">
import { Role } from '@/types/enums';

definePageMeta({
	title: 'play-game',
	footer: {
		src: '/images/village/howling.webp',
		alt: 'howling-alt-text',
	},
});

type PlayState = 'initial' | 'selection' | 'day' | 'night' | 'completion' | 'invalid';

const min = ref(6);

const game = useGameStore();
const player = usePlayerStore();
const util = useGame(game);
// We always want to be sure we're dealing with the latest state of the game (user might click "Play"
// AFTER the mayor has started the game, for example)
try {
	const latest = await useGame(game).getLatest();
	game.set(latest);
	player.set(game.findPlayer(player.id) as Player);
} catch (e) {
	useLogger().error('Could not retrieve latest game state', e as Error);
	// Lack of game in the session is handled with later checks, no need to do anything specific now
}
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
	return useGame(game).isPlayerDead(player.id).value;
});
const hasDecided = computed(() => {
	if (isWolf.value && activity.value) {
		if (activity.value.wolf) {
			return true;
		}
	}
	if (isHealer.value && activity.value) {
		if (activity.value.healer) {
			return true;
		}
	}
	return false;
});
const victim = computed(() => {
	if (activity.value && activity.value.wolf) {
		return game.findPlayer(activity.value.wolf)?.nickname;
	}
	return '';
});
const alive = util.getAlivePlayers();
const dead = util.getDeadPlayers();
const loading: Ref<boolean> = ref(false);
const error: Ref<Nullable<string>> = ref(null);

// Navigation - check which stage we're at
const route = useRoute();
// If the game is active, always show the player the selection screen initially
// (in case the user was not already aware of their role)
const state: Ref<PlayState> = ref(!game.active ? 'initial' : 'selection');
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
const activity = computed(() => {
	return useGame(game).getCurrentActivity();
});

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

watch(
	() => socket.latest.value,
	(event) => {
		if (event) {
			if (state.value === 'initial') {
				if (event.type === 'start-game') {
					const start = event as StartGameEvent;
					player.addRole(start.role);
					state.value = 'selection';
				}
			}
			if (state.value === 'night') {
				if (event.type === 'morning') {
					state.value = 'day';
				}
			}
			game.set(event.game);
		}
	}
);
</script>

<template>
	<div>
		<Heading v-if="state === 'day' || state === 'night'" class="text-center uppercase">
			{{ $t(state + '-time') }}
			<Population :alive="alive" :dead="dead" />
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
			<Population :alive="alive" :dead="dead" />
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
							v-for="(villager, idx) in game.players.filter(
								(p) => p.id !== player.id
							)"
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
			<BodyText v-if="activity.wolf === activity.healer">
				{{ $t('activity-summary-saved') }}
			</BodyText>
			<BodyText v-else>
				{{
					$t('activity-summary-not-saved', {
						victim: victim,
					})
				}}
			</BodyText>
			<BodyText v-if="!isDead">{{ $t('time-for-the-village-to-vote') }}</BodyText>
			<BodyText v-else>{{ $t('you-cannot-vote-as-you-are-dead') }}</BodyText>
		</div>
	</div>
</template>
