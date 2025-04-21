<script setup lang="ts">
const route = useRoute();

const meta = computed(() => route.meta.footer as FooterMeta);
</script>

<template>
	<footer
		v-if="meta"
		class="fixed bottom-0 max-sm:left-0 w-full sm:absolute sm:max-md:top-[18px] sm:max-md:right-0 sm:max-md:mt-8 sm:max-md:p-2 sm:max-md:w-[200px] sm:max-md:h-[120px]"
	>
		<div
			class="absolute w-full h-full bg-yellow-800 [clip-path:polygon(0_45%,100%_0,100%_100%,0%_100%)] opacity-75 z-2 sm:hidden"
		></div>
		<div
			class="absolute bottom-[2px] w-full h-full bg-yellow-200 [clip-path:polygon(0_45%,100%_0,100%_100%,0%_100%)] opacity-75 z-1 sm:hidden"
		></div>
		<div class="flex justify-center mx-4 md:w-[250px] md:mx-0">
			<img
				:src="meta.src"
				:alt="$t(meta.alt)"
				class="relative max-w-full max-h-[250px] z-3 sm:max-h-[120px] md:max-w-[200px] md:max-h-[200px]"
			/>
		</div>
	</footer>
</template>
