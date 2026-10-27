import { Directive, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';

/**
 * Drives a native `<dialog>` from a boolean: `showModal()` gives focus trapping, Esc to close,
 * an inert page behind it and focus returning to the opener. A click on the backdrop closes it.
 */
@Directive({
  selector: 'dialog[appModal]',
  exportAs: 'appModal',
  host: {
    '(close)': 'closed.emit()',
    '(click)': 'closeOnBackdrop($event)',
  },
})
export class ModalDialog {
  readonly open = input(false, { alias: 'appModal' });
  readonly closed = output<void>();
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;

  constructor() {
    afterRenderEffect(() => {
      const open = this.open();
      if (open && !this.dialog.open) this.dialog.showModal?.();
      else if (!open && this.dialog.open) this.dialog.close();
    });
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
    else this.closed.emit();
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog) this.close();
  }
}
