// Sometimes nextTick, flushPromises, etc. aren't sufficient to allow
// processing to continue, and the OOB Nuxt testing tools don't include waitFor
export async function waitFor(callback: () => boolean | Promise<boolean>): Promise<void> {
	const timeout = 1000;
	const interval = 50;
	const start = Date.now();

	return new Promise<void>((resolve, reject) => {
		const check = async () => {
			try {
				const result = await callback();
				if (result) {
					return resolve();
				}
				if (Date.now() - start >= timeout) {
					return reject(new Error('Timed out waiting for criteria to be met'));
				}
				setTimeout(check, interval);
			} catch (e: unknown) {
				if (Date.now() - start >= timeout) {
					return reject(
						new Error(
							`Timed out waiting for criteria to be met: ${(e as Error).message}`
						)
					);
				}
				setTimeout(check, interval);
			}
		};
		check();
	});
}
