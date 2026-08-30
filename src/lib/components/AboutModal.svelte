<script lang="ts">
	import { lockBodyScroll } from '$lib/bodyScrollLock';
	import { formatIsoDate } from '$lib/format';

	let {
		open,
		onClose,
		sagarinAsOf
	}: { open: boolean; onClose: () => void; sagarinAsOf?: string } = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (open) {
			dialogEl?.showModal();
			return lockBodyScroll();
		} else {
			dialogEl?.close();
		}
	});
</script>

<dialog
	bind:this={dialogEl}
	class="modal"
	onclose={onClose}
	onclick={(event) => {
		if (event.target === dialogEl) onClose();
	}}
>
	<div class="content">
		<button class="close" type="button" aria-label="Close" onclick={onClose}>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d="M2 2l12 12M14 2L2 14"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
		</button>

		<h2>About</h2>

		<section>
			<p>
				This app's purpose is to surface the most interesting college football games every
				week! It shows every FBS and FCS game for a given week, ranked by how interesting
				the matchup is likely to be (a mix of how good both teams are and how close the game
				figures to be), how surprising the score is, and/or the current game situation.
				Filter by team, conference, rank, or channel, and star favorite teams to have their
				games stand out.
			</p>
		</section>

		<section>
			<span class="field">Where the data comes from</span>
			<ul>
				<li>
					Most information (scores, schedules, broadcast info, etc.) comes from
					<a href="https://www.espn.com/college-football/" target="_blank" rel="noopener noreferrer"
						>ESPN</a
					>'s public (unofficial) API.
				</li>
				<li>
					Team strength ratings are derived from
					<a href="http://sagarin.com/sports/cfsend.htm" target="_blank" rel="noopener noreferrer"
						>Jeff Sagarin's college football ratings</a
					>{#if sagarinAsOf}&nbsp;(as of {formatIsoDate(
							sagarinAsOf
						)}){/if}.
				</li>
				<li>
					Betting lines and win probabilities come from
					<a
						href="https://collegefootballdata.com/"
						target="_blank"
						rel="noopener noreferrer">CollegeFootballData</a
					>, used as a fallback when ESPN doesn't provide them.
				</li>
				<li>
					Live scores update from a small backend service that polls ESPN throughout the game day.
				</li>
			</ul>
		</section>

		<section>
			<p class="hint">This is an independent project and isn't affiliated with any of the entities mentioned above.</p>
		</section>
	</div>
</dialog>

<style>
	.modal {
		width: min(28rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		padding: 0;
		border: none;
		border-radius: var(--radius-lg);
		background: transparent;
		color: inherit;
		overflow: visible;
	}

	.modal::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	.content {
		position: relative;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	.close {
		position: absolute;
		top: var(--space-5);
		right: var(--space-5);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: var(--radius-full);
		background: var(--color-surface-alt);
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.close:hover {
		color: var(--color-text);
	}

	h2 {
		margin: 0 0 var(--space-4);
		padding-inline-end: 2.5rem;
		font-size: var(--text-xl);
		letter-spacing: -0.01em;
	}

	section {
		margin-bottom: var(--space-4);
	}

	section:last-child {
		margin-bottom: 0;
	}

	p {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.5;
	}

	.field {
		display: block;
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	ul {
		margin: 0;
		padding-left: 1.1rem;
		font-size: var(--text-sm);
		line-height: 1.5;
	}

	li:not(:last-child) {
		margin-bottom: var(--space-2);
	}

	.hint {
		color: var(--color-text-faint);
		font-size: var(--text-xs);
	}

	a {
		color: var(--color-accent);
	}

	a:hover {
		text-decoration: none;
	}
</style>
