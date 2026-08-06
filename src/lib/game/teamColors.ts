import type { GameTeam } from './types';

// Out of a max possible RGB distance of ~441 (black to white), how far apart two
// colors need to be to read as distinct when placed side by side in a thin bar.
// Calibrated against real team pairs: SMU red/FSU maroon (~93) should fall back,
// Texas orange/Oklahoma red (~109) shouldn't.
const MIN_DISTANCE = 100;

const FALLBACK_LIGHT_GRAY = '#d4d4d8';
const FALLBACK_DARK_GRAY = '#52525b';

function hexToRgb(hex: string): [number, number, number] {
	const value = parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function distance(a: string, b: string): number {
	const [r1, g1, b1] = hexToRgb(a);
	const [r2, g2, b2] = hexToRgb(b);
	return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function luminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Home team always shows its own primary color. Away team shows its primary
 * color too, unless that's too close to the home color to tell apart — then
 * its secondary color, then finally a gray shade picked for contrast against
 * the home color (light gray against a dark home color, dark gray against a
 * light one). Falls back to the existing neutral scheme when the home team
 * has no color to build the whole comparison from.
 */
export function winProbBarColors(
	home: Pick<GameTeam, 'color'>,
	away: Pick<GameTeam, 'color' | 'altColor'>
): { home: string; away: string } {
	const homeColor = home.color;
	if (!homeColor) {
		return { home: 'var(--color-accent)', away: 'var(--color-text-faint)' };
	}

	const tooClose = (candidate: string | undefined) =>
		candidate === undefined || distance(homeColor, candidate) < MIN_DISTANCE;

	let awayColor: string;
	if (!tooClose(away.color)) {
		awayColor = away.color as string;
	} else if (!tooClose(away.altColor)) {
		awayColor = away.altColor as string;
	} else {
		awayColor = luminance(homeColor) > 128 ? FALLBACK_DARK_GRAY : FALLBACK_LIGHT_GRAY;
	}

	return { home: homeColor, away: awayColor };
}
