<script setup lang="ts">
defineProps<{
	alive: Array<Player>;
	dead: Array<Player>;
	evicted: Array<Player>;
}>();
</script>

<template>
	<h4
		class="rounded-tl-lg rounded-tr-lg bg-yellow-200 mx-20 mt-4 mb-0 p-2 font-oswald text-xl text-center text-yellow-700"
	>
		{{ $t('population') }} : {{ alive.length }}
	</h4>
	<ul class="rounded-bl-lg rounded-br-lg bg-yellow-600 mx-20 mt-0 mb-4 p-2 text-center">
		<li v-for="(villager, idx) in alive" :key="idx" class="font-oswald text-base text-white">
			{{ villager.nickname }}
		</li>
		<li v-for="(villager, idx) in dead" :key="idx" class="font-oswald text-base text-red-700">
			{{ $t('rip', { villager: villager.nickname }) }}
		</li>
		<li
			v-for="(villager, idx) in evicted"
			:key="idx"
			class="font-oswald text-base text-stone-600"
		>
			{{ $t('evicted', { villager: villager.nickname }) }}
		</li>
	</ul>
</template>
