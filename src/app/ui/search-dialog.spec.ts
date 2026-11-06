import { TestBed } from '@angular/core/testing';
import { TmdbService } from '../core/tmdb.service';
import { MovieSummary } from '../core/tmdb.models';
import { SEARCH_DEBOUNCE_MS, SearchDialog } from './search-dialog';

const movie = (id: number, title: string, year = '2001'): MovieSummary => ({
  id,
  title,
  original_title: title,
  poster_path: null,
  release_date: `${year}-05-01`,
});

const settle = (ms = SEARCH_DEBOUNCE_MS + 50) => new Promise((resolve) => setTimeout(resolve, ms));

async function mount(search: (query: string) => Promise<MovieSummary[]>) {
  const tmdb = { search: vi.fn(search), imageUrl: () => '' };
  TestBed.configureTestingModule({ providers: [{ provide: TmdbService, useValue: tmdb }] });
  const fixture = TestBed.createComponent(SearchDialog);
  const picked: number[] = [];
  fixture.componentInstance.pick.subscribe((id) => picked.push(id));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('#search-input')!;
  const type = async (text: string, wait = true) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    if (wait) await settle();
    await fixture.whenStable();
  };
  const status = () => el.querySelector('#search-status')?.textContent?.trim();
  const titles = () => [...el.querySelectorAll('.movie-title')].map((t) => t.textContent?.trim());
  return { fixture, el, tmdb, picked, type, status, titles };
}

describe('SearchDialog', () => {
  it('waits for 2 letters, then lists the films found with their year', async () => {
    const { tmdb, type, status, titles, el } = await mount(async () => [movie(1, 'Casa din țară', '1975'), movie(2, 'Casa de sticlă')]);
    expect(status()).toBe('Scrie cel puțin 2 litere din titlu.');

    await type('c');
    expect(tmdb.search).not.toHaveBeenCalled();

    await type('casa');
    expect(tmdb.search).toHaveBeenCalledWith('casa');
    expect(titles()).toEqual(['Casa din țară', 'Casa de sticlă']);
    expect(el.querySelector('.movie-meta')?.textContent?.trim()).toBe('1975');
    expect(status()).toBe('2 filme găsite.');
  });

  it('searches once per pause in typing, not once per letter', async () => {
    const { tmdb, type } = await mount(async () => []);
    await type('ca', false);
    await type('cas', false);
    await type('casa');
    expect(tmdb.search).toHaveBeenCalledTimes(1);
    expect(tmdb.search).toHaveBeenCalledWith('casa');
  });

  it('drops an answer that arrives after a newer search', async () => {
    let releaseSlow!: (value: MovieSummary[]) => void;
    const { type, titles } = await mount((query) =>
      query === 'slow' ? new Promise((resolve) => (releaseSlow = resolve)) : Promise.resolve([movie(9, 'Fast')]),
    );
    await type('slow');
    await type('fast');
    releaseSlow([movie(8, 'Slow')]);
    await settle(20);
    expect(titles()).toEqual(['Fast']);
  });

  it('says when nothing matches, and Enter opens the first film when there is one', async () => {
    const { type, status, picked, el, fixture } = await mount(async (query) => (query === 'zzz' ? [] : [movie(5, 'Noaptea')]));
    await type('zzz');
    expect(status()).toBe('Niciun film pentru „zzz”.');

    await type('noaptea');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(picked).toEqual([5]);
  });

  it('offers to try again when the search fails', async () => {
    let fail = true;
    const { type, status, el, fixture, titles } = await mount(async () => {
      if (fail) throw new Error('offline');
      return [movie(3, 'Strada')];
    });
    await type('strada');
    expect(status()).toBe('Nu am putut căuta. Verifică conexiunea și încearcă din nou.');

    fail = false;
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Încearcă din nou'))!.click();
    await settle(20);
    await fixture.whenStable();
    expect(titles()).toEqual(['Strada']);
  });
});
