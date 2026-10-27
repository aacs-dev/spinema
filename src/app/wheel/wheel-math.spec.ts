import { mulberry32 } from '../core/rng';
import { JITTER_RATIO, MAX_TURNS, MIN_TURNS, mod, planSpin, segmentAtPointer, tickTimes } from './wheel-math';

describe('planSpin', () => {
  const counts = [2, 3, 7, 12, 19, 20, 24];

  it('lands the pointer inside the winning segment for every N and index', () => {
    const rng = mulberry32(42);
    for (const n of counts) {
      for (let index = 0; index < n; index++) {
        const { target } = planSpin(0, index, n, rng);
        expect(segmentAtPointer(target, n)).toBe(index);
      }
    }
  });

  it('keeps landing correctly across consecutive spins that start off a whole turn', () => {
    const rng = mulberry32(7);
    for (const n of counts) {
      let current = 0;
      for (let spin = 0; spin < 50; spin++) {
        const index = Math.floor(rng() * n);
        const plan = planSpin(current, index, n, rng);
        expect(segmentAtPointer(plan.target, n)).toBe(index);
        expect(plan.target).toBeGreaterThan(current);
        current = plan.target;
      }
    }
  });

  it('never lands on a border: the pointer stays at least 15% of a segment away from both edges', () => {
    const rng = mulberry32(99);
    for (const n of counts) {
      const seg = 360 / n;
      for (let i = 0; i < 200; i++) {
        const index = i % n;
        const { target } = planSpin(rng() * 3600, index, n, rng);
        const offset = mod(-target, 360) - index * seg;
        expect(offset).toBeGreaterThanOrEqual(seg * (0.5 - JITTER_RATIO) - 1e-9);
        expect(offset).toBeLessThanOrEqual(seg * (0.5 + JITTER_RATIO) + 1e-9);
      }
    }
  });

  it('turns 5–7 whole times plus less than one more turn', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const current = rng() * 1000;
      const plan = planSpin(current, 4, 19, rng);
      expect(plan.turns).toBeGreaterThanOrEqual(MIN_TURNS);
      expect(plan.turns).toBeLessThanOrEqual(MAX_TURNS);
      const travelled = plan.target - current;
      expect(travelled).toBeGreaterThanOrEqual(plan.turns * 360);
      expect(travelled).toBeLessThan((plan.turns + 1) * 360);
    }
  });

  it('matches the brief formula when the wheel rests on a whole turn', () => {
    const rng = mulberry32(11);
    const n = 19;
    const seg = 360 / n;
    const index = 5;
    const plan = planSpin(720, index, n, rng);
    const brief = 720 + plan.turns * 360 + (360 - (index * seg + seg / 2)) + plan.jitter;
    expect(mod(plan.target, 360)).toBeCloseTo(mod(brief, 360), 9);
  });
});

describe('tickTimes', () => {
  it('produces increasing times within the spin duration, slowing down towards the end', () => {
    const times = tickTimes(0, 6 * 360, 19, 4500);
    expect(times.length).toBeGreaterThan(10);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
    expect(times.at(-1)).toBeLessThanOrEqual(4500);
    const firstGap = times[1] - times[0];
    const lastGap = times.at(-1)! - times.at(-2)!;
    expect(lastGap).toBeGreaterThan(firstGap);
  });
});
