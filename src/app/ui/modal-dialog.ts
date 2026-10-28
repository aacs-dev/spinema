import { Directive, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';

/**
 * Drives a native `<dialog>` from a boolean: `showModal()` gives focus trapping, Esc to close,
 * an inert page behind it and focus returning to the opener. A click on the backdrop closes it.
 */
@Directive({
  selector: 'dialog[appModal]',
  exportAs: 'appModal',
  host: {
    '(cancel)': 'onCancel()',
    '(close)': 'onNativeClose()',
    '(click)': 'closeOnBackdrop($event)',
  },
})
export class ModalDialog {
  readonly open = input(false, { alias: 'appModal' });
  readonly closed = output<void>();
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  /** Set while a close started here waits for the browser's own close event. */
  private closing = false;

  constructor() {
    afterRenderEffect(() => {
      const open = this.open();
      if (open && !this.dialog.open) this.dialog.showModal?.();
      else if (!open && this.dialog.open) this.dialog.close();
    });
  }

  close(): void {
    if (this.dialog.open) {
      this.closing = true;
      this.dialog.close();
    }
    // Tell the parent at once. The browser's close event is queued and can come late (over a
    // second in a background tab); a reopen in that gap must not be swallowed by it.
    this.closed.emit();
  }

  /** Esc: the browser fires this at once, then closes the dialog. Tell the parent now, as close() does. */
  protected onCancel(): void {
    this.closing = true;
    this.closed.emit();
  }

  /** Any other close the browser makes; this tells the parent. */
  protected onNativeClose(): void {
    const ours = this.closing;
    this.closing = false;
    // Ours was announced already, and an event for a dialog that has reopened since is stale.
    if (ours || this.dialog.open) return;
    this.closed.emit();
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog) this.close();
  }
}
