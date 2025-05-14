import { expect, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { stubGameInactive } from '@tests/unit/setup/stubs';

export const mockGame = {
	getLatest: vi.fn().mockReturnValue(stubGameInactive),
};

mockNuxtImport('useGame', async () => {
	const actual =
		await vi.importActual<typeof import('@/composables/useGame')>('@/composables/useGame');
	return (game: Game) => {
		if (!expect.getState().testPath?.includes('pages/play.')) {
			return actual.useGame(game);
		} else {
			return {
				...actual.useGame(game),
				getLatest: mockGame.getLatest,
			};
		}
	};
});
