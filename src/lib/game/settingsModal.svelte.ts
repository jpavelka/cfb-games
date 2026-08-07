/**
 * Whether the settings modal is open, hoisted out of `+layout.svelte` (where the
 * modal itself lives) so other components with no direct access to that local
 * state — e.g. the "N filters applied" link in `ScoreboardView.svelte`, a
 * sibling deep inside `{@render children()}` — can still open it.
 */
export const settingsModalState: { open: boolean } = $state({ open: false });

export function openSettingsModal(): void {
	settingsModalState.open = true;
}

export function closeSettingsModal(): void {
	settingsModalState.open = false;
}
