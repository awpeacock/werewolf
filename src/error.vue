<script setup lang="ts">
import type { NuxtError } from '#app';
const props = defineProps({
	error: {
		type: Object as () => NuxtError,
		default: () => ({ statusCode: 500, message: useI18n().t('server-error') }),
	},
});

const t = useI18n().t;

const title = props.error?.statusCode === 404 ? 'page-not-found' : 'server-error';
useHead({
	title: t('werewolf') + ' : ' + t(title),
	bodyAttrs: {
		class: 'bg-yellow-700',
	},
});
</script>

<template>
	<NuxtLayout>
		<div v-if="error?.statusCode === 404">
			<Heading class="text-center">{{ t('page-not-found') }}</Heading>
			<img
				src="/images/village/lost-werewolf.webp"
				:alt="t('lost-werewolf-alt-text')"
				class="w-2/3 mx-auto"
			/>
			<BodyText>{{ t('maybe-the-werewolf-ate-it') }}</BodyText>
		</div>
		<div v-else>
			<Heading class="text-center">{{ t('server-error') }}</Heading>
			<img
				src="/images/village/dead-werewolf.webp"
				:alt="t('dead-werewolf-alt-text')"
				class="w-2/3 mx-auto"
			/>
			<BodyText>{{ t('unexpected-error') }} </BodyText>
		</div>
	</NuxtLayout>
</template>
