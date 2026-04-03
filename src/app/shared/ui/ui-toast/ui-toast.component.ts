import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-ui-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ],
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts$(); track toast.id) {
        <div 
          [@fadeSlide]
          class="bg-white border-l-4 rounded-xl shadow-xl p-4 min-w-[280px] max-w-[400px] flex items-start gap-3 pointer-events-auto"
          [ngClass]="{
            'border-emerald-500': toast.type === 'success',
            'border-rose-500': toast.type === 'error',
            'border-amber-500': toast.type === 'warning',
            'border-stone-400': toast.type === 'info'
          }"
        >
          <span 
            class="material-icons-outlined text-xl shrink-0"
            [ngClass]="{
              'text-emerald-600': toast.type === 'success',
              'text-rose-600': toast.type === 'error',
              'text-amber-600': toast.type === 'warning',
              'text-stone-600': toast.type === 'info'
            }"
          >
            {{ getIcon(toast.type) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-stone-800 text-sm leading-relaxed">{{ toast.message }}</p>
          </div>
          <button
            (click)="toastService.remove(toast.id)"
            class="shrink-0 h-6 w-6 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
          >
            <span class="material-icons-outlined text-sm">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class UiToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[type as keyof typeof icons] || 'info';
  }
}
