import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../core/storage.service';
import { TmdbService } from '../core/tmdb.service';
import { HistoryDrawer } from './history-drawer';

const entry = (id: number): HistoryEntry => ({ id, title: `Film ${id}`, year: '2001', posterPath: null, at: Date.UTC(2026, 9, 20, 19) });

async function mount() {
  TestBed.configureTestingModule({ providers: [{ provide: TmdbService, useValue: { imageUrl: () => '' } }] });
  const fixture = TestBed.createComponent(HistoryDrawer);
  fixture.componentRef.setInput('history', [entry(1)]);
  fixture.componentRef.setInput('watchlist', []);
  fixture.componentRef.setInput('alreadySeen', [entry(7), entry(8)]);
  const removed: number[] = [];
  fixture.componentInstance.removeAlreadySeen.subscribe((id) => removed.push(id));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const tabs = () => [...el.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  return { fixture, el, tabs, removed };
}

describe('HistoryDrawer', () => {
  it('has a third tab, "Deja văzute", where a movie can be taken off the list', async () => {
    const { fixture, el, tabs, removed } = await mount();
    expect(tabs().map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Istoric 1', 'De văzut 0', 'Deja văzute 2']);
    tabs()[2].click();
    await fixture.whenStable();
    const remove = el.querySelector<HTMLButtonElement>('#panel-alreadySeen .remove-btn')!;
    expect(remove.getAttribute('aria-label')).toBe('Scoate Film 7 din Deja văzute');
    remove.click();
    expect(removed).toEqual([7]);
  });

  it('arrow keys cycle through all three tabs, wrapping around', async () => {
    const { fixture, tabs } = await mount();
    const key = async (k: string) => {
      tabs()[0].parentElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      await fixture.whenStable();
      return tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');
    };
    expect(await key('ArrowLeft')).toBe(2);
    expect(await key('ArrowRight')).toBe(0);
    expect(await key('End')).toBe(2);
    expect(await key('Home')).toBe(0);
  });
});
