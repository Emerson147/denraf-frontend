import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      <div class="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <span class="material-icons-outlined text-3xl sm:text-4xl text-stone-400">
          {{ icon() }}
        </span>
      </div>
      <h3 class="text-base sm:text-lg font-semibold text-stone-800 mb-2">
        {{ title() }}
      </h3>
      <p class="text-sm text-stone-500 mb-6 max-w-sm">
        {{ description() }}
      </p>
      @if (actionLabel()) {
        <button 
          (click)="actionClick.emit()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors shadow-sm hover:shadow-md"
        >
          <span class="material-icons-outlined text-lg">add</span>
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class UiEmptyStateComponent {
  icon = input<string>('inbox');
  title = input.required<string>();
  description = input.required<string>();
  actionLabel = input<string>();
  actionClick = output<void>();
}
