import * as test from '@nuxt/test-utils/e2e';
import path from 'path';

await test.setup({
	rootDir: path.resolve(__dirname, '../../..'),
	server: true,
	dev: false,
});

await import('./get');
await import('./post');
await import('./put.admit');
await import('./put.day');
await import('./put.join');
await import('./put.night');
await import('./put.start');
