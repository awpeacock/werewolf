import type { H3Event, EventHandlerRequest } from 'h3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDynamoMock } from '@tests/integration/setup/dynamodb';

export const useDynamoDB = (event: H3Event<EventHandlerRequest>) => {
	const isIntegration = process.env.IS_INTEGRATION === 'true';
	/* istanbul ignore else @preserve */
	if (!isIntegration) {
		const dynamo = event.context.dynamo;
		if (!dynamo) {
			throw new Error(
				'Unable to access DynamoDB - this should only ever be called on the server'
			);
		}
		return dynamo;
	} else {
		return getDynamoMock();
	}
};

export const createDynamoDBWrapper = (config: Record<string, string>): DynamoDBWrapper => {
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
			const put = new PutCommand({
				TableName: config.AWS_DYNAMODB_TABLE,
				Item: {
					Id: game.id,
					Created: new Date().toISOString(),
					Active: false,
					Players: game.players,
					Version: 1,
				},
				ConditionExpression: 'attribute_not_exists(Id)',
			});
			await docClient.send(put);
		},
		// Update a game on the database
		update: async (game: Game): Promise<void> => {
			// try {
			let expression = 'SET Players = :players, Active = :active';
			const values: {
				[key: string]:
					| Undefinable<Array<Player>>
					| boolean
					| string
					| Array<Activity>
					| number;
			} = {
				':players': game.players,
				':active': game.active,
			};
			if (game.pending) {
				expression += ', Pending = :pending';
				values[':pending'] = game.pending;
			}
			if (game.started) {
				expression += ', Started = :started';
				values[':started'] = (game.started as Date).toISOString();
			}
			if (game.finished) {
				expression += ', Finished = :finished';
				values[':finished'] = (game.finished as Date).toISOString();
			}
			if (game.stage) {
				expression += ', Stage = :stage';
				values[':stage'] = game.stage;
			}
			if (game.activities) {
				expression += ', Activities = :activities';
				values[':activities'] = game.activities;
			}
			if (game.version === undefined) {
				throw new Error('Cannot update a game without a version');
			}
			expression += ', Version = :next';
			values[':next'] = game.version! + 1;
			values[':current'] = game.version!;
			const update = new UpdateCommand({
				TableName: config.AWS_DYNAMODB_TABLE,
				Key: {
					Id: game.id,
				},
				UpdateExpression: expression,
				ExpressionAttributeValues: values,
				ConditionExpression: 'Version = :current',
				ReturnValues: 'ALL_NEW',
			});
			await docClient.send(update);
		},
		// Retrieve a game from the database
		get: async (id: string): Promise<Nullable<Game>> => {
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
					version: response.Item.Version,
				};
				if (response.Item.Started) {
					game.started = new Date(response.Item.Started);
				}
				if (response.Item.Finished) {
					game.finished = new Date(response.Item.Finished);
				}
				if (response.Item.Stage) {
					game.stage = response.Item.Stage;
				}
				if (response.Item.Activities) {
					game.activities = response.Item.Activities;
				}
				return game;
			}
			return null;
		},
	};
	return dynamo;
};
