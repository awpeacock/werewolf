declare type Nullable<T> = T | null;

declare type Undefinable<T> = T | undefined;

interface DynamoDBWrapper {
	put: (game: Game) => Promise<void>;
	update: (game: Game) => Promise<void>;
	get: (id: string) => Promise<Nullable<Game>>;
}

interface FooterMeta {
	src: string;
	alt: string;
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
	pending?: Array<Player>;
}

interface Player {
	id: string;
	nickname: string;
	role: Role;
}
