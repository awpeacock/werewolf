<script setup lang="ts">
const route = useRoute();

const current = computed(() => route.meta.footer as FooterMeta | undefined);

const imageA: Ref<Undefinable<FooterMeta>> = ref(current.value);
const imageB: Ref<Undefinable<FooterMeta>> = ref(current.value);
const opacityA = ref('opacity-100');
const opacityB = ref('opacity-0');

watch(
	() => route.meta.footer,
	(newMeta, oldMeta) => {
		if (imageA.value === (oldMeta as FooterMeta)) {
			imageB.value = newMeta as FooterMeta;
			opacityA.value = 'opacity-0';
			opacityB.value = 'opacity-100';
		} else {
			imageA.value = newMeta as FooterMeta;
			opacityB.value = 'opacity-0';
			opacityA.value = 'opacity-100';
		}
	}
);
</script>

<template>
	<footer
		v-if="current"
		class="fixed bottom-0 max-sm:left-0 w-full sm:absolute sm:max-md:top-[18px] sm:max-md:right-0 sm:max-md:mt-8 sm:max-md:p-2 sm:max-md:w-[200px] sm:max-md:h-[120px]"
	>
		<div
			class="absolute bottom-[-1px] w-full h-[250px] bg-yellow-800 [clip-path:polygon(0_45%,100%_0,100%_100%,0%_100%)] opacity-75 z-2 sm:hidden"
		></div>
		<div
			class="absolute bottom-0 w-full h-[250px] bg-yellow-200 [clip-path:polygon(0_45%,100%_0,100%_100%,0%_100%)] opacity-75 z-1 sm:hidden"
		></div>
		<div class="flex justify-center mx-4 md:w-[250px] md:mx-0">
			<img
				v-if="imageA"
				:src="imageA.src"
				:alt="$t(imageA.alt)"
				class="absolute bottom-0 max-w-full max-h-[250px] z-3 sm:max-h-[120px] md:max-w-[200px] md:max-h-[200px] transition-opacity ease-in duration-750"
				:class="opacityA"
			/>
			<img
				v-if="imageB"
				:src="imageB.src"
				:alt="$t(imageB.alt)"
				class="absolute bottom-0 max-w-full max-h-[250px] z-3 sm:max-h-[120px] md:max-w-[200px] md:max-h-[200px] transition-opacity ease-in duration-750"
				:class="opacityB"
			/>
		</div>
	</footer>
</template>
