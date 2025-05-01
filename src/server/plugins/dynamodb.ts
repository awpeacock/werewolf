import type { H3Event, EventHandlerRequest } from 'h3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

export default defineNitroPlugin((nitro) => {
	const config = useRuntimeConfig();

	const client = new DynamoDBClient({
		region: config.AWS_REGION,
		credentials: {
			accessKeyId: config.AWS_ACCESS_KEY_ID,
			secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
		},
	});
	const docClient = DynamoDBDocumentClient.from(client);

	const dynamo: DynamoDBWrapper = {
		// Store a newly created game to the database
		put: async (game: Game): Promise<void> => {
			try {
				const put = new PutCommand({
					TableName: config.AWS_DYNAMODB_TABLE,
					Item: {
						Id: game.id,
						Created: new Date().toISOString(),
						Active: false,
						Players: game.players,
					},
					ConditionExpression: 'attribute_not_exists(Id)',
				});
				await docClient.send(put);
			} catch (e) {
				console.error(`Unable to save game: ${(e as Error).message}`);
				throw e;
			}
		},
		// Update a game on the database
		update: async (game: Game): Promise<void> => {
			try {
				const update = new UpdateCommand({
					TableName: config.AWS_DYNAMODB_TABLE,
					Key: {
						Id: game.id,
					},
					UpdateExpression: 'SET Players = :players, Pending = :pending',
					ExpressionAttributeValues: {
						':players': game.players,
						':pending': game.pending,
					},
					ReturnValues: 'ALL_NEW',
				});
				await docClient.send(update);
			} catch (e) {
				console.error(`Unable to update game: ${(e as Error).message}`);
				throw e;
			}
		},
		// Retrieve a game from the database
		get: async (id: string): Promise<Nullable<Game>> => {
			try {
				const get = new GetCommand({
					TableName: config.AWS_DYNAMODB_TABLE,
					Key: {
						Id: id,
					},
					ConsistentRead: true,
				});
				const response = await docClient.send(get);
				if (response.Item != null) {
					const game: Game = {
						id: response.Item.Id,
						created: new Date(response.Item.Created),
						active: response.Item.Active,
						players: response.Item.Players,
						pending: response.Item.Pending,
					};
					return game;
				}
				return null;
			} catch (e) {
				console.error(`Unable to retrieve game: ${(e as Error).message}`);
				throw e;
			}
		},
	};

	// Inject the client into the context for server-side access
	nitro.hooks.hook('request', (event: H3Event<EventHandlerRequest>) => {
		event.context.dynamo = dynamo;
	});

	console.log('\x1b[1m\x1b[32m\u2713\x1b[0m DynamoDB Client initialised');
});
