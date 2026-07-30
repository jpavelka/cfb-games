<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.jpg';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let settingsOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>College Football Games</title>
</svelte:head>

<header>
	<div class="inner">
		<h1>College Football</h1>
		<button class="settings" type="button" onclick={() => (settingsOpen = true)}>Settings</button>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer>
	<div class="inner">Data from ESPN's unofficial API. Times shown in your local timezone.</div>
</footer>

<SettingsModal
	open={settingsOpen}
	onClose={() => (settingsOpen = false)}
	conferences={data.conferences}
/>

<style>
	header {
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.inner {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-3) var(--space-4);
	}

	header .inner {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
	}

	h1 {
		margin: 0;
		font-size: var(--text-xl);
		letter-spacing: -0.01em;
	}

	.settings {
		margin-left: auto;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.settings:hover {
		color: var(--color-accent);
	}

	main {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-4) var(--space-4) var(--space-6);
	}

	footer {
		border-top: 1px solid var(--color-border);
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}
</style>
