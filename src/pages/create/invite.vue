<script setup lang="ts">
definePageMeta({
	title: 'invite-players',
	footer: {
		src: '/images/village/mailman.webp',
		alt: 'mailman-alt-text',
	},
});

const { t } = useI18n();
const localePath = useLocalePath();

// Cannot detect browser capabilities on server so set as false until mounted
const game = useGameStore();
const loaded = ref(false);
const showInvite = ref(false);
const showCopy = ref(false);
const error = ref('');
const url = ref('');
const mailto = ref('');

const copy = () => {
	navigator.clipboard.writeText(url.value);
};

onMounted(() => {
	const player = sessionStorage.getItem('player');
	showInvite.value = game.id !== '' && JSON.stringify(game.mayor) === player;
	showCopy.value = navigator.clipboard !== undefined;
	if (!showInvite.value) {
		error.value = game.id === '' ? 'invite-no-game' : 'invite-not-mayor';
	}

	if (game.id && game.mayor) {
		url.value = new URL(localePath(game.invite), useRequestURL()).toString();
		const mailBody = t('invite-message', { inviter: game.mayor.nickname }) + '\n\n' + url.value;
		mailto.value = `mailto:?subject=${t('invite-subject')}&body=${mailBody}`;
	}
	loaded.value = true;
});
</script>

<template>
	<div v-show="loaded">
		<div v-if="showInvite">
			<Code :chars="game!.id" />
			<div v-show="url">
				<p class="mb-4 font-oswald text-base text-white">{{ $t('invite-introduction') }}</p>
				<div class="flex flex-row items-center">
					<a :href="mailto" class="w-1/3 mb-4 mr-4">
						<IconMail class="size-full *:fill-yellow-200" />
					</a>
					<div
						class="flex flex-col w-full content-center border border-white rounded mb-4 p-4 font-oswald text-sm text-yellow-200"
					>
						<p
							v-if="showCopy"
							class="flex flex-row justify-end -mt-2 mb-[calc((var(--spacing)*2)-16px)] -mr-2"
						>
							<IconCopy class="w-[16px]" @click="copy" />
						</p>
						<p class="my-auto pr-[16px]">{{ url }}</p>
					</div>
				</div>
				<p class="mb-4 font-oswald text-base text-white">{{ $t('invite-instructions') }}</p>
			</div>
		</div>
		<div v-else>
			<p class="mb-4 font-oswald text-base text-white">{{ $t(error) }}</p>
		</div>
		<Button link="/create" label="go-back" class="w-full" />
	</div>
</template>
