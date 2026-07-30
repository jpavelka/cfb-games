import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * This repo is a GitHub *project* page, so the deployed site lives under
 * /cfb-games/. Set BASE_PATH only in CI — leaving it unset keeps `dev` and
 * `preview` at "/", which is what you want locally. A missing leading slash is
 * tolerated so `BASE_PATH=cfb-games` works too.
 */
function resolveBase(value: string | undefined): '' | `/${string}` {
	if (!value || value === '/') return '';
	const trimmed = value.replace(/\/$/, '');
	return trimmed.startsWith('/') ? (trimmed as `/${string}`) : `/${trimmed}`;
}

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				// GitHub Pages serves 404.html for any unmatched path, which makes it a
				// working SPA fallback if client-side routes are added later.
				fallback: '404.html'
			}),
			paths: {
				base: resolveBase(process.env.BASE_PATH),
				// Relative asset URLs make the build largely base-path agnostic.
				relative: true
			}
		})
	]
});
