export const useEnvironment = () => {
	return {
		// Can't mock import.meta.client so we need a helper function to test
		// all scenarios when a client/server switch is used
		isClient: () => {
			return import.meta.client;
		},
	};
};
