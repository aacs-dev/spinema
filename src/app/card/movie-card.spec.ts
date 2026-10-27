import { MovieDetails, Provider } from '../core/tmdb.models';
import { segmentColor } from '../wheel/genre-wheel';
import { groupProviders } from './movie-card';

const provider = (id: number, priority: number): Provider => ({
  provider_id: id,
  provider_name: `P${id}`,
  logo_path: `/${id}.jpg`,
  display_priority: priority,
});

const movie = (providers: MovieDetails['providers']): MovieDetails => ({
  id: 1,
  title: 'T',
  originalTitle: 'T',
  originalLanguage: null,
  year: null,
  rating: null,
  runtime: null,
  genres: [],
  overview: '',
  overviewLanguage: 'ro',
  posterPath: null,
  trailerKey: null,
  providers,
});

describe('groupProviders', () => {
  it('lists subscription first, then free, rent and buy, each by display priority', () => {
    const groups = groupProviders(
      movie({
        RO: {
          buy: [provider(3, 1)],
          rent: [provider(2, 5), provider(4, 1)],
          flatrate: [provider(8, 2), provider(9, 0)],
          ads: [provider(5, 0)],
        },
      }),
      'RO',
    );
    expect(groups.map((g) => g.kind)).toEqual(['flatrate', 'free', 'rent', 'buy']);
    expect(groups[0].providers.map((p) => p.provider_id)).toEqual([9, 8]);
    expect(groups[2].providers.map((p) => p.provider_id)).toEqual([4, 2]);
  });

  it('reads the selected region only', () => {
    const m = movie({ PL: { flatrate: [provider(1, 0)] } });
    expect(groupProviders(m, 'RO')).toEqual([]);
    expect(groupProviders(m, 'PL')).toHaveLength(1);
  });

  it('removes duplicates inside a group', () => {
    const groups = groupProviders(movie({ RO: { free: [provider(1, 0)], ads: [provider(1, 0)] } }), 'RO');
    expect(groups[0].providers).toHaveLength(1);
  });
});

describe('segmentColor', () => {
  it('never gives two neighbouring segments the same colour, including the wrap-around', () => {
    for (let n = 2; n <= 30; n++) {
      const colors = Array.from({ length: n }, (_, i) => segmentColor(i, n));
      for (let i = 0; i < n; i++) expect(colors[i]).not.toBe(colors[(i + 1) % n]);
    }
  });
});
