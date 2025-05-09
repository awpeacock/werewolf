<script setup lang="ts">
const props = defineProps<{
	link: string;
	label: string;
	class: string;
	disabled?: boolean;
}>();
defineOptions({
	inheritAttrs: false,
});
const emit = defineEmits<{
	(_e: 'click', _event: MouseEvent): void;
}>();

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
if (props.link.indexOf('?') !== -1) {
	target.path = localePath(props.link.substring(0, props.link.indexOf('?')));
	const query = props.link.substring(props.link.indexOf('?') + 1);
	const params: { [key: string]: string } = {};
	const pairs = query.split('&');
	for (const pair of pairs) {
		const [key, val] = pair.split('=');
		params[key] = val;
	}
	target.query = params;
}
</script>

<template>
	<NuxtLink v-slot="{ navigate }" :to="target" custom>
		<button
			role="link"
			class="border-2 rounded-2xl mb-4 p-4 font-oswald text-xl cursor-pointer"
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
			{{ $t(label) }}
		</button>
	</NuxtLink>
</template>
