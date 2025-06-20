import 'vitest';

declare module 'vitest' {
	interface Assertion {
		toEqualGame(expected: Game): void;
		toHavePending(names?: Array<Player>): void;
		toHavePlayers(names: Array<Player>): void;
		toHaveActivity(activity: Activity): void;
		toHaveError(message?: string): void;
	}

	interface AsymmetricMatchersContaining {
		toEqualGame(expected: Game): void;
		toHavePending(names?: Array<Player>): void;
		toHavePlayers(names: Array<Player>): void;
		toHaveActivity(activity: Activity): void;
		toHaveError(message?: string): void;
	}
}
