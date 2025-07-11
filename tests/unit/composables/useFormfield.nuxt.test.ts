import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';

import { UnexpectedErrorResponse } from '@/types/constants';

interface UseFormFieldReturn {
	element: Ref<Nullable<HTMLElement | HTMLElement[]>>;
	value: Ref<Undefinable<string>>;
	classes: Ref<string>;
	error: Ref<string>;
	validate: (_callback: (_value: Undefinable<string>) => Array<APIError>) => boolean;
	invalidate: (_message: string) => void;
	reset: () => void;
}
type ComponentWithFormfield = {
	formfield: UseFormFieldReturn;
};

describe('useFormfield', () => {
	const single = (error: Ref<undefined | string>) => {
		return {
			template: '<div><input ref="element" /><span>{{ formfield.error }}</span></div>',
			setup() {
				const element = useTemplateRef<HTMLInputElement | null>('element');
				const formfield = useFormfield(element, undefined, error);
				return { formfield };
			},
		};
	};

	const array = (error: Ref<undefined | string>) => {
		return {
			template:
				'<div><div v-for="idx in 2" :key="idx"><input ref="elements" /></div><span>{{ formfield.error }}</span></div>',
			setup() {
				const elements = useTemplateRef<HTMLDivElement | null>('elements');
				const formfield = useFormfield(elements, undefined, ref(error));
				return { formfield };
			},
		};
	};

	const expectOnInput = async (wrapper: VueWrapper) => {
		const formfield = (wrapper.vm as unknown as ComponentWithFormfield).formfield;
		const inputs = wrapper.findAll('input');
		expect(inputs.length).toBe(2);
		for (const input of inputs.values()) {
			expect(input.element.oninput).not.toBeNull();
		}

		await inputs[0].setValue('New ');
		await inputs[0].trigger('input');
		await nextTick();
		expect(formfield.value).toEqual('New ');
		await inputs[1].setValue('Values');
		await inputs[1].trigger('input');
		await nextTick();
		expect(formfield.value).toEqual('New Values');
	};

	const expectValidation = async (wrapper: VueWrapper, valid: boolean, reset?: boolean) => {
		const formfield = (wrapper.vm as unknown as ComponentWithFormfield).formfield;
		expect(formfield.classes).toContain('bg-yellow');

		if (valid) {
			formfield.validate(() => UnexpectedErrorResponse.errors);
			expect(formfield.classes).toContain('bg-red');
			await nextTick();
			expect(wrapper.text()).toContain(UnexpectedErrorResponse.errors[0].message);

			formfield.validate(() => []);
			expect(formfield.classes).toContain('bg-green');
		} else {
			formfield.invalidate('Oops');
			expect(formfield.classes).toContain('bg-red');
			await nextTick();
			expect(wrapper.text()).toContain('Oops');
		}
		if (reset === true) {
			formfield.reset();
			expect(formfield.classes).toContain('bg-yellow');
		}
	};

	it('should successfully instantiate with a valid component', async () => {
		// Test with a single input
		const wrapperSingle = mount(single(ref(undefined)));
		await nextTick();

		const formfieldSingle = wrapperSingle.vm.formfield as UseFormFieldReturn;
		const inputSingle = wrapperSingle.find('input');
		await inputSingle.setValue('Single input value');
		await inputSingle.trigger('input');
		await nextTick();

		expect(formfieldSingle.value).toEqual('Single input value');
		expect(formfieldSingle.error).toEqual('');

		// Test with an array of inputs
		const wrapperArray = mount(array(ref(undefined)));
		await nextTick();

		const formfieldArray = wrapperArray.vm.formfield as UseFormFieldReturn;
		const inputArray = wrapperArray.findAll('input');

		await inputArray[0].setValue('Multiple ');
		await inputArray[0].trigger('input');
		await nextTick();

		await inputArray[1].setValue('Values');
		await inputArray[1].trigger('input');
		await nextTick();

		expect(formfieldArray.value).toEqual('Multiple Values');
		expect(formfieldArray.error).toEqual('');
	});

	it('should append oninput to any single inputs on mount that update the state value', async () => {
		const wrapper = mount(single(ref(undefined)));
		await nextTick();

		const formfield = wrapper.vm.formfield as UseFormFieldReturn;
		const input = wrapper.find('input');
		expect(input.element.oninput).not.toBeNull();

		await input.setValue('New value');
		await input.trigger('input');
		await nextTick();
		expect(formfield.value).toEqual('New value');
	});

	it('should append oninput to any single inputs via its parent on mount that update the state value', async () => {
		const component = {
			template: '<div ref="element"><input /><span>{{ formfield.error }}</span></div>',
			setup() {
				const element = useTemplateRef<HTMLInputElement | null>('element');
				const formfield = useFormfield(element, undefined, ref(undefined));
				return { formfield };
			},
		};
		const wrapper = mount(component);
		await nextTick();

		const formfield = wrapper.vm.formfield as UseFormFieldReturn;
		const input = wrapper.find('input');
		expect(input.element.oninput).not.toBeNull();

		await input.setValue('New value');
		await input.trigger('input');
		await nextTick();
		expect(formfield.value).toEqual('New value');
	});

	it('should append oninput to an array of inputs on mount that update the state value', async () => {
		const wrapper = mount(array(ref(undefined)));
		await nextTick();

		await expectOnInput(wrapper);
	});

	it('should append oninput to an array of inputs via their parents on mount that update the state value', async () => {
		const component = {
			template:
				'<div><div v-for="idx in 2" :key="idx" ref="elements"><input /></div><span>{{ formfield.error }}</span></div>',
			setup() {
				const elements = useTemplateRef<HTMLDivElement | null>('elements');
				const formfield = useFormfield(elements, undefined, ref(undefined));
				return { formfield };
			},
		};
		const wrapper = mount(component);
		await nextTick();

		await expectOnInput(wrapper);
	});

	it('should successfully validate single inputs based on a callback supplied', async () => {
		const wrapper = mount(single(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, true);
	});

	it('should successfully validate arrays of inputs based on a callback supplied', async () => {
		const wrapper = mount(array(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, true);
	});

	it('should successfully invalidate single inputs', async () => {
		const wrapper = mount(single(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, false);
	});

	it('should successfully invalidate arrays of inputs', async () => {
		const wrapper = mount(array(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, false);
	});

	it('should successfully reset single inputs', async () => {
		const wrapper = mount(single(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, false, true);
	});

	it('should successfully reset arrays of inputs', async () => {
		const wrapper = mount(array(ref(undefined)));
		await nextTick();

		await expectValidation(wrapper, false, true);
	});

	it('should successfully watch an error ref and invalidate single inputs', async () => {
		const error = ref('');
		const wrapper = mount(single(error));
		await nextTick();

		const formfield = wrapper.vm.formfield as UseFormFieldReturn;
		expect(formfield.classes).toContain('bg-yellow');

		error.value = 'External error';
		await nextTick();
		expect(formfield.classes).toContain('bg-red');
		expect(wrapper.text()).toContain('External error');
	});

	it('should successfully watch an error ref and invalidate arrays of inputs', async () => {
		const error = ref('');
		const wrapper = mount(array(error));
		await nextTick();

		const formfield = wrapper.vm.formfield as UseFormFieldReturn;
		expect(formfield.classes).toContain('bg-yellow');

		error.value = 'External error';
		await nextTick();
		expect(formfield.classes).toContain('bg-red');
		expect(wrapper.text()).toContain('External error');
	});

	it('should throw an error if an attempt is made to useFormfield without an <input> tag', async () => {
		expect(() => {
			mount({
				template: '<div><span>Component with no input.</span></div>',
				setup() {
					const element = useTemplateRef<HTMLElement | null>('element');
					const formfield = useFormfield(element, undefined, ref(undefined));
					return { formfield };
				},
			});
		}).toThrow();
	});
});
