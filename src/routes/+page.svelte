<script lang="ts">
	import ScoreboardView from '$lib/components/ScoreboardView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ScoreboardView scoreboard={data.scoreboard} conferences={data.conferences} ratings={data.ratings} />
