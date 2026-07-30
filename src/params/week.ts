import type { ParamMatcher } from '@sveltejs/kit';
import { parseWeekSlug } from '$lib/game/weeks';

/**
 * Gate the root-level `[week]` route so it only claims week slugs. Without this a
 * single dynamic segment at the root would swallow every unknown path.
 */
export const match: ParamMatcher = (param) => parseWeekSlug(param) !== null;
