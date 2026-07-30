<script lang="ts">
	import { teamInitials } from '$lib/format';
	import type { GameTeam } from '$lib/game/types';

	let { team, size = 36 }: { team: GameTeam; size?: number } = $props();

	// A handful of teams have no logo at all, and CDN URLs can rot. Either way we
	// fall back to initials rather than showing a broken image.
	let failed = $state(false);
</script>

{#if team.logoUrl && !failed}
	<img
		class="logo"
		src={team.logoUrl}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		onerror={() => (failed = true)}
	/>
{:else}
	<span
		class="fallback"
		style:width="{size}px"
		style:height="{size}px"
		style:border-color={team.color ?? 'var(--color-border)'}
		aria-hidden="true"
	>
		{teamInitials(team)}
	</span>
{/if}

<style>
	.logo {
		object-fit: contain;
		flex: none;
	}

	.fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
</style>
