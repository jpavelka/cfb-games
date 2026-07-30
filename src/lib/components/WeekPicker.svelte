<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { WeekOption } from '$lib/game/weeks';

	let {
		weeks,
		selected
	}: {
		weeks: WeekOption[];
		/** The slug of the week currently on screen, or null in the off season. */
		selected: string | null;
	} = $props();

	const groups = $derived(
		(
			[
				{ label: 'Regular Season', phase: 'regular' },
				{ label: 'Postseason', phase: 'postseason' }
			] as const
		)
			.map((group) => ({
				label: group.label,
				options: weeks.filter((week) => week.phase === group.phase)
			}))
			.filter((group) => group.options.length > 0)
	);

	// ESPN can point us at a week its own calendar does not list — most obviously in
	// the off season. Without a placeholder the browser would silently display the
	// first option, which would claim the user is somewhere they aren't.
	const known = $derived(weeks.some((week) => week.slug === selected));
</script>

<select
	aria-label="Choose a week"
	value={known ? selected : ''}
	onchange={(event) => goto(resolve('/[week=week]', { week: event.currentTarget.value }))}
>
	{#if !known}
		<option value="" disabled>Jump to a week…</option>
	{/if}
	{#each groups as group (group.label)}
		<optgroup label={group.label}>
			{#each group.options as week (week.slug)}
				<option value={week.slug}>
					{week.label}{week.detail ? ` · ${week.detail}` : ''}
				</option>
			{/each}
		</optgroup>
	{/each}
</select>

<style>
	select {
		max-width: 100%;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-alt);
		color: inherit;
		font: inherit;
		font-size: var(--text-sm);
		cursor: pointer;
		transition: border-color var(--transition);
	}

	select:hover {
		border-color: var(--color-accent);
	}
</style>
