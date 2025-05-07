import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { expect, vi } from 'vitest';

export class MockWebSocket implements WebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	readonly CONNECTING = MockWebSocket.CONNECTING;
	readonly OPEN = MockWebSocket.OPEN;
	readonly CLOSING = MockWebSocket.CLOSING;
	readonly CLOSED = MockWebSocket.CLOSED;

	static instances: MockWebSocket[] = [];

	url: string;
	readyState: number = WebSocket.OPEN;

	onopen: ((_ev: Event) => void) | null = null;
	onclose: ((_ev: CloseEvent) => void) | null = null;

	onmessage: ((_ev: MessageEvent) => void) | null = null;
	onerror: ((_ev: Event) => void) | null = null;

	sentMessages: string[] = [];

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
		setTimeout(() => {
			this.onopen?.(new Event('open'));
		});
	}

	send(data: string): void {
		this.sentMessages.push(data);
	}

	close(code?: number, reason?: string): void {
		this.readyState = WebSocket.CLOSED;
		this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
	}

	// Not implemented but required by interface
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	dispatchEvent = vi.fn().mockReturnValue(true);
	binaryType: 'blob' | 'arraybuffer' = 'blob';
	extensions = '';
	protocol = '';
	bufferedAmount = 0;
}

vi.stubGlobal('WebSocket', MockWebSocket);

export const mockWSConnect = vi.fn();
export const mockWSDisconnect = vi.fn();
export const mockWSLatest: Ref<Nullable<GameEvent>> = ref(null);
export const mockWSRemove = vi.fn();

mockNuxtImport('useWebSocketClient', async () => {
	const actual = await vi.importActual<typeof import('@/composables/useWebSocketClient')>(
		'@/composables/useWebSocketClient'
	);
	return () => {
		if (expect.getState().testPath?.includes('useWebSocketClient')) {
			return actual.useWebSocketClient();
		} else if (expect.getState().testPath?.includes('rehydrate.client')) {
			return {
				connect: mockWSConnect,
				disconnect: mockWSDisconnect,
				remove: mockWSRemove,
				reset: vi.fn(),
				events: [],
				latest: vi.fn(),
				requests: [],
			};
		} else {
			return {
				connect: mockWSConnect,
				disconnect: mockWSDisconnect,
				remove: mockWSRemove,
				reset: vi.fn(),
				events: [],
				latest: mockWSLatest,
				requests: [],
			};
		}
	};
});

export const mockWSOpen = vi.fn();
export const mockWSSend = vi.fn();

vi.mock('@/server/util/useWebSocketBroadcast', () => {
	return {
		useWebSocketBroadcast: vi.fn(() => ({
			open: mockWSOpen,
			send: mockWSSend,
		})),
	};
});
