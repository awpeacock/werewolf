<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		link: string;
		label: string;
		class?: string;
		disabled?: boolean;
		translate?: boolean;
	}>(),
	{
		class: '',
		translate: true,
	}
);
defineOptions({
	inheritAttrs: false,
});
const emit = defineEmits<(_e: 'click', _event: MouseEvent) => void>();

const colours = computed(() => {
	return props.disabled
		? 'border-stone-900 bg-stone-400 text-stone-900'
		: 'border-yellow-200 bg-yellow-600 text-yellow-100';
});
const clazz = computed(() => {
	return props.class + ' ' + colours.value;
});

const localePath = useLocalePath();
const target = { path: localePath(props.link), query: {} };
</script>

<template>
	<NuxtLink v-slot="{ navigate }" :to="target" custom>
		<a
			role="link"
			class="inline-block border-2 rounded-2xl mb-4 p-4 font-oswald text-xl cursor-pointer"
			:class="clazz"
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
			{{ translate ? $t(label) : label }}
		</a>
	</NuxtLink>
</template>
