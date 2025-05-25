import { describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { useBroadcast } from '@/server/util/useBroadcast';

const mockPusher = vi.fn();
const mockWebSocket = vi.fn();

const mockProvider = vi.fn().mockReturnValue(undefined);
mockNuxtImport('useRuntimeConfig', () => {
	return () => {
		return {
			public: {
				BROADCAST_PROVIDER: mockProvider(),
			},
		};
	};
});
vi.mock('@/server/util/usePusherBroadcast', () => ({
	usePusherBroadcast: vi.fn(() => mockPusher),
}));

vi.mock('@/server/util/useWebSocketBroadcast', () => ({
	useWebSocketBroadcast: vi.fn(() => mockWebSocket),
}));

describe('useBroadcast', async () => {
	it('should automatically default to websocket', async () => {
		const client = useBroadcast();
		expect(client).toBe(mockWebSocket);
	});

	it('should correctly return a Pusher instance if determined in env vars', async () => {
		mockProvider.mockReturnValue('pusher');
		const client = useBroadcast();
		expect(client).toBe(mockPusher);
	});

	it('should correctly return a WebSocket instance if determined in env vars', async () => {
		mockProvider.mockReturnValue('websocket');
		const client = useBroadcast();
		expect(client).toBe(mockWebSocket);
	});

	it('should correctly throw an error if an invalid option provided in env vars', async () => {
		mockProvider.mockReturnValue('invalid');
		expect(() => {
			useBroadcast();
		}).toThrowError('Invalid Broadcast Option');
	});
});
