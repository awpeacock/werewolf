<script setup lang="ts">
import { useGameStore } from '@/stores/game';

import Button from '@/components/Button.vue';

definePageMeta({
	title: 'werewolf-game',
	footer: null,
});

const game = useGameStore();
const player = usePlayerStore();

const reset = (action: string) => {
	let reset = true;
	// If the player is the mayor of the game then let them return so they
	// can send more invites.  Otherwise, clear down the session.  We do this
	// here, so that players can safely refresh inside the join pages.
	if (action === 'create') {
		if (game && player && game.mayor?.id === player.id) {
			reset = false;
		}
	}
	if (reset) {
		game.$reset();
		player.$reset();
		useBroadcastClient().disconnect();
	}
};
</script>

<template>
	<nav>
		<Button
			link="/create"
			label="create-game"
			class="w-full"
			data-testid="create-button"
			@click="reset('create')"
		/>
		<Button
			link="/join"
			label="join-game"
			class="w-full"
			data-testid="join-button"
			@click="reset('join')"
		/>
		<Button
			v-if="!game.active && game.hasPlayer(player.id)"
			:link="game.url"
			label="play-game"
			class="w-full"
			data-testid="play-button"
		/>
		<Button
			v-if="game.active && game.hasPlayer(player.id)"
			:link="game.url"
			label="resume-game"
			data-testid="resume-button"
			class="w-full"
		/>
		<Button
			link="/instructions"
			label="how-to-play"
			class="w-full"
			data-testid="instructions-button"
		/>
	</nav>
</template>
