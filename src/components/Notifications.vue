<script setup lang="ts">
const socket = useBroadcastClient();
const game = useGameStore();
const player = usePlayerStore();
const pending = reactive<Player[]>([]);
const error = ref(false);

const isMayor = computed(() => {
	return game.mayor && player && game.mayor.id === player.id;
});

onMounted(async () => {
	// This should only ever be visible for the mayor of the active game
	if (isMayor.value) {
		if (game.pending && game.pending.length > 0) {
			pending.push(...game.pending);
		}
	}
});

// Watch for any incoming join requests
watch(
	() => socket.latest.value,
	(event) => {
		if (event && isMayor.value) {
			if (event.type === 'join-request') {
				const request = event as JoinRequestEvent;
				pending.push(request.player);
			}
			if (event.type === 'invite-accept') {
				const acceptance = event as InviteAcceptEvent;
				game.players.push(acceptance.player);
			}
		}
	}
);

const admit = async (villager: Player, admit: boolean) => {
	const api = `/api/games/${game.id}/admit`;
	const body: AdmissionBody = { auth: player.id, villager: villager.id, admit: admit };
	return $fetch<Game>(api, {
		method: 'PUT',
		body: body,
	})
		.then((response: Game) => {
			game.set(useGame(response).parse());
			socket.remove('join-request', villager);
			for (let p = 0; p < pending.length; p++) {
				if (pending[p].id === villager.id) {
					pending.splice(p, 1);
				}
			}
		})
		.catch((e) => {
			useLogger().error('Unable to admit/deny player', e as Error);
			error.value = true;
		});
};
</script>

<template>
	<ul
		v-if="isMayor && pending!.length > 0"
		class="flex flex-col fixed top-0 left-0 mt-4 w-full z-100"
	>
		<li
			v-for="(request, idx) in pending"
			:key="idx"
			class="flex items-center p-2 mx-8 mt-2 rounded-full bg-teal-300 border-2 border-teal-800 font-oswald text-l"
		>
			<IconAlarm class="w-[32px] h-[32px] *:fill-teal-800" />
			<span class="flex flex-row flex-1 items-center justify-left">
				<strong data-testid="join-name">{{ request.nickname }}</strong>
				&nbsp;
				{{ $t('waiting-to-be-admitted') }}
				<YesNo :yes="() => admit(request, true)" :no="() => admit(request, false)" />
			</span>
		</li>
		<li v-if="error">
			<Error
				message="unexpected-error"
				class="mx-8 mt-4"
				data-testid="admit-error"
				@click="error = false"
			/>
		</li>
	</ul>
</template>
