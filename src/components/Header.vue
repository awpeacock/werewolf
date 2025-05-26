<script setup lang="ts">
const app = useNuxtApp();
const route = useRoute();
const localePath = useLocalePath();
const locales: Array<string> = useI18n().localeCodes.value;

const styles = {
	container: {
		default: 'md:w-[250px] md:mx-4',
		error: '',
	},
	header: {
		home: 'flex-col',
		default: 'flex-row sm:max-md:mr-[120px] sm:max-md:px-4 md:flex-col md:items-center',
	},
	image: {
		home: 'm-auto cursor-default',
		default:
			'rounded-full border-2 border-yellow-200 bg-yellow-600 ml-4 p-2 cursor-pointer md:w-[200px] md:h-[200px]',
	},
};

const isHome = ref(false);
const isErrorPage = computed(() => !!app.payload.error);
const container = ref(styles.container.default);
const header = ref(styles.header.default);
const image = ref(styles.image.default);

const updateState = (path: string) => {
	isHome.value = path === '/' || locales.some((code) => path === '/' + code);
	container.value = isErrorPage.value ? styles.container.error : styles.container.default;
	header.value = isHome.value && !isErrorPage.value ? styles.header.home : styles.header.default;
	image.value = isHome.value && !isErrorPage.value ? styles.image.home : styles.image.default;
};

// We should only be checking against route on the client
onMounted(() => {
	updateState(route.path);
});

// Watch for route changes to update the classes dynamically
watch(
	() => route.path,
	(newPath) => {
		updateState(newPath);
	}
);
</script>

<template>
	<header class="flex flex-col w-full text-center my-4" :class="container">
		<Head v-if="!isErrorPage">
			<Title>{{
				route.meta.title == 'werewolf-game'
					? $t('werewolf-game')
					: $t('werewolf') + ' : ' + $t((route.meta?.title as string) || '')
			}}</Title>
		</Head>
		<h1 v-if="isHome || isErrorPage" class="text-7xl text-yellow-200 font-oswald">
			{{ $t('werewolf') }}
		</h1>
		<div v-if="!isErrorPage" class="flex" :class="header">
			<NuxtLink v-slot="{ navigate }" :to="{ path: localePath('/') }" custom>
				<img
					src="/images/werewolf.webp"
					:alt="$t('logo-alt-text')"
					:class="image"
					:width="isHome ? 300 : 120"
					:height="isHome ? 300 : 120"
					@click="navigate"
				/>
			</NuxtLink>
			<div v-if="!isHome" class="flex flex-col w-full mx-4 self-center">
				<h1 class="mb-2 text-5xl text-yellow-200 font-oswald">{{ $t('werewolf') }}</h1>
				<h2 class="text-yellow-100 font-oswald text-4xl">
					{{
						$t(
							typeof route.meta.title === 'string' && route.meta.title
								? route.meta.title
								: ''
						)
					}}
				</h2>
			</div>
		</div>
	</header>
</template>
