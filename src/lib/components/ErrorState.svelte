<script lang="ts">
	let {
		message,
		onRetry
	}: {
		message: string;
		onRetry: () => void;
	} = $props();
</script>

<div class="wrap" role="alert">
	<p class="headline">Couldn't load games</p>
	<p class="detail">{message}</p>
	<p class="hint">
		Game data comes from a backend service that mirrors ESPN's scoreboard on a schedule —
		this week's data may not be ready yet, or the service may be temporarily down.
	</p>
	<button type="button" onclick={onRetry}>Try again</button>
</div>

<style>
	.wrap {
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-align: center;
	}

	.headline {
		margin: 0 0 var(--space-2);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.detail {
		margin: 0 0 var(--space-2);
		color: var(--color-text-muted);
	}

	.hint {
		margin: 0 0 var(--space-4);
		color: var(--color-text-faint);
		font-size: var(--text-sm);
	}

	button {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		font-weight: 600;
		cursor: pointer;
		transition: border-color var(--transition);
	}

	button:hover {
		border-color: var(--color-accent);
	}
</style>
