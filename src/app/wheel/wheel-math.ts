import { randomInt } from '../core/rng';
import type { Rng } from '../core/tokens';

export const WHEEL_SPIN_MS = 4500;
/** Strong ease-out: most of the distance in the first second, a long crawl into the pointer. */
export const WHEEL_EASING: readonly [number, number, number, number] = [0.12, 0.8, 0.14, 1];
export const MIN_TURNS = 5;
export const MAX_TURNS = 7;
/** Jitter stays within ±35% of a segment so the pointer never lands on a border. */
export const JITTER_RATIO = 0.35;

export const mod = (a: number, n: number) => ((a % n) + n) % n;

export interface SpinPlan {
  /** Absolute rotation in degrees to animate to. */
  target: number;
  turns: number;
  jitter: number;
}

/**
 * Decides the final rotation for a winning segment *before* the animation runs.
 *
 * Segments are laid out clockwise from 12 o'clock, `index * seg` to `(index + 1) * seg`, and the
 * pointer sits at the top. The brief's formula
 *   target = current + turns·360 + (360 − (index·seg + seg/2)) + jitter
 * assumes `current` is a whole number of turns. After the first spin it is not, so the landing
 * term is taken relative to where the wheel currently rests. For `current ≡ 0 (mod 360)` the
 * two are identical.
 */
export function planSpin(current: number, index: number, segments: number, rng: Rng): SpinPlan {
  const seg = 360 / segments;
  const turns = randomInt(rng, MIN_TURNS, MAX_TURNS);
  const jitter = (rng() * 2 - 1) * JITTER_RATIO * seg;
  const landing = mod(360 - (index * seg + seg / 2) + jitter, 360);
  const delta = mod(landing - mod(current, 360), 360);
  return { target: current + turns * 360 + delta, turns, jitter };
}

/** The segment under the pointer for a given rotation. Used only by tests, never to decide a result. */
export function segmentAtPointer(rotation: number, segments: number): number {
  const seg = 360 / segments;
  return Math.floor(mod(-rotation, 360) / seg) % segments;
}

/** CSS cubic-bezier evaluated as progress(time), both in [0, 1]. */
export function bezierProgressAt(easing: readonly [number, number, number, number]) {
  const [x1, y1, x2, y2] = easing;
  const coord = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  return {
    /** Time fraction at which the curve reaches the given progress. */
    timeFor(progress: number): number {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (coord(mid, y1, y2) < progress) lo = mid;
        else hi = mid;
      }
      return coord((lo + hi) / 2, x1, x2);
    },
  };
}

/** Moments (ms from spin start) when a segment border passes the pointer, for the optional tick sound. */
export function tickTimes(from: number, to: number, segments: number, durationMs: number): number[] {
  const seg = 360 / segments;
  const curve = bezierProgressAt(WHEEL_EASING);
  const times: number[] = [];
  let last = -Infinity;
  for (let border = Math.ceil(from / seg) * seg; border <= to; border += seg) {
    const t = curve.timeFor((border - from) / (to - from)) * durationMs;
    // At full speed borders pass faster than a click can be heard; thin them out.
    if (t - last >= 45) {
      times.push(t);
      last = t;
    }
  }
  return times;
}
