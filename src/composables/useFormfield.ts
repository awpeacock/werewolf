// Please note re Istanbul ignore comments - these are edge case scenarios that never occur in the app,
// thus will never be covered by Playwright tests, but they are covered by unit tests

type FormComponentState = {
	value: Undefinable<string>;
	classes: string;
	error: string;
};
type ValidationMethod = (_value: Undefinable<string>) => Array<APIError>;
const Tailwind = {
	Default: 'border-yellow-200 bg-yellow-100 text-yellow-600',
	Valid: 'border-green-600 bg-green-200 text-green-900',
	Invalid: 'border-red-600 bg-red-200 text-red-900',
};

export const useFormfield = (
	element: Ref<Nullable<Array<HTMLElement> | HTMLElement>>,
	defaultValue: Undefinable<Array<string> | string>,
	error: Ref<Nullable<Undefinable<string>>>
) => {
	const internalRef: Ref<Nullable<Array<HTMLElement> | HTMLElement>> = ref(null);
	const state: FormComponentState = reactive({
		value: Array.isArray(defaultValue) ? defaultValue.join('') : defaultValue,
		classes: Tailwind.Default,
		error: '',
	});

	// Collect all the actual <input> elements related with the "parent"
	// component, so we can watch them and retrieve values from them
	const inputs: Ref<Array<HTMLInputElement>> = computed(() => {
		if (Array.isArray(element.value)) {
			return element.value.flatMap((el) => {
				/* istanbul ignore if @preserve */
				if (el instanceof HTMLInputElement) {
					return [el];
				} else {
					return Array.from(el.querySelectorAll<HTMLInputElement>('input'));
				}
			});
		} else {
			/* istanbul ignore else @preserve */
			if (element.value instanceof HTMLInputElement) {
				return [element.value];
			} else {
				return Array.from(element.value!.querySelectorAll<HTMLInputElement>('input'));
			}
		}
	});

	// Every time an one of the above's oninput is triggered, this
	// will keep the component's value updated (this may be needed at
	// any point, so keep up to date here rather than only on validate)
	const update = () => {
		let value = '';
		for (const input of inputs.value) {
			value += input.value;
		}
		state.value = value;
	};

	// Each component will have its own bespoke validation function,
	// but this should handle a consistent styling and messaging based
	// on that callback
	const validate = (callback: ValidationMethod): boolean => {
		const result = callback(state.value);
		if (result.length > 0) {
			state.classes = Tailwind.Invalid;
			state.error = result[0].message;
			return false;
		} else {
			state.classes = Tailwind.Valid;
			state.error = '';
			return true;
		}
	};

	// We may get errors passed in from server-side validation, so
	// watch for this change.
	const invalidate = (message: string): void => {
		state.classes = Tailwind.Invalid;
		state.error = message;
	};

	// Reset the styling and clear any messages (usually upon focus)
	const reset = (): void => {
		state.classes = Tailwind.Default;
		state.error = '';
	};

	// When the "parent" component has mounted, we need to keep track
	// of any updates to it
	onMounted(() => {
		/* istanbul ignore else @preserve */
		if (element.value) {
			internalRef.value = element.value;
			inputs.value.forEach((input) => {
				input.oninput = update;
			});
		} else {
			throw new Error(
				'Attempt to instatiate a formfield component without a related HTML element'
			);
		}
	});

	// We may get errors passed in from server-side validation, so
	// watch for this change (from the "error" prop passed in
	// at instantiation)
	watch(error, (error) => {
		if (error) {
			invalidate(error);
		}
	});

	return reactive({
		element: internalRef,
		...toRefs(state),
		validate,
		invalidate,
		reset,
	});
};
