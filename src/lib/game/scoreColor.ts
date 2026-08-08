interface HslStop {
	h: number;
	s: number;
	l: number;
}

// Fixed (not theme-dependent) fill shared by the matchup- and surprise-score
// badges, so both read on the same scale: flat gray through 30, amber at 65,
// green at 99. All three sit in the same lightness band so one dark ink color
// reads clearly across the whole range (checked: >=6.3:1 contrast against
// #1a1a1a at every stop).
const SCORE_LOW: HslStop = { h: 0, s: 0, l: 68 };
const SCORE_MID: HslStop = { h: 45, s: 75, l: 58 };
const SCORE_HIGH: HslStop = { h: 130, s: 45, l: 48 };
const SCORE_LOW_THRESHOLD = 30;
const SCORE_MID_THRESHOLD = 65;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpStop(a: HslStop, b: HslStop, t: number): HslStop {
	return { h: lerp(a.h, b.h, t), s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
}

/** Badge fill for a 0-99 score: gray (<=30) -> amber (65) -> green (99). */
export function scoreBadgeColor(score: number): string {
	const clamped = Math.max(0, Math.min(99, score));
	const stop =
		clamped <= SCORE_LOW_THRESHOLD
			? SCORE_LOW
			: clamped <= SCORE_MID_THRESHOLD
				? lerpStop(
						SCORE_LOW,
						SCORE_MID,
						(clamped - SCORE_LOW_THRESHOLD) / (SCORE_MID_THRESHOLD - SCORE_LOW_THRESHOLD)
					)
				: lerpStop(
						SCORE_MID,
						SCORE_HIGH,
						(clamped - SCORE_MID_THRESHOLD) / (99 - SCORE_MID_THRESHOLD)
					);
	return `hsl(${stop.h} ${stop.s}% ${stop.l}%)`;
}
