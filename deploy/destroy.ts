import { log, fail, init, findCommandPath, execute } from './funcs';

const { stack, region } = init('destroy');

log(`Deleting stack "${stack}" in region "${region}"...`);
try {
	const command = findCommandPath('aws');
	const args = ['cloudformation', 'delete-stack', '--stack-name', stack, '--region', region];

	execute(command, args);
} catch (err) {
	fail('An unexpected error occurred during stack deletion', err as Error);
}
