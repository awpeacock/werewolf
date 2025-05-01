<script setup lang="ts">
import { ref } from 'vue';

import Button from '@/components/Button.vue';
import Code from '@/components/Code.vue';
import Nickname from '@/components/Nickname.vue';

definePageMeta({
	title: 'join-game',
	footer: {
		src: '/images/village/queue.webp',
		alt: 'queue-alt-text',
	},
});

type JoinState = 'form' | 'wait';
const game = useGameStore();
const loading: Ref<boolean> = ref(false);

// Navigation - check which stage we're at, whether we've had a code or invite
// included in the URL, and generate the play link, if applicable
const route = useRoute();
const router = useRouter();
const state: Ref<JoinState> = ref('form');
const editable =
	route.params.id === undefined || route.params.id === null || route.params.id === '';
const code = ref(editable ? '    ' : (route.params.id as string));
const invite = route.query.invite ? route.query.invite : null;
const url = ref(`/play/${code.value.toUpperCase()}`);

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

const entered = (val: string) => {
	// This is triggered when the Code component has been successfully
	// completed - setup the play link value and move focus on to the Nickname
	code.value = val;
	url.value = '/play/' + code.value.toUpperCase();
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
		const api =
			`/api/games/${code.value.toUpperCase()}/join` + (invite ? `?invite=${invite}` : '');
		$fetch<Game>(api, {
			method: 'PUT',
			body: { villager: valNickname.value },
		})
			.then((response: Game) => {
				loading.value = false;
				game.set(useGame(response).parse());
				const player: Nullable<Player> = game.findPlayer(valNickname.value);
				if (player === null) {
					errGlobal.value = 'unexpected-error';
				} else {
					sessionStorage.setItem('player', JSON.stringify(player));
					if (!game.isPlayerAdmitted(player.nickname)) {
						state.value = 'wait';
					} else {
						router.push(url.value);
					}
				}
			})
			.catch((err) => {
				loading.value = false;
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
			});
	}
};
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
			<Button :link="url" label="join-now" class="w-full" @click.prevent="join" />
		</div>
		<div v-if="state === 'wait'">
			<BodyText>{{ $t('you-are-waiting-to-be-admitted') }}</BodyText>
			<BodyText>{{
				$t('the-mayor-has-been-informed', { mayor: game.mayor?.nickname })
			}}</BodyText>
			<BodyText>{{ $t('do-not-leave-or-you-will-need-to-request-join-again') }}</BodyText>
			<BouncingDots />
		</div>
	</div>
</template>
