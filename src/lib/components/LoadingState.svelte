<script lang="ts">
	// Purely presentational skeleton. Count is arbitrary — just enough to signal
	// "a list is coming" without implying how long it will be.
	const placeholders = [0, 1, 2, 3, 4];
</script>

<div class="wrap" role="status" aria-live="polite">
	<span class="sr-only">Loading this week's games…</span>
	{#each placeholders as placeholder (placeholder)}
		<div class="skeleton"></div>
	{/each}
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.skeleton {
		height: 4.5rem;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-skeleton) 25%,
			var(--color-surface) 50%,
			var(--color-skeleton) 75%
		);
		background-size: 300% 100%;
		animation: shimmer 1.4s ease-in-out infinite;
	}

	@keyframes shimmer {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: -100% 0;
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
