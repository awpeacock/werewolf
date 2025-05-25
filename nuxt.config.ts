// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',
	devtools: {
		enabled: true,
	},
	modules: [
		'@nuxt/eslint',
		'@nuxt/test-utils/module',
		'@nuxtjs/i18n',
		'@pinia/nuxt',
		'pinia-plugin-persistedstate/nuxt',
	],
	typescript: {
		typeCheck: true,
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			fs: {
				strict: false,
			},
		},
		css: {
			devSourcemap: false,
		},
		build: {
			sourcemap: false,
		},
	},
	nitro: {
		experimental: {
			websocket: true,
		},
	},
	runtimeConfig: {
		AWS_REGION: process.env.AWS_REGION,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_DYNAMODB_TABLE: process.env.AWS_DYNAMODB_TABLE,
		CREATE_MAX_RETRIES: process.env.CREATE_MAX_RETRIES,
		PUSHER_APP_SECRET: process.env.PUSHER_APP_SECRET,
		public: {
			BROADCAST_PROVIDER: process.env.BROADCAST_PROVIDER,
			PUSHER_APP_ID: process.env.PUSHER_APP_ID,
			PUSHER_APP_KEY: process.env.PUSHER_APP_KEY,
			PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
			MIN_PLAYERS: process.env.MIN_PLAYERS,
		},
	},
	rootDir: path.resolve(__dirname),
	srcDir: 'src/',
	dir: {
		public: path.resolve(__dirname, 'public'),
	},
	alias: {
		'@': path.resolve(__dirname, 'src'),
	},
	css: ['@/assets/css/main.css'],
	i18n: {
		defaultLocale: 'en',
		langDir: '../src/i18n/locales',
		lazy: true,
		locales: [
			{ code: 'en', name: 'English', file: 'en.json' },
			{ code: 'de', name: 'Deutschland', file: 'de.json' },
		],
		bundle: {
			optimizeTranslationDirective: false,
		},
	},
});
