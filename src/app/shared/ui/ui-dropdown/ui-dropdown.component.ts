import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from '../../directives/click-outside/click-outside.component';

@Component({
  selector: 'app-ui-dropdown',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  template: `
    <div class="relative inline-block text-left" (clickOutside)="isOpen = false">
      
      <button 
        type="button" 
        class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        (click)="toggle($event)"
      >
        <span class="material-icons-outlined text-lg">more_vert</span> </button>

      @if (isOpen) {
        <div 
          class="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-48 max-w-xs origin-top-right rounded-xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200 z-50"
        >
          <div class="py-1">
            <button 
              (click)="onAction('edit')"
              class="group flex w-full items-center px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
            >
              <span class="material-icons-outlined mr-3 text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300">edit</span>
              Editar
            </button>

            <button 
              (click)="onAction('delete')"
              class="group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <span class="material-icons-outlined mr-3 text-red-400 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400">delete</span>
              Eliminar
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class UiDropdownComponent {
  isOpen = false;
  @Output() action = new EventEmitter<'edit' | 'delete'>();

  toggle(event: Event) {
    event.stopPropagation(); // Evita que el clic se propague y cierre inmediatamente
    this.isOpen = !this.isOpen;
  }

  onAction(type: 'edit' | 'delete') {
    this.action.emit(type);
    this.isOpen = false;
  }
}