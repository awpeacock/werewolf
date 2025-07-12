<script setup lang="ts">
import { ref } from 'vue';
import type { Ref } from 'vue';

import Code from '@/components/Code.vue';
import Nickname from '@/components/Nickname.vue';

definePageMeta({
	title: 'join-game',
	footer: {
		src: '/images/village/queue.webp',
		alt: 'queue-alt-text',
	},
});

type JoinState = 'form' | 'wait' | 'admitted' | 'denied';
const game = useGameStore();
const player = usePlayerStore();
const loading: Ref<boolean> = ref(false);

// Navigation - check which stage we're at, whether we've had a code or invite
// included in the URL, and generate the play link, if applicable
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const state: Ref<JoinState> = ref('form');
const editable =
	route.params.id === undefined || route.params.id === null || route.params.id === '';
const code = ref(editable ? '    ' : (route.params.id as string));
const invite = route.query.invite ? route.query.invite : null;

// Setup the formfields
const fldCode: Ref<typeof Code | null> = ref(null);
const valCode = ref([
	code.value[0].trim(),
	code.value[1].trim(),
	code.value[2].trim(),
	code.value[3].trim(),
]);
const errCode: Ref<Nullable<string>> = ref(null);
const fldNickname: Ref<typeof Nickname | null> = ref(null);
const valNickname = ref('');
const errNickname: Ref<Nullable<string>> = ref(null);
const errGlobal: Ref<Nullable<string>> = ref(null);

// Prep the WebSocket client to handle the response to the join request
const socket = useBroadcastClient();

// Let's detect if we've got a player already in the process of joining
onMounted(async () => {
	reset();
	if (game && game.id && game.id !== '') {
		game.set(await useGame(game).getLatest());
	}
	if (game.id !== '' && player.id !== '') {
		valNickname.value = player.nickname;
		if (game.hasPlayer(player.id)) {
			if (game.isPlayerAdmitted(player.id)) {
				state.value = 'admitted';
			} else {
				state.value = 'wait';
			}
		} else {
			state.value = 'denied';
		}
	}
});

const entered = (val: string) => {
	// This is triggered when the Code component has been successfully
	// completed - setup the play link value and move focus on to the Nickname
	code.value = val;
	if (code.value.trim().length === 4 && /\s/.test(code.value) === false) {
		fldNickname.value!.focus();
	}
};

const join = async (_event: MouseEvent) => {
	// Clear down any existing error messages so the screen
	// is only updated with "live" errors from this attempt
	errGlobal.value = null;
	errCode.value = null;
	errNickname.value = null;

	const validCode = fldCode.value?.validate();
	const validNickname = fldNickname.value?.validate();
	const valid = validCode && validNickname;
	if (valid) {
		loading.value = true;
		const nickname = valNickname.value.trim();
		$fetch<Game>(
			`/api/games/${code.value.toUpperCase()}/join` + (invite ? `?invite=${invite}` : ''),
			{
				method: 'PUT',
				body: { villager: nickname },
			}
		)
			.then((response: Game) => {
				game.set(useGame(response).parse());
				const player: Nullable<Player> = game.findPlayer(nickname);
				if (player === null) {
					errGlobal.value = 'unexpected-error';
				} else {
					usePlayerStore().set(player);
					// Now setup the connection to listen for notifications
					socket.connect(game, player);
					if (!game.isPlayerAdmitted(player.nickname)) {
						state.value = 'wait';
					} else {
						router.push(localePath(game.url));
					}
				}
				loading.value = false;
			})
			.catch((err) => {
				if (err.status === 404) {
					errGlobal.value = 'game-not-found';
				} else {
					const response: APIErrorResponse = err.data;
					for (const error of response.errors) {
						if (error.field) {
							if (error.field === 'code') {
								errCode.value = error.message;
							} else {
								errNickname.value = error.message;
							}
						} else {
							errGlobal.value = 'unexpected-error';
						}
					}
				}
				loading.value = false;
			});
	}
};
const reset = () => {
	state.value = 'form';
	if (editable) {
		code.value = '    ';
		valCode.value = ['', '', '', ''];
	} else {
		fldCode.value?.validate();
	}
	valNickname.value = '';
	errGlobal.value = null;
	errCode.value = null;
	errNickname.value = null;
};

watch(
	() => socket.latest.value,
	(event) => {
		if (state.value === 'wait' && event) {
			if (event.type === 'admission') {
				const admission = event as AdmissionEvent;
				if (admission.response) {
					game.set(event.game);
					state.value = 'admitted';
				} else {
					socket.disconnect();
					usePlayerStore().$reset();
					state.value = 'denied';
				}
			}
		}
	}
);
</script>

<template>
	<div>
		<Spinner v-if="loading" />
		<Error v-if="errGlobal" :message="errGlobal" />
		<div v-if="state === 'form'">
			<Code
				ref="fldCode"
				:chars="valCode"
				:editable="editable"
				:error="errCode"
				@update="entered"
			/>
			<Nickname ref="fldNickname" v-model="valNickname" :error="errNickname" />
			<Button
				:link="game.url"
				label="join-now"
				class="w-full"
				data-testid="join-button"
				@click.prevent="join"
			/>
		</div>
		<div v-if="state === 'wait'">
			<Subheading>{{ valNickname }}</Subheading>
			<BodyText>{{ $t('you-are-waiting-to-be-admitted') }}</BodyText>
			<BodyText>{{
				$t('the-mayor-has-been-informed', { mayor: game.mayor?.nickname })
			}}</BodyText>
			<BodyText>{{ $t('do-not-leave-or-you-will-need-to-request-join-again') }}</BodyText>
			<BouncingDots />
		</div>
		<div v-if="state === 'admitted'">
			<Heading>{{ $t('you-are-in') }}</Heading>
			<Subheading>{{ valNickname }}</Subheading>
			<BodyText>
				{{ $t('mayor-has-let-you-in', { mayor: game.mayor?.nickname }) }}
			</BodyText>
			<Button :link="game.url" label="play-game" class="w-full" />
		</div>
		<div v-if="state === 'denied'">
			<Heading>{{ $t('denied') }}</Heading>
			<Subheading>{{ valNickname }}</Subheading>
			<BodyText>
				{{ $t('mayor-has-rejected-your-request', { mayor: game.mayor?.nickname }) }}
			</BodyText>
			<Button link="/join" label="try-again" class="w-full" @click.prevent="reset" />
		</div>
	</div>
</template>
