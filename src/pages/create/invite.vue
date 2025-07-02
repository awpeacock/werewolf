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
const showShare = ref(false);
const showInvite = ref(false);
const showCopy = ref(false);
const copied = ref(false);
const error = ref('');
const url = ref('');
const mailto = ref('');

const share = async (event: MouseEvent) => {
	const url = new URL(localePath(game.invite), useRequestURL()).toString();
	const content: ShareData = {
		title: t('invite-subject'),
		text: t('invite-message', { inviter: game.players[0].nickname }),
		url: url,
	};
	if (navigator.share && navigator.canShare(content)) {
		event?.preventDefault();
		await navigator.share(content);
	}
};
const copy = () => {
	navigator.clipboard.writeText(url.value);
	copied.value = true;
};

onMounted(() => {
	const player = usePlayerStore();
	showInvite.value = game.id !== '' && game.mayor?.id === player.id;
	showShare.value = navigator.share !== undefined;
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
				<BodyText>{{ $t('invite-introduction') }}</BodyText>
				<div class="flex flex-col sm:flex-row">
					<div class="flex flex-row justify-center items-center">
						<span v-if="showShare" class="w-1/5 mb-4 mr-4 cursor-pointer">
							<IconShare
								:alt="$t('share-icon')"
								class="size-full *:fill-yellow-200"
								data-testid="share-icon"
								@click="share"
							/>
						</span>
						<a :href="mailto" class="w-1/3 mb-4 mr-4" data-testid="email-icon">
							<IconMail :alt="$t('mail-icon')" class="size-full *:fill-yellow-200" />
						</a>
					</div>
					<div
						class="flex flex-col w-full content-center border border-white rounded mb-4 p-4 font-oswald text-sm text-yellow-200 sm:min-w-2/3"
					>
						<p
							v-if="showCopy"
							class="flex flex-row justify-end -mt-2 mb-[calc((var(--spacing)*2)-16px)] -mr-2 cursor-pointer"
						>
							<IconCopy
								v-if="!copied"
								:alt="$t('copy-icon')"
								class="w-[16px] mt-[2px] mb-[1px]"
								data-testid="copy-icon"
								@click="copy"
							/>
							<span v-else>&#10004;</span>
						</p>
						<p class="my-auto pr-[16px] lg:text-lg" data-testid="invite-url">
							{{ url }}
						</p>
					</div>
				</div>

				<BodyText>{{ $t('invite-instructions') }}</BodyText>
			</div>
		</div>
		<div v-else>
			<Error :message="error" />
		</div>
		<Button link="/create" label="go-back" class="w-full" />
	</div>
</template>
