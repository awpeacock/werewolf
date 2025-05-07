<script setup lang="ts">
const route = useRoute();

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
		<div class="flex flex-row self-end">
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
