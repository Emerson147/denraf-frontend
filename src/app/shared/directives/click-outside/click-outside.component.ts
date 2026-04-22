import { Directive, ElementRef, Output, EventEmitter, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  private elementRef = inject(ElementRef);

  @Output() clickedOutside = new EventEmitter<void>();

  @HostListener('document:click', ['$event.target'])
  public onClick(target: EventTarget | null) {
    if (!target) return;
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickedOutside.emit();
    }
  }
}