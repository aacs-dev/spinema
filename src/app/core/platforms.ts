import { Platform } from './tmdb.models';

/**
 * Subscriptions most people in Romania and Poland actually have, in this order. TMDB's own
 * ranking puts niche services first (HBO Max is 23rd in Romania), so it is not used for the top.
 * Ids that a region does not list simply do not show up there.
 */
export const POPULAR_PLATFORM_IDS: readonly number[] = [
  8, // Netflix
  1899, // HBO Max
  119, // Amazon Prime Video
  337, // Disney Plus
  1773, // SkyShowtime
  350, // Apple TV
  2101, // CANAL+ (PL)
  505, // Player (PL)
  2363, // Polsat Box Go (PL)
  2658, // TVP (PL)
  11, // MUBI
];

/** A sane upper bound for one region; TMDB lists about 40 platforms in Romania and 60 in Poland. */
export const MAX_PLATFORMS = 80;

export interface PlatformGroups {
  popular: Platform[];
  /** Everything else, alphabetically. */
  others: Platform[];
}

export function groupPlatforms(platforms: readonly Platform[], locale = 'ro'): PlatformGroups {
  const byId = new Map(platforms.map((p) => [p.id, p]));
  const popular = POPULAR_PLATFORM_IDS.map((id) => byId.get(id)).filter((p): p is Platform => p !== undefined);
  const others = platforms
    .filter((p) => !POPULAR_PLATFORM_IDS.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base' }));
  return { popular, others };
}
