import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../ui-button/ui-button.component'; // Para el botón de cerrar

@Component({
  selector: 'app-ui-sheet',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  template: `
    <div 
      class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-300"
      [class.opacity-0]="!isOpen"
      [class.pointer-events-none]="!isOpen"
      (click)="close()"
    ></div>

    <div 
      class="fixed inset-y-0 right-0 z-50 h-full w-full max-w-sm border-l bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out sm:max-w-md"
      [class.translate-x-full]="!isOpen" 
      [class.translate-x-0]="isOpen"
    >
      <div class="flex flex-col space-y-2 text-center sm:text-left mb-6">
        <h2 class="text-lg font-semibold text-foreground">{{ title }}</h2>
        @if (description) {
          <p class="text-sm text-muted-foreground">{{ description }}</p>
        }
      </div>

      <ng-content></ng-content>

      <button 
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
        (click)="close()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        <span class="sr-only">Close</span>
      </button>
    </div>
  `
})
export class UiSheetComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() isOpen = false;
  
  // Emitimos evento para que el padre sepa que debe cambiar la variable isOpen a false
  @Output() isOpenChange = new EventEmitter<boolean>();

  close() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }
}