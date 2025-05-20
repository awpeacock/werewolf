/* istanbul ignore file @preserve */
export const useEnvironment = () => {
	return {
		// Can't mock import.meta.client so we need a helper function to test
		// all scenarios when a client/server switch is used
		isClient: () => {
			try {
				return typeof import.meta !== 'undefined' && import.meta.client;
			} catch {
				return false;
			}
		},
		// Same goes for detecting if in production or dev mode
		isProduction: () => {
			try {
				const dev =
					typeof import.meta !== 'undefined'
						? (import.meta.env?.DEV ?? import.meta.env?.dev)
						: undefined;
				return dev === false;
			} catch {
				return false;
			}
		},
	};
};
