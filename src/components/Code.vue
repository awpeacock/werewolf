<script setup lang="ts">
const props = defineProps<{
	chars: string | Array<string>;
	editable?: boolean;
	error?: string | null;
}>();
const emit = defineEmits(['update']);

const element = useTemplateRef('element');
const formfield = useFormfield(element, props.chars, toRef(props, 'error'));

// Prevent entry of any non-alphanumeric characters
const filter = (event: KeyboardEvent): void => {
	if (!/^[A-Za-z0-9]+$/.test(event.key)) {
		return event.preventDefault();
	}
};
// Switch focus to the next input on each keypress
const next = (event: KeyboardEvent, idx: number): void => {
	const input: HTMLInputElement = event.target as HTMLInputElement;
	const value: string = input?.value;
	const list: Array<HTMLLIElement> = formfield.element as Array<HTMLLIElement>;
	list.forEach((item) => {
		const input = item.children[0] as HTMLInputElement;
		const c: number = parseInt(input.getAttribute('data-key')!);
		if (value.length === 1) {
			if (idx < 3) {
				if (c === idx + 1) {
					input.focus();
				}
			}
			emit('update', formfield.value?.toUpperCase());
		}
	});
};
const validate = (idx?: number): boolean => {
	if (Number.isInteger(idx) && idx! < 3) {
		return true;
	}
	const valid = formfield.validate(useValidation().validateCode);
	// Clean up any blank chars so the user can enter into those
	// inputs on return (if not the space will take up the one allowed char)
	const list: Array<HTMLLIElement> = formfield.element as Array<HTMLLIElement>;
	list.forEach((item) => {
		const input = item.children[0] as HTMLInputElement;
		if (input.value == ' ') {
			input.value = '';
		}
	});
	return valid;
};
// We need to expose the result of validate, so that
// any conditional activities in the parent know to proceed.
defineExpose({ validate });
</script>

<template>
	<ul class="flex flex-row mb-4">
		<li
			v-for="(char, idx) in chars"
			:key="idx"
			ref="element"
			class="border-2 w-1/4 mx-2 first:ml-0 last:mr-0 p-0 text-center text-4xl font-inter"
			:class="formfield.classes"
		>
			<input
				v-if="editable"
				type="text"
				class="w-full p-4 text-center text-4xl font-inter uppercase"
				:class="formfield.classes"
				minlength="1"
				maxlength="1"
				:data-key="idx"
				data-testid="code-char"
				@keydown="filter($event)"
				@input="
					($event.target as HTMLInputElement).value = (
						$event.target as HTMLInputElement
					).value?.toUpperCase()
				"
				@keyup="next($event, idx)"
				@focus="formfield.reset"
				@blur="validate(idx)"
			/>
			<span v-if="!editable" class="block p-4" data-testid="code-char">{{ char }}</span>
		</li>
	</ul>
	<div
		v-if="formfield.error !== ''"
		class="-mt-4 mb-4 ml-4 mr-4 p-2 rounded-b-lg bg-red-600 text-white font-oswald"
		data-testid="code-error"
	>
		{{ $t(formfield.error) }}
	</div>
</template>
