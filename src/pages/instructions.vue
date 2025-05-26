<script setup lang="ts">
definePageMeta({
	title: 'how-to-play',
	footer: {
		src: '/images/village/reading-werewolf.webp',
		alt: 'reading-werewolf-alt-text',
	},
});
</script>

<template>
	<div>
		<BodyText>{{ $t('instructions-intro') }}</BodyText>
		<Subheading>{{ $t('instructions-roles') }}</Subheading>
		<ul class="mb-2 font-oswald text-base text-white">
			<li>
				<strong>{{ $t('werewolf') }}</strong> :
				{{ $t('instructions-roles-werewolf') }}
			</li>
			<li>
				<strong>{{ $t('healer') }}</strong> :
				{{ $t('instructions-roles-healer') }}
			</li>
			<li>
				<strong>{{ $t('villager') }}</strong> :
				{{ $t('instructions-roles-villagers') }}
			</li>
			<li>
				<strong>{{ $t('mayor') }}</strong> :
				{{ $t('instructions-roles-mayor') }}
			</li>
		</ul>
		<BodyText>{{ $t('instructions-roles-closing') }}</BodyText>
		<Subheading>{{ $t('instructions-game-flow') }}</Subheading>
		<BodyText>{{ $t('instructions-game-runs-in-turns') }}</BodyText>
		<ul class="list-disc list-outside ml-4 mb-4 font-oswald text-base text-white">
			<li>{{ $t('instructions-night-time') }}</li>
			<li>{{ $t('instructions-day-time') }}</li>
			<li>
				{{ $t('instructions-majority') }}
				<ul class="list-outside ml-4">
					<li>&#10008; &nbsp; {{ $t('instructions-day-wrong') }}</li>
					<li>&#10004; &nbsp; {{ $t('instructions-day-correct') }}</li>
				</ul>
			</li>
		</ul>
		<Subheading>{{ $t('instructions-how-the-game-ends') }}</Subheading>
		<BodyText>{{ $t('instructions-game-end') }}</BodyText>
	</div>
</template>
