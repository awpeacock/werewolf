import dotenv from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

import { heading, info, log, success, fail, parseArguments } from './funcs';

const params = parseArguments(process.argv);
const env = params['env'];

heading('Tearing down ' + (env ? env.toUpperCase() : 'default') + ' environment');

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
info(`Stack Name: ${stack}`);
info(`Region: ${region}`);

if (!stack || !region) {
	fail('AWS_STACK and AWS_REGION must be defined in your environment file.');
}

log(`Deleting stack "${stack}" in region "${region}"...`);
try {
	execSync(`aws cloudformation delete-stack --stack-name ${stack} --region ${region}`, {
		stdio: 'inherit',
	});
	success('Delete command successfully sent.');
} catch (err) {
	fail('AWS delete-stack command failed', err as Error);
}
