<script setup lang="ts">
import { ref } from 'vue';
import type { Ref } from 'vue';

import { useGameStore } from '@/stores/game';

import Button from '@/components/Button.vue';
import Code from '@/components/Code.vue';
import Error from '@/components/Error.vue';
import Nickname from '@/components/Nickname.vue';
import Spinner from '@/components/Spinner.vue';

interface CreateStatus {
	stage: number;
	code: string;
}

definePageMeta({
	title: 'create-game',
	footer: {
		src: '/images/village/carpenter.webp',
		alt: 'carpenter-alt-text',
	},
});

const status: Ref<CreateStatus> = ref({ stage: 1, code: '' });
const game = useGameStore();
const input: Ref<Nullable<typeof Nickname>> = ref(null);
const nickname: Ref<string> = ref('');
const loading: Ref<boolean> = ref(false);
const validationError: Ref<Nullable<string>> = ref(null);
const isSystemError: Ref<boolean> = ref(false);

// Can only store on the session on client side, so only try and run
// it there (after the component is mounted)
onMounted(() => {
	const stored: Nullable<string> = sessionStorage.getItem('create');
	if (stored !== null) {
		status.value = JSON.parse(stored);
		// Reset back to stage 1 if we somehow get here without either a code,
		// or a code that doesn't match the game in the session (as that is
		// where we will get all the data to send out invites)
		if (status.value.code === null || status.value.code !== game.id) {
			status.value = { stage: 1, code: '' };
			sessionStorage.removeItem('create');
		}
	}
});

const create = async (): Promise<void> => {
	// Clear down any existing error messages so the screen
	// is only updated with "live" errors from this attempt
	isSystemError.value = false;
	validationError.value = null;

	const valid = input.value?.validate();
	if (valid) {
		loading.value = true;
		$fetch<Game>('/api/games', {
			method: 'POST',
			body: { mayor: nickname.value },
		})
			.then((response: Game) => {
				status.value.code = response.id;
				status.value.stage++;
				sessionStorage.setItem('create', JSON.stringify(status.value));
				// Store the game and player details respectively
				game.set(useGame(response).parse());
				usePlayerStore().set(game.mayor as Player);
				// Now setup the connection to listen for notifications
				useBroadcastClient().connect(game, game.mayor!);
				loading.value = false;
			})
			.catch((e) => {
				const response: APIErrorResponse = e.data;
				if (response?.errors?.[0]?.field) {
					validationError.value = response.errors[0].message;
				} else {
					isSystemError.value = true;
				}
				loading.value = false;
			});
	}
};
</script>

<template>
	<div>
		<Spinner v-if="loading" />
		<Error v-if="isSystemError" message="unexpected-error" />
		<div v-if="status!.stage == 1">
			<Nickname ref="input" v-model="nickname" :error="validationError" />
			<Button
				link="/create"
				label="create"
				class="w-full"
				data-testid="create-button"
				@click="create"
			/>
		</div>
		<div v-else>
			<Code :chars="status!.code" />
			<Button
				link="/create/invite"
				label="invite-players"
				data-testid="invite-button"
				class="w-full"
			/>
			<Button :link="game.url" label="play-game" class="w-full" />
		</div>
	</div>
</template>
