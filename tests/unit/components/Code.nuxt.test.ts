import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';

import Code from '@/components/Code.vue';

describe('Code', async () => {
	const mockKeyPress = async (
		input: HTMLInputElement,
		wrapper: VueWrapper,
		key: string
	): Promise<boolean> => {
		let defaultPrevented = false;

		const keydown = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperty(keydown, 'defaultPrevented', {
			get: () => defaultPrevented,
		});
		keydown.preventDefault = () => {
			defaultPrevented = true;
		};
		input.dispatchEvent(keydown);

		if (!defaultPrevented) {
			input.value = key;
			const inputEvent = new Event('input', { bubbles: true });
			input.dispatchEvent(inputEvent);
		}

		const keyup = new KeyboardEvent('keyup', {
			key,
			bubbles: true,
		});
		input.dispatchEvent(keyup);

		await nextTick();
		wrapper.vm.$forceUpdate();

		return !defaultPrevented;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should mount successfully as a display only', async () => {
		const code = 'A1B2';
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: code,
			},
		});

		expect(wrapper.text()).toEqual(code);

		const spans = wrapper.findAll('span');
		expect(spans).not.toBeNull();
		expect(spans.length).toBe(4);
		for (let c = 0; c < spans.length; c++) {
			expect(spans[c]!.element.textContent).toEqual(code[c]);
		}
		wrapper.unmount();
	});

	it('should mount successfully as an array of inputs', async () => {
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < inputs.length; c++) {
			expect(inputs[c]!.element.disabled).toBeFalsy();
			expect(inputs[c]!.element.value).toEqual('');
		}
		wrapper.unmount();
	});

	it('should move to the next input successfully on input of a valid character', async () => {
		const code = 'A1B2';
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < inputs.length; c++) {
			const accepted = await mockKeyPress(inputs[c].element, wrapper, code[c]);
			expect(accepted).toBeTruthy();
			if (c < 3) {
				expect(inputs[c + 1]!.element).toBe(document.activeElement);
			}
			const emitted: Array<Array<string>> = wrapper.emitted('update') as Array<Array<string>>;
			expect(emitted).not.toBeNull();
			const entered = emitted.at(-1)?.at(0) as string;
			expect(entered!.length).toBe(c + 1);
			expect(entered!.trim()).toEqual(code.substring(0, c + 1));
		}
		wrapper.unmount();
	});

	it('should not allow invalid characters', async () => {
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		const input = inputs[0];
		const chars = [' ', '-', '<', '>', `'`, '{', '}', '%', '$', '.', ',', '_', '+', '='];
		for (let c = 0; c < chars.length; c++) {
			input!.element.focus();
			const accepted = await mockKeyPress(input.element, wrapper, chars[c]);

			expect(accepted).toBeFalsy();
			expect(input!.element).toBe(document.activeElement);
			expect(input!.element.value).toBe('');
			const emitted: Array<Array<string>> = wrapper.emitted('update') as Array<Array<string>>;
			expect(emitted).toBeUndefined();
		}
		wrapper.unmount();
	});

	it('should not move the focus on if an input field does not have a character in it', async () => {
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < 4; c++) {
			inputs[c]!.element.focus();
			expect(inputs[c]!.element.disabled).toBeFalsy();
			// It is impossible for any field to have more than one character in as we
			// have the maxlength attribute and browsers will block that - but
			// you can trigger "keyup" with an empty field if you press delete, so
			// check that it doesn't move the focus on
			inputs[c]!.setValue('');
			await inputs[c]!.trigger('keyup');
			await nextTick();

			expect(inputs[c]!.element).toBe(document.activeElement);
			const emitted: Array<Array<string>> = wrapper.emitted('update') as Array<Array<string>>;
			expect(emitted).toBeUndefined();
		}
		wrapper.unmount();
	});

	it('should successfully perform validation on a valid code', async () => {
		const code = 'A1B2';
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < 4; c++) {
			inputs[c]!.setValue(code[c]);
		}
		const result = wrapper.vm.validate();
		await nextTick();
		expect(result).toBeTruthy();
		expect(wrapper.find('div').exists()).toBeFalsy();
		wrapper.unmount();
	});

	it('should invalidate an incomplete code (and blank relevant inputs)', async () => {
		const code = 'A B2';
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: ['', '', '', ''],
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < 4; c++) {
			inputs[c]!.setValue(code[c]);
		}
		const result = wrapper.vm.validate();
		await nextTick();
		expect(result).toBeFalsy();
		for (let c = 0; c < 4; c++) {
			if (code[c] !== ' ') {
				expect(inputs[c].element.value).toBe(code[c]);
			} else {
				expect(inputs[c].element.value).toBe('');
			}
		}
		expect(wrapper.find('div').exists()).toBeTruthy();
		wrapper.unmount();
	});
});
