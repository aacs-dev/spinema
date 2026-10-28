import { POPULAR_PLATFORM_IDS, groupPlatforms } from './platforms';
import { Platform } from './tmdb.models';

const platform = (id: number, name: string): Platform => ({ id, name, logoPath: null });

describe('groupPlatforms', () => {
  // In TMDB's own order for Romania: niche services before HBO Max.
  const ro = [
    platform(8, 'Netflix'),
    platform(475, 'DOCSVILLE'),
    platform(190, 'Curiosity Stream'),
    platform(1899, 'HBO Max'),
    platform(119, 'Amazon Prime Video'),
    platform(546, 'WOW Presents Plus'),
    platform(35, 'Rakuten TV'),
  ];

  it('puts the well-known subscriptions first, in a fixed order', () => {
    expect(groupPlatforms(ro).popular.map((p) => p.name)).toEqual(['Netflix', 'HBO Max', 'Amazon Prime Video']);
  });

  it('lists everything else alphabetically, ignoring case', () => {
    expect(groupPlatforms(ro).others.map((p) => p.name)).toEqual([
      'Curiosity Stream',
      'DOCSVILLE',
      'Rakuten TV',
      'WOW Presents Plus',
    ]);
  });

  it('shows a popular platform only where the region has it', () => {
    expect(POPULAR_PLATFORM_IDS).toContain(505);
    expect(groupPlatforms(ro).popular.some((p) => p.id === 505)).toBe(false);
  });
});
