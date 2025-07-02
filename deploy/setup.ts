import dotenv from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

import { heading, info, log, success, fail, parseArguments } from './funcs';

const params = parseArguments(process.argv);
const action = params['run'] ?? 'build';
const env =
	params['env'] ?? (action === 'build' || action === 'preview' ? 'production' : undefined);
const setup = params['setup'] ? params['setup'] === 'yes' : true;

if (!setup) {
	process.exit(0);
}

heading('Setting up ' + (env ? env.toUpperCase() : 'default') + ' environment');

const filename = env ? `.env.${env}` : '.env';
if (!existsSync(filename)) {
	fail(`Environment file not found: ${filename}`);
}

const result = dotenv.config({ path: resolve(process.cwd(), filename) });
if (result.error) {
	fail(`Failed to load ${filename}: ${result.error}`);
}

const stack = process.env.AWS_STACK;
const region = process.env.AWS_REGION;
const id = process.env.AWS_ACCESS_KEY_ID;
const secret = process.env.AWS_SECRET_ACCESS_KEY;
const table = process.env.AWS_DYNAMODB_TABLE;
info(`Stack Name: ${stack}`);
info(`Region: ${region}`);
// info(`Access Key ID: ${id}`);
// info(`Secret Access Key: ${secret}`);
info(`Table Name: ${table}`);

if (!stack || !region || !id || !secret || !table) {
	fail(
		'AWS_STACK, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_DYNAMODB_TABLE must be defined in your environment file.'
	);
}

log(`Deploying stack "${stack}" in region "${region}"...`);
try {
	execSync(
		`aws cloudformation deploy --template-file deploy/dynamodb.yaml --stack-name ${stack} --capabilities CAPABILITY_IAM --region ${region} --parameter-overrides TableName=${table}`,
		{
			stdio: 'inherit',
		}
	);
	success('Deploy command successfully sent.');
} catch (err) {
	fail('AWS deploy command failed', err as Error);
}
