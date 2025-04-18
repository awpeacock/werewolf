import { vi } from 'vitest';

export const mockNavigate = vi.fn();
export const stubNuxtLink = {
	props: ['to'],
	template: `<div data-test-link :data-to="to.path"><slot :navigate="navigate" /></div>`,
	setup() {
		return { navigate: mockNavigate };
	},
};
