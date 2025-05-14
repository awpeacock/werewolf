<script setup lang="ts">
const { locale, locales } = useI18n({ useScope: 'global' });

const switchLocalePath = useSwitchLocalePath();
</script>

<template>
	<span class="flex flex-row">
		<NuxtLink
			v-for="lang in locales"
			:key="lang.code"
			:to="switchLocalePath(lang.code)"
			:disabled="lang.code === locale"
		>
			<img
				:src="`/images/locale/${lang.code}.webp`"
				width="30"
				height="16"
				class="mr-4 mt-4 mb-2"
			/>
		</NuxtLink>
	</span>
</template>
