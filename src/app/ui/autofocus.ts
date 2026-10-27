import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** Moves focus to the element once it is rendered (used for headings of views that replace others). */
@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => element.focus());
  }
}
