import { TestBed } from '@angular/core/testing';
import { ShareService, buildFilmLink, parseFilmParam } from './share.service';

describe('parseFilmParam', () => {
  it.each([
    ['?film=550', 550],
    ['?x=1&film=27205', 27205],
    ['?film=%2042%20', 42],
    ['film=7', 7],
  ])('reads %s as %s', (search, id) => {
    expect(parseFilmParam(search)).toBe(id);
  });

  it.each(['', '?', '?film=', '?film=abc', '?film=0', '?film=-3', '?film=1.5', '?film=12345678901', '?movie=550', '?film=55x'])(
    'ignores %j',
    (search) => {
      expect(parseFilmParam(search)).toBeNull();
    },
  );
});

describe('buildFilmLink', () => {
  it('uses the GitHub Pages base path', () => {
    expect(buildFilmLink('https://user.github.io/spinema/', 550)).toBe('https://user.github.io/spinema/?film=550');
  });

  it('replaces any existing query and hash', () => {
    expect(buildFilmLink('http://localhost:4200/?film=1#x', 2)).toBe('http://localhost:4200/?film=2');
  });

  it('round-trips through the parser', () => {
    const link = buildFilmLink('https://user.github.io/spinema/', 680);
    expect(parseFilmParam(new URL(link).search)).toBe(680);
  });
});

describe('ShareService.clearFilmParam', () => {
  it('removes ?film= and keeps the history entry state', () => {
    history.replaceState({ spinemaCard: true }, '', '/?film=550&x=1');
    TestBed.inject(ShareService).clearFilmParam();
    expect(location.search).toBe('?x=1');
    expect(history.state).toEqual({ spinemaCard: true });
    history.replaceState(null, '', '/');
  });
});
