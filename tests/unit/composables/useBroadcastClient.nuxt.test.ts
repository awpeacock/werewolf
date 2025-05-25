import { describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

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
mockNuxtImport('usePusherClient', () => {
	return () => {
		return mockPusher;
	};
});
mockNuxtImport('useWebSocketClient', () => {
	return () => {
		return mockWebSocket;
	};
});

describe('useBroadcastClient', async () => {
	it('should automatically default to websocket', async () => {
		const client = useBroadcastClient();
		expect(client).toBe(mockWebSocket);
	});

	it('should correctly return a Pusher client if determined in env vars', async () => {
		mockProvider.mockReturnValue('pusher');
		const client = useBroadcastClient();
		expect(client).toBe(mockPusher);
	});

	it('should correctly return a WebSocket client if determined in env vars', async () => {
		mockProvider.mockReturnValue('websocket');
		const client = useBroadcastClient();
		expect(client).toBe(mockWebSocket);
	});

	it('should correctly throw an error if an invalid option provided in env vars', async () => {
		mockProvider.mockReturnValue('invalid');
		expect(() => {
			useBroadcastClient();
		}).toThrowError('Invalid Broadcast Client Option');
	});
});
