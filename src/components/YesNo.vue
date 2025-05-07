<script setup lang="ts">
defineProps<{
	yes: () => Promise<void>;
	no: () => Promise<void>;
}>();
</script>

<template>
	<strong class="flex flex-1 justify-end">
		<span
			class="flex justify-center items-center justify-center w-[40px] h-[40px] mr-2 rounded-full border-2 border-green-950 bg-green-500 green-950 cursor-pointer"
			@click="yes"
		>
			&#10004;
		</span>
		<span
			class="flex justify-center items-center justify-center w-[40px] h-[40px] rounded-full border-2 border-red-950 bg-red-500 red-950 cursor-pointer"
			@click="no"
		>
			&#10008;
		</span>
	</strong>
</template>
