<script setup lang="ts">
const route = useRoute();
const game = useGameStore();
const player = usePlayerStore();
const util = useGame(game);

const loaded = ref(false);
const margin = computed(() => {
	return route.meta.footer ? 'max-sm:mb-[250px]' : '';
});
onMounted(() => {
	loaded.value = true;
});
</script>

<template>
	<div v-show="loaded" class="flex flex-col">
		<div class="flex flex-row justify-between w-full">
			<a
				v-if="useRoute().path !== '' && useRoute().path !== '/'"
				href="/"
				class="font-oswald text-white mt-3 ml-4"
			>
				&lsaquo; {{ $t('go-home') }}
			</a>
			<span v-else>&nbsp;</span>
			<span v-if="player.id !== '' && game && util.isPlayerAdmitted(player.id)" class="mt-3">
				<span class="font-oswald text-yellow-200 mr-2"
					>{{ player.nickname }} ({{ $t(player.role) }})</span
				>
				<span class="font-oswald text-white mr-2">{{ game.id }}</span>
			</span>
			<Notifications />
			<LocaleSwitcher />
		</div>
		<div class="flex flex-col md:flex-row">
			<Header class="md:w-[250px] md:mx-4" />
			<main :class="`w-full p-4 ${margin} md:z-10`">
				<slot />
			</main>
			<Footer />
		</div>
	</div>
</template>
