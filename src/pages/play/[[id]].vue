<script setup lang="ts">
import { Role } from '@/types/enums';

definePageMeta({
	title: 'play-game',
	footer: {
		src: '/images/village/howling.webp',
		alt: 'howling-alt-text',
	},
});

type PlayState = 'initial' | 'selection' | 'day' | 'night' | 'vote' | 'completion' | 'invalid';

const game = useGameStore();
// We always want to be sure we're dealing with the latest state of the game (user might click "Play"
// AFTER the mayor has started the game, for example)
try {
	const latest = await useGame(game).getLatest();
	game.set(latest);
} catch (e) {
	useLogger().error('Could not retrieve latest game state', e as Error);
	// Lack of game in the session is handled with later checks, no need to do anything specific now
}
const player = usePlayerStore();
const isMayor = computed(() => {
	return game.mayor && player && game.mayor.id === player.id;
});
const playable = computed(() => {
	return game.players.length >= 6;
});
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
	if (game.players.length >= 6) {
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

watch(
	() => socket.latest.value,
	(event) => {
		if (state.value === 'initial' && event) {
			if (event.type === 'start-game') {
				const start = event as StartGameEvent;
				player.roles.push(start.role);
				state.value = 'selection';
			}
		}
	}
);
</script>

<template>
	<div>
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
			<div>
				<Heading class="border rounded border-yellow-200 mx-20 p-2 text-center"
					>{{ $t('population') }} : {{ game.players.length }}</Heading
				>
			</div>
			<ul class="border rounded border-white mx-20 mb-4 p-2 text-center">
				<li
					v-for="(villager, idx) in game.players"
					:key="idx"
					class="font-oswald text-base text-white"
				>
					{{ villager.nickname }}
				</li>
			</ul>
			<BodyText v-if="isMayor">{{ $t('must-have-min-players', { min: 6 }) }}</BodyText>
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
		</div>
	</div>
</template>
