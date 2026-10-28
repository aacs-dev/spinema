import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export const FILM_PARAM = 'film';

/** Reads `?film=<tmdbId>`. Anything that is not a positive integer is ignored. */
export function parseFilmParam(search: string): number | null {
  const value = new URLSearchParams(search).get(FILM_PARAM)?.trim();
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

/** Builds the share link on the app's base URL, e.g. https://user.github.io/spinema/?film=550 */
export function buildFilmLink(baseUri: string, id: number): string {
  const url = new URL(baseUri);
  url.search = `?${FILM_PARAM}=${id}`;
  url.hash = '';
  return url.toString();
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly document = inject(DOCUMENT);

  readFilmId(): number | null {
    return parseFilmParam(this.document.location.search);
  }

  link(id: number): string {
    return buildFilmLink(this.document.baseURI, id);
  }

  /** Removes `?film=` from the address bar without reloading, once the visitor spins for themselves. */
  clearFilmParam(): void {
    const url = new URL(this.document.location.href);
    if (!url.searchParams.has(FILM_PARAM)) return;
    url.searchParams.delete(FILM_PARAM);
    const history = this.document.defaultView?.history;
    // Keeps the entry's state, which marks an open ticket for the Back button.
    history?.replaceState(history.state, '', url.toString());
  }

  async share(id: number, title: string, text: string): Promise<ShareOutcome> {
    const url = this.link(id);
    const nav = this.document.defaultView?.navigator;
    if (nav?.share) {
      try {
        await nav.share({ title, text, url });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        // Other failures (e.g. not allowed in this context) fall through to the clipboard.
      }
    }
    if (!nav?.clipboard) return 'failed';
    try {
      await nav.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
