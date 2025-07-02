<script setup lang="ts">
const props = defineProps<{
	modelValue: string;
	error?: string | null;
}>();
defineEmits(['update:modelValue']);

const element = useTemplateRef('element');
const formfield = useFormfield(element, props.modelValue, toRef(props, 'error'));

const focus = (): void => {
	element.value!.focus();
};
const validate = (): boolean => {
	return formfield.validate(useValidation().validateNickname);
};
// We need to expose focus so that the form can be focused on after other activities
// (i.e. the Code component being completed).  Also the result of validate, so that
// any conditional activities in the parent know to proceed.
defineExpose({ focus, validate });
</script>

<template>
	<div class="w-full mb-4">
		<input
			ref="element"
			type="text"
			class="border-2 w-full p-4 font-oswald text-xl"
			:class="formfield.classes"
			:placeholder="$t('nickname')"
			minlength="4"
			maxlength="16"
			v-bind="$attrs"
			:value="modelValue"
			data-testid="nickname-input"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
			@focus="formfield.reset"
			@blur="validate"
		/>
		<div
			v-if="formfield.error"
			class="ml-4 mr-4 p-2 rounded-b-lg bg-red-600 text-white font-oswald"
			data-testid="nickname-error"
		>
			{{ $t(formfield.error) }}
		</div>
	</div>
</template>
