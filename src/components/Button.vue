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
