declare type Nullable<T> = T | null;

declare type Undefinable<T> = T | undefined;

interface DynamoDBWrapper {
	put: (game: Game) => Promise<void>;
	update: (game: Game) => Promise<void>;
	get: (id: string) => Promise<Nullable<Game>>;
}

interface WebSocketServer {
	clients: Map<string, Map<string, WebSocket>>;
	send: (target: { code: string; player?: string }, event: GameEvent) => Promise<void>;
}

interface WebSocketClient {
	send: (message: string) => void;
	close: (code?: number, reason?: string) => void;
}

type GameEvent = JoinRequestEvent | AdmissionEvent;

interface JoinRequestBody {
	villager: string;
}

interface JoinRequestEvent {
	type: 'join-request';
	game: Game;
	player: Player;
}

interface AdmissionBody {
	auth: string;
	villager: string;
	admit: boolean;
}

interface AdmissionEvent {
	type: 'admission';
	game: Game;
	response: boolean;
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
