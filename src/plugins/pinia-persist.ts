import piniaPersistedState from 'pinia-plugin-persistedstate';
import type { Pinia } from 'pinia';

export default defineNuxtPlugin((nuxtApp) => {
	const pinia: Pinia = nuxtApp.$pinia as Pinia;
	pinia.use(piniaPersistedState);
});
