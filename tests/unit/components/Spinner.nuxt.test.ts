import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';

import Spinner from '@/components/Spinner.vue';

describe('Spinner', async () => {
	it('should mount successfully', async () => {
		const wrapper = await mountSuspended(Spinner);

		const parent = wrapper.find('div.flex');
		expect(parent).not.toBeNull();
		// Wouldn't normally test layout but, without these basics,
		// it wouldn't really be that functional
		expect(parent.classes('absolute')).toBeTruthy();
		expect(parent.classes('top-0')).toBeTruthy();
		expect(parent.classes('left-0')).toBeTruthy();
		expect(parent.classes('w-full')).toBeTruthy();
		expect(parent.classes('h-full')).toBeTruthy();
		expect(parent.classes('bg-black')).toBeTruthy();
		expect(parent.classes('opacity-50')).toBeTruthy();
		const child = wrapper.find('div.animate-spin');
		expect(child).not.toBeNull();
	});
});
