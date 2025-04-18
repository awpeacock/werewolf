import { vi } from 'vitest';

export const mockSessionStorage = vi.fn(() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => {
			return store[key] || null;
		}),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			const copy: Record<string, string> = {};
			for (const k in store) {
				if (k !== key) {
					copy[k] = store[k];
				}
			}
			store = copy;
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();
Object.defineProperty(window, 'sessionStorage', {
	value: mockSessionStorage,
});
