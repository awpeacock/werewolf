<script setup lang="ts">
const route = useRoute();
const game = useGameStore();
const player = usePlayerStore();
const util = useGame(game);

const loaded = ref(false);
const margin = computed(() => {
	return route.meta.footer ? 'max-sm:mb-[250px]' : '';
});
const direction = computed(() => {
	return route.path === '/' ? 'md:flex-row' : '';
});
onMounted(() => {
	loaded.value = true;
});
</script>

<template>
	<div v-show="loaded" class="flex flex-row md:bg-yellow-200">
		<div
			class="hidden md:flex md:flex-wrap md:content-center md:w-[100px] md:min-h-screen md:ml-auto md:bg-yellow-700 md:bg-[url(/images/line-left.webp)] bg-repeat-y"
		>
			<img
				src="/images/claws-left.webp"
				width="100"
				alt="Wolf claws appearing from behind the main content"
				class="z-100"
			/>
		</div>
		<div class="flex flex-col w-full md:w-[568px] md:bg-yellow-700">
			<div class="flex flex-row justify-between w-full">
				<NuxtLink
					v-if="useRoute().path !== '' && useRoute().path !== '/'"
					to="/"
					class="font-oswald text-white mt-3 ml-4"
				>
					&lsaquo; {{ $t('go-home') }}
				</NuxtLink>
				<span v-else>&nbsp;</span>
				<span
					v-if="player.id !== '' && game && util.isPlayerAdmitted(player.id)"
					class="mt-3"
				>
					<span class="font-oswald text-yellow-200 mr-2"
						>{{ player.nickname }} ({{ $t(player.role) }})</span
					>
					<span class="font-oswald text-white mr-2">{{ game.id }}</span>
				</span>
				<Notifications />
				<LocaleSwitcher />
			</div>
			<div class="flex flex-col" :class="direction">
				<Header class="md:w-[250px] md:mx-4" />
				<main :class="`w-full p-4 ${margin}`">
					<slot />
				</main>
				<Footer />
			</div>
		</div>
		<div
			class="hidden md:flex md:flex-wrap md:content-center md:w-[100px] md:min-h-screen md:mr-auto md:bg-yellow-700 md:bg-[url(/images/line-right.webp)] bg-repeat-y"
		>
			<img
				src="/images/claws-right.webp"
				width="100"
				alt="Wolf claws appearing from behind the main content"
				class="z-100"
			/>
		</div>
	</div>
</template>
