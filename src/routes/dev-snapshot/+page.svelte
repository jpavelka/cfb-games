<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Dev snapshots — College Football Games</title>
</svelte:head>

<h2>Dev snapshots</h2>
<p class="notice">
	Local-only fixtures captured with <code>npm run fetch:dev-snapshot</code> — not deployed, not
	committed.
</p>

{#if data.snapshots.length === 0}
	<p class="empty">
		No snapshots captured yet. Run <code>npm run fetch:dev-snapshot</code> to capture one.
	</p>
{:else}
	<ul class="snapshots">
		{#each data.snapshots as snapshot (snapshot.name)}
			<li>
				<a href={resolve('/dev-snapshot/[name]', { name: snapshot.name })}>{snapshot.label}</a>
				<span class="meta">
					{snapshot.name} · captured {new Date(snapshot.capturedAt).toLocaleString()}
					{#if snapshot.bettingFile}
						· betting: {snapshot.bettingFile}
					{/if}
				</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--text-2xl);
		letter-spacing: -0.01em;
	}

	.notice {
		margin: 0 0 var(--space-4);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-sm);
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
		font-size: var(--text-sm);
	}

	.notice code {
		font-family: var(--font-numeric);
	}

	.empty {
		padding: var(--space-6) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-muted);
		text-align: center;
	}

	.snapshots {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.snapshots li {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.meta {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
