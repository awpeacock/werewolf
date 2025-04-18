<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
	modelValue: string;
	serverError?: string | null;
}>();
defineEmits(['update:modelValue']);

const clazzes = {
	default: 'border-yellow-200 bg-yellow-100 text-yellow-600',
	success: 'border-green-600 bg-green-200 text-green-900',
	error: 'border-red-600 bg-red-200 text-red-900',
};
const error = ref('');
const clazz = ref(clazzes.default);
const valid = ref(false);

const validate = (): boolean => {
	const errors: Array<APIError> = validateNickname(props.modelValue);
	valid.value = true;
	if (errors.length === 0) {
		clazz.value = clazzes.success;
		valid.value = true;
	} else {
		clazz.value = clazzes.error;
		error.value = errors[0].message;
		valid.value = false;
	}
	return valid.value;
};
const reset = (): void => {
	clazz.value = clazzes.default;
	error.value = '';
};
// We need to expose the result of validate, so that any conditional
// activities in the parent know to proceed.
defineExpose({ validate });

// We may get errors passed in from server-side validation, so
// watch for this change.
watch(
	() => props.serverError,
	(err) => {
		if (err) {
			clazz.value = clazzes.error;
			error.value = err;
			valid.value = false;
		}
	}
);
</script>

<template>
	<div class="w-full mb-4">
		<input
			type="text"
			class="border-2 w-full p-4 font-oswald text-xl"
			:class="clazz"
			:placeholder="$t('nickname')"
			minlength="4"
			maxlength="16"
			v-bind="$attrs"
			:value="modelValue"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
			@blur="validate"
			@focus="reset"
		/>
		<div v-if="error" class="ml-4 mr-4 p-2 rounded-b-lg bg-red-600 text-white font-oswald">
			{{ $t(error) }}
		</div>
	</div>
</template>
