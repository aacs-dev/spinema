import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName = 'play' | 'share' | 'bookmark' | 'bookmark-filled' | 'list' | 'settings' | 'close';

/** A handful of 24px line icons, inlined so there is no icon font or library. Always decorative. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template: `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (name()) {
        @case ('play') { <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /> }
        @case ('share') { <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12v7.5h14V12" /> }
        @case ('bookmark') { <path d="M6.5 3.5h11v17L12 16l-5.5 4.5z" /> }
        @case ('bookmark-filled') { <path d="M6.5 3.5h11v17L12 16l-5.5 4.5z" fill="currentColor" /> }
        @case ('list') { <path d="M4 5.5h16v13H4zM4 9.5h16M9 5.5v13" /> }
        @case ('settings') { <path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.25" /><circle cx="9" cy="17" r="2.25" /> }
        @case ('close') { <path d="M6 6l12 12M18 6 6 18" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
