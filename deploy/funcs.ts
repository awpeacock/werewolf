import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

type Command = 'setup' | 'startup' | 'destroy';
interface Parameters {
	action: string;
	filename: string;
	stack: string;
	region: string;
	table: string;
}

export const init = (command: Command): Parameters => {
	const params = parse(process.argv);
	const [env, action] = extract(command, params);

	title(env, command, action);

	const filename = read(env);

	const stack = process.env.AWS_STACK;
	const region = process.env.AWS_REGION;
	const id = process.env.AWS_ACCESS_KEY_ID;
	const secret = process.env.AWS_SECRET_ACCESS_KEY;
	const table = process.env.AWS_DYNAMODB_TABLE;
	info(`Stack Name: ${stack}`);
	info(`Region: ${region}`);
	info(`Table Name: ${table}`);

	if (!stack || !region || !id || !secret || !table) {
		fail(
			'AWS_STACK, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_DYNAMODB_TABLE must be defined in your environment file.'
		);
	}

	return {
		action: action,
		filename: filename,
		stack: stack!,
		region: region!,
		table: table!,
	};
};

export const parse = (args: Array<string>): { [key: string]: string } => {
	const params: { [key: string]: string } = {};
	args.forEach((arg) => {
		let match: Nullable<RegExpMatchArray> = arg.match(/^([a-z]+):([a-z]+)$/);
		if (match !== null && match !== undefined && match.length > 2) {
			const key: string = match[1];
			const value: string = match[2];
			params[key] = value;
		} else {
			match = arg.match(/^-?([a-z]+)=([a-z]+)$/);
			if (match !== null && match !== undefined && match.length > 2) {
				const key: string = match[1];
				const value: string = match[2];
				params[key] = value;
			}
		}
	});
	return params;
};

export const extract = (
	command: string,
	params: Record<string, string>
): [Undefinable<string>, string] => {
	const action = params['run'] ?? 'build';
	let env: Undefinable<string> = params['env'];
	if (!env && (command === 'setup' || command === 'startup')) {
		env = action === 'build' || action === 'preview' ? 'production' : undefined;
	}
	const build = params['build'] ? params['build'] === 'yes' : true;
	const setup = params['setup'] ? params['setup'] === 'yes' : true;
	if (command === 'setup' && !setup) {
		process.exit(0);
	}
	if (action === 'build' && !build) {
		process.exit(0);
	}
	return [env, action];
};

export const read = (env?: string) => {
	const filename = env ? `.env.${env}` : '.env';
	if (!existsSync(filename)) {
		fail(`Environment file not found: ${filename}`);
	}

	const result = dotenv.config({ path: path.resolve(process.cwd(), filename) });
	if (result.error) {
		fail(`Failed to load ${filename}: ${result.error}`);
	}

	return filename;
};

export const findCommandPath = (command: string): string => {
	const envPath = process.env.PATH || '';
	const pathParts = envPath.split(path.delimiter);

	for (const part of pathParts) {
		const fullPath = path.join(part, command);
		if (process.platform === 'win32') {
			if (existsSync(fullPath + '.exe')) return fullPath + '.exe';
			if (existsSync(fullPath + '.cmd')) return fullPath + '.cmd';
			if (existsSync(fullPath + '.bat')) return fullPath + '.bat';
		}
		if (existsSync(fullPath)) return fullPath;
	}
	return command;
};

export const execute = (command: string, args: Array<string>) => {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: false,
	});

	if (result.error) {
		fail('AWS command failed to start', result.error);
	} else if (result.status !== 0) {
		fail(
			`AWS command exited with status ${result.status}`,
			new Error(result.stderr ? result.stderr.toString() : '')
		);
	} else {
		success('AWS command successfully sent.');
	}
};

export const title = (env: Undefinable<string>, command: string, action: string) => {
	switch (command) {
		case 'setup': {
			heading('Setting up ' + (env ? env.toUpperCase() : 'default') + ' environment');
			break;
		}
		case 'startup': {
			heading(
				(action === 'build' ? 'Building' : 'Starting') +
					' Nuxt server for ' +
					(env ? env.toUpperCase() : 'default') +
					' environment'
			);
			break;
		}
		case 'destroy': {
			heading('Tearing down ' + (env ? env.toUpperCase() : 'default') + ' environment');
			break;
		}
	}
};

export const heading = (msg: string) => {
	console.log('\x1b[1m' + msg + '\x1b[0m');
};
export const info = (msg: string) => {
	console.log('\x1b[1m\x1b[34m\u2139\x1b[0m ' + msg);
};
export const log = (msg: string) => {
	console.log(msg);
};
export const success = (msg: string) => {
	console.log('\x1b[1m\x1b[32m\u2713\x1b[0m ' + msg);
};
export const warn = (msg: string) => {
	console.error('\x1b[31m' + msg + '\x1b[0m');
};
export const fail = (msg: string, err?: Error) => {
	if (err) {
		console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg + ' - ' + err.message);
	} else {
		console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg);
	}
	process.exit(0);
};
