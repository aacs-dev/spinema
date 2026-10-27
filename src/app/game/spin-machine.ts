export type Phase =
  | 'idle'
  | 'spinningGenre'
  | 'genreChosen'
  | 'loadingMovies'
  | 'spinningReel'
  | 'result'
  | 'error'
  | 'empty';

/**
 * Allowed transitions. `loadingMovies → result` skips the reel: shared links, saved movies and
 * reduced motion. `result → loadingMovies` is "Altă tură" for the same genre.
 */
export const TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  idle: ['spinningGenre', 'loadingMovies', 'error'],
  spinningGenre: ['genreChosen', 'error'],
  genreChosen: ['loadingMovies', 'error'],
  loadingMovies: ['spinningReel', 'result', 'empty', 'error'],
  spinningReel: ['result', 'error'],
  result: ['idle', 'spinningGenre', 'loadingMovies'],
  empty: ['idle', 'spinningGenre', 'loadingMovies'],
  error: ['idle', 'spinningGenre', 'loadingMovies'],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: Phase, to: Phase) {
    super(`Invalid transition ${from} → ${to}`);
  }
}
