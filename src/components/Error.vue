<script setup lang="ts">
defineProps<{
	message: string;
}>();
</script>

<template>
	<div
		class="border-2 border-red-900 bg-red-600 text-red-200 rounded-2xl mb-4 p-4 font-oswald text-l"
	>
		{{ $t(message) }}
	</div>
</template>
