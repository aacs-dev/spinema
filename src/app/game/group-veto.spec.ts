import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NightService } from '../core/night.service';
import { Genre } from '../core/tmdb.models';
import { GameStore } from './game.store';
import { GroupVeto, MAX_PEOPLE } from './group-veto';
import { Phase } from './spin-machine';

const genres = (n: number): Genre[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Gen ${i + 1}` }));

function setup(count = 19) {
  localStorage.clear();
  const all = signal(genres(count));
  const phase = signal<Phase>('idle');
  TestBed.configureTestingModule({
    providers: [
      {
        provide: GameStore,
        useFactory: () => {
          const night = TestBed.inject(NightService);
          return {
            phase,
            genres: all,
            genresReady: computed(() => all().length > 0),
            wheelGenres: computed(() => all().filter((g) => !night.vetoedGenreIds().includes(g.id))),
          };
        },
      },
    ],
  });
  return { veto: TestBed.inject(GroupVeto), night: TestBed.inject(NightService), phase, all };
}

describe('GroupVeto', () => {
  it('lets each person take one genre off, then ends', () => {
    const { veto, night } = setup();
    veto.start(3);
    expect(veto.inProgress()).toBe(true);
    veto.pick(5);
    expect(veto.turn()).toBe(1);
    veto.pick(2);
    veto.pick(9);
    expect(veto.inProgress()).toBe(false);
    expect(night.vetoedGenreIds()).toEqual([5, 2, 9]);
    expect(veto.vetoed().map((g) => g.name)).toEqual(['Gen 5', 'Gen 2', 'Gen 9']);
  });

  it('ignores a genre that is no longer on the wheel, without passing the turn', () => {
    const { veto, night } = setup();
    veto.start(2);
    veto.pick(5);
    veto.pick(5);
    veto.pick(999);
    expect(veto.turn()).toBe(1);
    expect(night.vetoedGenreIds()).toEqual([5]);
  });

  it('"Renunță" mid-veto puts every genre back', () => {
    const { veto, night } = setup();
    veto.start(3);
    veto.pick(5);
    veto.cancel();
    expect(veto.inProgress()).toBe(false);
    expect(night.vetoedGenreIds()).toEqual([]);
  });

  it('a new veto replaces tonight\'s earlier one; "Anulează vetoul" clears it', () => {
    const { veto, night } = setup();
    veto.start(2);
    veto.pick(1);
    veto.pick(2);
    veto.start(2);
    expect(night.vetoedGenreIds()).toEqual([]);
    veto.pick(3);
    veto.pick(4);
    veto.clear();
    expect(night.vetoedGenreIds()).toEqual([]);
  });

  it('allows 2 to 6 people and always leaves at least 3 genres', () => {
    expect(setup(19).veto.maxPeople()).toBe(MAX_PEOPLE);
    TestBed.resetTestingModule();
    const small = setup(6);
    expect(small.veto.maxPeople()).toBe(3);
    small.veto.start(4);
    expect(small.veto.inProgress()).toBe(false);
    TestBed.resetTestingModule();
    expect(setup(4).veto.available()).toBe(false);
  });

  it('changes nothing while the wheel or reel is running', () => {
    const { veto, night, phase } = setup();
    veto.start(2);
    veto.pick(1);
    veto.pick(2);
    phase.set('spinningGenre');
    veto.clear();
    veto.start(2);
    expect(night.vetoedGenreIds()).toEqual([1, 2]);
  });
});
