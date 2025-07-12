import { spawn } from 'child_process';
import waitOn from 'wait-on';
import open from 'open';
import path from 'path';
import fs from 'fs';

import { info, log, success, warn, init } from './funcs';

const { action, filename } = init('startup');

let command: string;
const args: Array<string> = [];

const directory = path.join(process.cwd(), 'node_modules', '.bin');
if (process.platform === 'win32') {
	const executable = path.join(directory, 'nuxt.cmd');

	if (fs.existsSync(executable)) {
		command = 'cmd.exe';
		args.push('/c', executable);
	} else {
		warn(
			'Nuxt executable not found in node_modules/.bin. Attempting to use "nuxt" from system PATH.'
		);
		command = 'nuxt';
	}
} else {
	command = path.join(directory, 'nuxt');
	if (!fs.existsSync(command)) {
		warn(
			'Nuxt executable not found in node_modules/.bin. Attempting to use "nuxt" from system PATH.'
		);
		command = 'nuxt';
	}
}
if (action === 'build') {
	args.push('build');
} else {
	args.push('dev');
}
args.push('--dotenv', filename);

const nuxt = spawn(command, args, {
	stdio: 'pipe',
	shell: false,
});

nuxt.stdout?.on('data', (data) => {
	log(data.toString().trim());
});

nuxt.stderr?.on('data', (data) => {
	warn(data.toString().trim());
});

nuxt.on('exit', (code) => {
	info(`Nuxt process exited with code: ${code}`);
});

if (action === 'dev') {
	const options = {
		resources: ['http://localhost:3000'],
		timeout: 60000,
	};

	waitOn(options, (err) => {
		if (err) {
			warn(`Error waiting for server: ${err.message}`);
		} else {
			success('Nuxt server is ready, opening browser...');
			open('http://localhost:3000');
		}
	});
}
