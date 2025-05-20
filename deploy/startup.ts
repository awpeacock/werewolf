import { exec } from 'child_process';
import { existsSync } from 'fs';
import waitOn from 'wait-on';
import open from 'open';

import { heading, info, log, success, warn, fail, parseArguments } from './funcs';

const params = parseArguments(process.argv);
const action = params['run'] ?? 'build';
const build = params['build'] ? params['build'] === 'yes' : true;
const env =
	params['env'] ?? (action === 'build' || action === 'preview' ? 'production' : undefined);

if (action === 'build' && !build) {
	process.exit(0);
}

heading(
	(action === 'build' ? 'Building' : 'Starting') +
		' Nuxt server for ' +
		(env ? env.toUpperCase() : 'default') +
		' environment'
);

const filename = env ? `.env.${env}` : '.env';
if (!existsSync(filename)) {
	fail(`Environment file not found: ${filename}`);
}

const script = (action === 'build' ? 'nuxt build' : 'nuxt dev') + ` --dotenv ${filename}`;
const nuxt = exec(script, (error, stdout, stderr) => {
	if (error) {
		fail(`Error starting Nuxt: ${error.message}`);
	}
	if (stderr) {
		warn('\x1b[31m\u2718 ' + stderr + '\x1b[0m');
	}
	log('\x1b[32m\u2713 ' + stdout + '\x1b[0m');
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
