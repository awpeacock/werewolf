import { useEnvironment } from '@/composables/useEnvironment';

export const useLogger = () => {
	const log =
		!useEnvironment().isTest() &&
		(!useEnvironment().isClient() || !useEnvironment().isProduction());

	const success = (msg: string) => {
		if (log) {
			console.log('\x1b[1m\x1b[32m\u2713\x1b[0m ' + msg);
		}
	};
	const error = (msg: string, err?: Error) => {
		if (log) {
			if (err) {
				console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg + ' - ' + err.message);
			} else {
				console.error('\x1b[1m\x1b[31m\u2718\x1b[0m ' + msg);
			}
		}
	};
	const info = (msg: string) => {
		if (log) {
			console.info('\x1b[1m\x1b[34m\u2139\x1b[0m ' + msg);
		}
	};
	const warn = (msg: string) => {
		if (log) {
			console.warn('\x1b[1m\x1b[31m!\x1b[0m ' + msg);
		}
	};

	return {
		success,
		error,
		info,
		warn,
	};
};
