import { vi } from 'vitest';

export const mockNavigate = vi.fn();

export const stubNuxtLink = defineComponent({
	name: 'NuxtLink',
	props: ['to'],
	template: `
	  <div
		data-test-link
		:data-to="to.path || to"
		:data-query="JSON.stringify(to.query || {})"
		v-bind="$attrs"
	  >
		<slot :navigate="navigate" />
	  </div>
	`,
	setup() {
		return {
			navigate: mockNavigate,
		};
	},
});

export const stubNuxtLinkWithMethod = (method: (_e: MouseEvent) => void) =>
	defineComponent({
		name: 'NuxtLinkWithMethod',
		props: ['to'],
		template: `
	  <div
		data-test-link
		@click="handleParentClick"
		:data-to="to.path"
		:data-query="JSON.stringify(to.query || {})"
		v-bind="$attrs"
	  >
		<slot :navigate="navigate" />
	  </div>
	`,
		setup() {
			return {
				handleParentClick: method,
				navigate: mockNavigate,
			};
		},
	});
