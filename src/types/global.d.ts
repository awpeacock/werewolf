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

type GameEvent = JoinRequestEvent | AdmissionEvent | StartGameEvent | MorningEvent;

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

interface StartGameBody {
	auth: string;
}

interface StartGameEvent {
	type: 'start-game';
	game: Game;
	role: Role;
}

interface ActivityBody {
	role: Role.WOLF | Role.HEALER;
	player: string;
	target: string;
}

interface MorningEvent {
	type: 'morning';
	game: Game;
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
	stage?: 'day' | 'night';
	players: Array<Player>;
	pending?: Array<Player>;
	activities?: Array<Activity>;
}

interface Player {
	id: string;
	nickname: string;
	roles: Array<Role>;
}

interface Activity {
	wolf?: Nullable<string>;
	healer?: Nullable<string>;
	votes?: Array<Vote>;
}

interface Vote {
	[player: string]: string;
}
