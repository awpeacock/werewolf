import { log, fail, init, findCommandPath, execute } from './funcs';

const { stack, region, table } = init('setup');

log(`Deploying stack "${stack}" in region "${region}"...`);
try {
	const command = findCommandPath('aws');
	const args = [
		'cloudformation',
		'deploy',
		'--template-file',
		'deploy/dynamodb.yaml',
		'--stack-name',
		stack,
		'--capabilities',
		'CAPABILITY_IAM',
		'--region',
		region,
		'--parameter-overrides',
		`TableName=${table}`,
	];

	execute(command, args);
} catch (err) {
	fail('AWS deploy command failed', err as Error);
}
