import { TestBed } from '@angular/core/testing';
import { SoundService } from '../core/sound.service';
import { Genre } from '../core/tmdb.models';
import { GenreWheel } from './genre-wheel';
import { tickTimes } from './wheel-math';

const GENRES: Genre[] = [
  { id: 28, name: 'Acțiune' },
  { id: 35, name: 'Comedie' },
  { id: 18, name: 'Dramă' },
  { id: 27, name: 'Horror' },
];

interface Mount {
  rotation: number;
  spinStart: number | null;
  spinning: boolean;
  durationMs?: number;
}

async function mount({ rotation, spinStart, spinning, durationMs = 4500 }: Mount) {
  const sound = { ticks: vi.fn(), chime: vi.fn(), rattle: vi.fn(), prime: vi.fn() };
  TestBed.configureTestingModule({ providers: [{ provide: SoundService, useValue: sound }] });
  const fixture = TestBed.createComponent(GenreWheel);
  fixture.componentRef.setInput('genres', GENRES);
  fixture.componentRef.setInput('rotation', rotation);
  fixture.componentRef.setInput('spinStart', spinStart);
  fixture.componentRef.setInput('durationMs', durationMs);
  fixture.componentRef.setInput('spinning', spinning);

  // The rotor's style before each change: the first one is what it was created with.
  const styles: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if ((record.target as HTMLElement).classList.contains('rotor')) styles.push(record.oldValue ?? '');
    }
  });
  observer.observe(fixture.nativeElement, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['style'] });

  await fixture.whenStable();
  await Promise.resolve();
  observer.disconnect();
  const rotor = fixture.nativeElement.querySelector('.rotor') as HTMLElement;
  const transforms = [...styles, rotor.getAttribute('style') ?? ''].map((style) => /rotate\([^)]*\)/.exec(style)?.[0] ?? '');
  return { rotor, transforms: transforms.filter(Boolean), sound };
}

describe('GenreWheel', () => {
  it('appears at rest without moving or ticking', async () => {
    const { rotor, transforms, sound } = await mount({ rotation: 1234, spinStart: 100, spinning: false });
    expect(rotor.style.transform).toBe('rotate(1234deg)');
    expect(transforms.every((t) => t === 'rotate(1234deg)')).toBe(true);
    expect(sound.ticks).not.toHaveBeenCalled();
  });

  it('appearing mid-spin ("Alt gen"), paints the start angle first so the turn is animated', async () => {
    const { rotor, transforms, sound } = await mount({ rotation: 2900, spinStart: 700, spinning: true });
    expect(transforms[0]).toBe('rotate(700deg)');
    expect(rotor.style.transform).toBe('rotate(2900deg)');
    expect(sound.ticks).toHaveBeenCalledWith(tickTimes(700, 2900, GENRES.length, 4500));
  });

  it('jumps straight to the target when motion is reduced', async () => {
    const { rotor, transforms } = await mount({ rotation: 2900, spinStart: 700, spinning: true, durationMs: 0 });
    expect(transforms).not.toContain('rotate(700deg)');
    expect(rotor.style.transform).toBe('rotate(2900deg)');
  });
});
