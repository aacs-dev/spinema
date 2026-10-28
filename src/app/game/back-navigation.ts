import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, untracked } from '@angular/core';
import { CardOrigin, GameStore, View } from './game.store';
import { Phase } from './spin-machine';

/** Marks the history entry that belongs to an open ticket. */
export const CARD_ENTRY = 'spinemaCard';

/**
 * Gives an open ticket its own history entry, so the browser's Back button and the iPhone's
 * swipe-back return to the wheel instead of leaving the site. A shared link is the visitor's
 * landing page, so it gets no extra entry: Back there leaves, as it would on any other site.
 */
@Injectable({ providedIn: 'root' })
export class BackNavigation {
  private readonly store = inject(GameStore);
  private readonly history = inject(DOCUMENT).defaultView?.history ?? null;

  constructor() {
    effect(() => {
      const view = this.store.view();
      const phase = this.store.phase();
      const origin = this.store.origin();
      untracked(() => this.sync(view, phase, origin));
    });

    const window = inject(DOCUMENT).defaultView;
    const onPopState = () => this.onPopState();
    window?.addEventListener('popstate', onPopState);
    inject(DestroyRef).onDestroy(() => window?.removeEventListener('popstate', onPopState));
  }

  private onCardEntry(): boolean {
    const state: unknown = this.history?.state;
    return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[CARD_ENTRY] === true;
  }

  private sync(view: View, phase: Phase, origin: CardOrigin): void {
    if (!this.history) return;
    if (view === 'card' && origin !== 'shared' && !this.onCardEntry()) {
      this.history.pushState({ [CARD_ENTRY]: true }, '');
    } else if (phase === 'idle' && this.onCardEntry()) {
      // The ticket was left with an in-app control (logo, "Înapoi la roată"): drop its entry too,
      // so the next Back does not land on a ticket that is no longer there.
      this.history.back();
    }
  }

  private onPopState(): void {
    const phase = this.store.phase();
    // Mid-spin, Back is ignored; the result that follows gets a fresh entry.
    if (!this.onCardEntry() && (phase === 'result' || phase === 'empty' || phase === 'error')) {
      this.store.backToWheel();
    }
  }
}
