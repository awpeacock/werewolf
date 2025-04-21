<script setup lang="ts">
const props = defineProps<{
	link: string;
	label: string;
	class: string;
}>();
defineOptions({
	inheritAttrs: false,
});
const emit = defineEmits<{
	(_e: 'click', _event: MouseEvent): void;
}>();

const localePath = useLocalePath();
</script>

<template>
	<NuxtLink v-slot="{ navigate }" :to="{ path: localePath(link) }" custom>
		<button
			role="link"
			class="border-2 border-yellow-200 rounded-2xl mb-4 p-4 bg-yellow-600 text-yellow-100 font-oswald text-xl cursor-pointer"
			:class="props.class"
			v-bind="$attrs"
			@click="
				(event) => {
					emit('click', event);
					if (!event.defaultPrevented) {
						navigate();
					}
				}
			"
		>
			{{ $t(label) }}
		</button>
	</NuxtLink>
</template>
