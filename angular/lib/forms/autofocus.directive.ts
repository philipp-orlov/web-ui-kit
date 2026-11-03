import { AfterViewInit, Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';

/** Focuses its element when it appears and, for a text box, selects what it holds. */
@Directive({ selector: '[uiAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  /** `[uiAutofocus]="false"` turns it off (a dialog that opens for an edit, not for typing). */
  readonly uiAutofocus = input(true, { transform: booleanAttribute });

  ngAfterViewInit(): void {
    if (!this.uiAutofocus()) {
      return;
    }
    const element = this.element.nativeElement;
    element.focus();
    // select() exists on inputs and textareas only; on a button or a mat-select it threw.
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
    }
  }
}
