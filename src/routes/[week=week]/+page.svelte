<script lang="ts">
	import ScoreboardView from '$lib/components/ScoreboardView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ScoreboardView
	scoreboard={data.scoreboard}
	weeks={data.weeks}
	requested={data.requested}
	isCurrentWeek={data.isCurrentWeek}
	conferences={data.conferences}
	ratings={data.ratings}
/>
