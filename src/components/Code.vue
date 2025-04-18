<script setup lang="ts">
import { useTemplateRef } from 'vue';

defineProps<{
	chars: string | Array<string>;
	editable?: boolean;
}>();
const emit = defineEmits(['update']);

let code = '    ';
const inputs = useTemplateRef('inputs');

// Switch focus to the next input on each keypress, and keep
// concatenating the overall "code" string
const next = (target: EventTarget | null, idx: number): void => {
	const input: HTMLInputElement = target as HTMLInputElement;
	const value: string = input?.value;
	if (value.length === 1) {
		const lists: Array<HTMLLIElement> = inputs.value as Array<HTMLLIElement>;
		lists.forEach((list) => {
			const input = list.children[0] as HTMLInputElement;
			const c: number = parseInt(input.getAttribute('data-key')!);
			const char: string = input.value ? input.value : ' ';
			code = code.substring(0, c) + char + code.substring(c + 1);
			if (idx < 3) {
				if (c === idx + 1) {
					input.focus();
				}
			}
		});
		emit('update', code);
	}
};
</script>

<template>
	<ul class="flex flex-row mb-4">
		<li
			v-for="(char, idx) in chars"
			:key="idx"
			ref="inputs"
			class="border-2 border-yellow-200 w-1/4 mx-2 first:ml-0 last:mr-0 p-0 bg-yellow-100 text-center text-yellow-600 text-4xl font-inter"
		>
			<input
				v-if="editable"
				type="text"
				class="w-full p-4 text-center text-yellow-600 text-4xl font-inter uppercase"
				minlength="1"
				maxlength="1"
				:data-key="idx"
				@keyup="next($event.target, idx)"
			/>
			<span v-if="!editable" class="block p-4">{{ char }}</span>
		</li>
	</ul>
</template>
