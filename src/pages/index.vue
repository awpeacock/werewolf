<script setup lang="ts">
import { useGameStore } from '@/stores/game';

import Button from '@/components/Button.vue';

definePageMeta({
	title: 'werewolf-game',
});

const game = useGameStore();
</script>

<template>
	<nav>
		<Button link="/create" label="create-game" class="w-full" />
		<Button link="/join" label="join-game" class="w-full" />
		<Button v-if="game.active" :link="game.url" label="resume-game" class="w-full" />
	</nav>
</template>
