export const useLogger = () => {
	const success = (msg: string) => {
		console.log('\x1b[1m\x1b[32m\u2713\x1b[0m ' + msg);
	};
	const error = (msg: string, err?: Error) => {
		if (err) {
			console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg + ' - ' + err.message);
		} else {
			console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg);
		}
	};
	const info = (msg: string) => {
		console.log('\x1b[1m\x1b[34m\u2139\x1b[0m ' + msg);
	};
	const warn = (msg: string) => {
		console.warn('\x1b[1m\x1b[31m!\x1b[0m ' + msg);
	};

	return {
		success,
		error,
		info,
		warn,
	};
};
