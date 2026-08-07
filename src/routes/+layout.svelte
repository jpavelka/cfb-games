<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.jpg';
	import AboutModal from '$lib/components/AboutModal.svelte';
	import DataStatus from '$lib/components/DataStatus.svelte';
	import { formatTimeZoneAbbreviation, formatUtcOffset } from '$lib/format';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { settings } from '$lib/game/settings.svelte';
	import { closeSettingsModal, openSettingsModal, settingsModalState } from '$lib/game/settingsModal.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let aboutOpen = $state(false);
	// Measured rather than guessed, since the fixed footer's height varies with
	// content length and can wrap to extra lines on narrow phone screens —
	// a hardcoded padding-bottom on <main> falls short there and lets the
	// footer cover interactive content underneath it.
	let footerHeight = $state(0);

	// Detected rather than approximated with a viewport-width media query:
	// the two footer items' natural widths (and thus the point they no
	// longer fit side by side) vary with content, so a fixed breakpoint
	// either centers them early — while they're still on one line, causing
	// a visible "snap" — or lets them stay spread too long. Comparing their
	// offsetTop tracks the real wrap point exactly. Watching the wrapper
	// (rather than the items) catches both a viewport resize and a content
	// change (e.g. the relative-time text growing) flipping the wrap state,
	// since either shows up as a height/width change on the wrapper itself.
	let footerInner: HTMLElement | undefined = $state();
	let footerFirstItem: HTMLElement | undefined = $state();
	let footerSecondItem: HTMLElement | undefined = $state();
	let footerWrapped = $state(false);

	function checkFooterWrap() {
		if (footerFirstItem && footerSecondItem) {
			footerWrapped = footerSecondItem.offsetTop > footerFirstItem.offsetTop;
		}
	}

	$effect(() => {
		if (!footerInner) return;
		const observer = new ResizeObserver(checkFooterWrap);
		observer.observe(footerInner);
		return () => observer.disconnect();
	});

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
		<h1>CFB Games</h1>
		<nav class="headerActions">
			<button class="settings" type="button" onclick={openSettingsModal}>Settings</button>
			<button class="settings" type="button" onclick={() => (aboutOpen = true)}>About</button>
		</nav>
	</div>
</header>

<main style="padding-bottom: calc({footerHeight}px + var(--space-4))">
	{@render children()}
</main>

<footer bind:clientHeight={footerHeight}>
	<div class="inner" class:wrapped={footerWrapped} bind:this={footerInner}>
		<span bind:this={footerFirstItem}
			>Timezone: {formatTimeZoneAbbreviation()} ({formatUtcOffset()})</span
		>
		<span bind:this={footerSecondItem}><DataStatus /></span>
	</div>
</footer>

<SettingsModal
	open={settingsModalState.open}
	onClose={closeSettingsModal}
	conferences={data.conferences}
	broadcasters={data.broadcasters}
/>

<AboutModal open={aboutOpen} onClose={() => (aboutOpen = false)} sagarinAsOf={data.sagarinAsOf} />

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

	.headerActions {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-left: auto;
	}

	.headerActions .settings:not(:first-child) {
		padding-left: var(--space-3);
		border-left: 1px solid var(--color-border);
	}

	.settings {
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
		padding: var(--space-4);
		/* Bottom padding clears the fixed footer (its real height is measured via
		   bind:clientHeight, since it can wrap to extra lines on narrow screens). */
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
		padding-bottom: env(safe-area-inset-bottom);
	}

	footer .inner {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
	}

	/* Applied only once the two spans have actually wrapped onto separate
	   lines (see footerWrapped in the script) — centers each line instead
	   of leaving it pinned to the edge it held on the shared line. */
	footer .inner.wrapped {
		justify-content: center;
		text-align: center;
		row-gap: var(--space-1);
	}

</style>
