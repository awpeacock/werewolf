<script setup lang="ts">
const loaded = ref(false);
onMounted(() => {
	loaded.value = true;
});
</script>

<template>
	<div v-show="loaded" class="flex flex-col">
		<div class="flex flex-row self-end">
			<LocaleSwitcher />
		</div>
		<div class="flex flex-col md:flex-row">
			<Header class="md:w-1/3" />
			<main class="md:w-2/3 p-4">
				<slot />
			</main>
		</div>
	</div>
</template>
