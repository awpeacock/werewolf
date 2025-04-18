declare type Nullable<T> = T | null;

interface DynamoDBWrapper {
	put: (game: Game) => Promise<void>;
	get: (id: string) => Promise<Nullable<Game>>;
}

interface APIError {
	field?: string;
	message: string;
}

interface APIErrorResponse {
	errors: Array<APIError>;
}

interface Game {
	id: string;
	created: Date | string;
	started?: Date | string;
	finished?: Date | string;
	active: boolean;
	players: Array<Player>;
}

interface Player {
	id: string;
	nickname: string;
	role: Role;
}
