<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.jpg';
	import DataStatus from '$lib/components/DataStatus.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { settings } from '$lib/game/settings.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let settingsOpen = $state(false);

	$effect(() => {
		if (settings.theme === 'system') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', settings.theme);
		}
	});
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
	<div class="inner">
		<span class="attribution-full">Data from ESPN's unofficial API. Times shown in your local timezone.</span>
		<span class="attribution-short">Data from ESPN. Times shown locally.</span>
		<DataStatus />
	</div>
</footer>

<SettingsModal
	open={settingsOpen}
	onClose={() => (settingsOpen = false)}
	conferences={data.conferences}
	broadcasters={data.broadcasters}
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
		/* Bottom padding clears the fixed footer so it never covers the last row of content. */
		padding: var(--space-4) var(--space-4) calc(var(--space-6) + 2.5rem);
	}

	footer {
		position: fixed;
		inset-inline: 0;
		inset-block-end: 0;
		z-index: 5;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	footer .inner {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
	}

	/* Below this width the two spans wrap onto separate lines; center each
	   rather than leaving them pinned to opposite edges. */
	@media (max-width: 640px) {
		footer .inner {
			justify-content: center;
			text-align: center;
			row-gap: var(--space-1);
		}
	}

	.attribution-short {
		display: none;
	}

	/* Narrow enough that even the attribution's own line wraps in two; swap
	   in a shorter message rather than let it break across three lines total. */
	@media (max-width: 400px) {
		.attribution-full {
			display: none;
		}

		.attribution-short {
			display: inline;
		}
	}
</style>
