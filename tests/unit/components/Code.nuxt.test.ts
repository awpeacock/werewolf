import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Code from '@/components/Code.vue';

describe('Code', async () => {
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
		for (let c = 0; c < code.length; c++) {
			expect(spans[c]!.element.textContent).toEqual(code[c]);
		}
		wrapper.unmount();
	});

	it('should mount successfully as an array of inputs', async () => {
		const code = 'A1B2';
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: '    ',
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < code.length; c++) {
			expect(inputs[c]!.element.disabled).not.toBeTruthy();
			inputs[c]!.setValue(code[c]);
			await inputs[c]!.trigger('keyup');
			await nextTick();
			if (c < 3) {
				expect(inputs[c + 1]!.element).toBe(document.activeElement);
			}
			const emitted: Array<Array<string>> = wrapper.emitted('update') as Array<Array<string>>;
			expect(emitted).not.toBeNull();
			const entered = emitted!.at(emitted!.length - 1)?.at(0) as string;
			expect(entered!.length).toBe(4);
			expect(entered!.trim()).toEqual(code.substring(0, c + 1));
		}
		wrapper.unmount();
	});

	it('should not move the focus on if an input field does not have a character in it', async () => {
		const wrapper = await mountSuspended(Code, {
			props: {
				chars: '    ',
				editable: true,
			},
			attachTo: document.body,
		});

		const inputs = wrapper.findAll('input');
		expect(inputs).not.toBeNull();
		expect(inputs.length).toBe(4);
		for (let c = 0; c < 4; c++) {
			inputs[c]!.element.focus();
			expect(inputs[c]!.element.disabled).not.toBeTruthy();
			// It is impossible for any field to have more than one character in as we
			// have the maxlength attribute and browsers will block that - but
			// you can trigger "keyup" with an empty field if you press delete, so
			// check that it doesn't move the focus on
			inputs[c]!.setValue('');
			await inputs[c]!.trigger('keyup');
			await nextTick();
			inputs[c]!.html();

			expect(inputs[c]!.element).toBe(document.activeElement);
			const emitted: Array<Array<string>> = wrapper.emitted('update') as Array<Array<string>>;
			expect(emitted).toBeUndefined();
		}
		wrapper.unmount();
	});
});
