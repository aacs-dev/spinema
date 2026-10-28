import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BackNavigation, CARD_ENTRY } from './back-navigation';
import { CardOrigin, GameStore, View } from './game.store';
import { Phase } from './spin-machine';

function setup() {
  history.replaceState(null, '');
  const phase = signal<Phase>('idle');
  const origin = signal<CardOrigin>('spin');
  const view = computed<View>(() => {
    const p = phase();
    if (p === 'result') return 'card';
    if (p === 'error' || p === 'empty') return p;
    return p === 'loadingMovies' || p === 'spinningReel' ? 'reel' : 'wheel';
  });
  const backToWheel = vi.fn(() => {
    if (phase() === 'result' || phase() === 'empty' || phase() === 'error') phase.set('idle');
  });
  TestBed.configureTestingModule({
    providers: [{ provide: GameStore, useValue: { phase, origin, view, backToWheel } }],
  });
  TestBed.inject(BackNavigation);
  TestBed.tick();
  const show = (to: Phase, from: CardOrigin = 'spin') => {
    origin.set(from);
    phase.set(to);
    TestBed.tick();
  };
  const popped = () => new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true }));
  return { phase, show, backToWheel, popped };
}

const onCardEntry = () => (history.state as Record<string, unknown> | null)?.[CARD_ENTRY] === true;

describe('BackNavigation', () => {
  it('gives a ticket its own history entry, once', () => {
    const { show } = setup();
    const before = history.length;
    show('result');
    expect(onCardEntry()).toBe(true);
    expect(history.length).toBe(before + 1);

    // "Alt film" and "Alt gen" stay on the same entry.
    show('loadingMovies');
    show('result');
    expect(history.length).toBe(before + 1);
  });

  it('the browser Back button returns from the ticket to the wheel', async () => {
    const { show, phase, backToWheel, popped } = setup();
    show('result');
    const back = popped();
    history.back();
    await back;
    expect(backToWheel).toHaveBeenCalled();
    expect(phase()).toBe('idle');
  });

  it('leaving the ticket with an in-app control drops its entry too', async () => {
    const { show, phase, popped } = setup();
    show('result');
    const back = popped();
    phase.set('idle');
    TestBed.tick();
    await back;
    expect(onCardEntry()).toBe(false);
  });

  it('does not add an entry for a shared link, which is the landing page', () => {
    const { show } = setup();
    const before = history.length;
    show('result', 'shared');
    expect(onCardEntry()).toBe(false);
    expect(history.length).toBe(before);
  });
});
