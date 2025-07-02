import type { Page, WebSocket } from '@playwright/test';

export interface WebSocketListener {
	receive: () => Promise<GameEvent>;
	dispose: () => void;
}

interface WebSocketFrame {
	opcode?: number;
	payload: string | Buffer;
}

export const wsListener = (page: Page, type: string) => {
	let resolveEvent: (_msg: GameEvent) => void;
	const message: Promise<GameEvent> = new Promise((resolve) => {
		resolveEvent = resolve;
	});

	const socketHandler = (socket: WebSocket) => {
		const frameHandler = (frame: WebSocketFrame) => {
			const payload =
				typeof frame.payload === 'string' ? frame.payload : frame.payload.toString();

			try {
				const outer = JSON.parse(payload);
				if (outer.event === 'game-event') {
					const inner: GameEvent = JSON.parse(outer.data);
					if (inner.type === type) {
						resolveEvent(inner);
					}
				}
			} catch (e) {
				console.warn('Invalid JSON received:', e);
			}
		};
		socket.on('framereceived', frameHandler);
		socket.once('close', () => {
			socket.off('framereceived', frameHandler);
		});
	};

	page.on('websocket', socketHandler);

	return {
		receive: () => message,
		dispose: () => page.off('websocket', socketHandler),
	};
};
