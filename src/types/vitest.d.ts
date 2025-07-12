import 'vitest';

declare module 'vitest' {
	interface Assertion {
		toEqualGame(expected: Game): void;
		toHavePending(names?: Array<Player>): void;
		toHavePlayers(names: Array<Player>): void;
		toHaveActivity(activity: Activity): void;
		toHaveChoices(activity: Activity): void;
		toHaveVotes(activity: Activity): void;
		toHaveEvicted(name: Undefinable<Nullable<string>>): void;
		toHaveError(message?: string): void;
		toBeSocketCall(type: string, game: Game): void;
	}

	interface AsymmetricMatchersContaining {
		toEqualGame(expected: Game): void;
		toHavePending(names?: Array<Player>): void;
		toHavePlayers(names: Array<Player>): void;
		toHaveActivity(activity: Activity): void;
		toHaveChoices(activity: Activity): void;
		toHaveVotes(activity: Activity): void;
		toHaveEvicted(name: Undefinable<Nullable<string>>): void;
		toHaveError(message?: string): void;
		toBeSocketCall(type: string, game: Game): void;
	}
}
