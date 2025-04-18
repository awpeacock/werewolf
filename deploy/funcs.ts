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

export const parseArguments = (args: Array<string>): { [key: string]: string } => {
	const params: { [key: string]: string } = {};
	args.forEach((arg) => {
		let match: Nullable<RegExpMatchArray> = arg.match(/^([a-z]+):([a-z]+)$/);
		if (match !== null && match !== undefined && match.length > 2) {
			const key: string = match[1] as string;
			const value: string = match[2] as string;
			params[key] = value;
		} else {
			match = arg.match(/^-{0,1}([a-z]+)=([a-z]+)$/);
			if (match !== null && match !== undefined && match.length > 2) {
				const key: string = match[1] as string;
				const value: string = match[2] as string;
				params[key] = value;
			}
		}
	});
	return params;
};
