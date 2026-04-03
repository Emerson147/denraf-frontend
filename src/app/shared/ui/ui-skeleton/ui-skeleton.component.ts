import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 💀 Skeleton Loading Component
 * 
 * Muestra placeholders animados mientras se cargan datos.
 * Mejora la percepción de velocidad del sistema.
 * 
 * @example
 * <app-ui-skeleton variant="card" [repeat]="3" />
 * <app-ui-skeleton variant="list" [repeat]="5" />
 * <app-ui-skeleton variant="text" width="200px" />
 */
@Component({
  selector: 'app-ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of skeletonArray(); track $index) {
      <!-- Card Skeleton -->
      @if (variant() === 'card') {
        <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-6 animate-pulse">
          <div class="flex items-start justify-between mb-4">
            <div class="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-800"></div>
            <div class="h-4 w-16 rounded bg-stone-200 dark:bg-stone-800"></div>
          </div>
          <div class="space-y-2">
            <div class="h-4 w-24 rounded bg-stone-200 dark:bg-stone-800"></div>
            <div class="h-8 w-32 rounded bg-stone-200 dark:bg-stone-800"></div>
          </div>
        </div>
      }

      <!-- List Skeleton -->
      @if (variant() === 'list') {
        <div class="flex items-center gap-3 p-4 animate-pulse">
          <div class="h-12 w-12 rounded-lg bg-stone-200 dark:bg-stone-800"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-800"></div>
            <div class="h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800"></div>
          </div>
          <div class="h-4 w-16 rounded bg-stone-200 dark:bg-stone-800"></div>
        </div>
      }

      <!-- Product Card Skeleton -->
      @if (variant() === 'product') {
        <div class="group bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-pulse">
          <div class="relative aspect-square bg-stone-200 dark:bg-stone-800"></div>
          <div class="p-2.5 space-y-2">
            <div class="h-4 w-full rounded bg-stone-200 dark:bg-stone-800"></div>
            <div class="h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-800"></div>
            <div class="h-5 w-20 rounded bg-stone-200 dark:bg-stone-800"></div>
          </div>
        </div>
      }

      <!-- Text Skeleton -->
      @if (variant() === 'text') {
        <div 
          class="h-4 rounded bg-stone-200 dark:bg-stone-800 animate-pulse"
          [style.width]="width()"
        ></div>
      }

      <!-- Circle Skeleton -->
      @if (variant() === 'circle') {
        <div 
          class="rounded-full bg-stone-200 dark:bg-stone-800 animate-pulse"
          [style.width]="width()"
          [style.height]="width()"
        ></div>
      }

      <!-- Table Row Skeleton -->
      @if (variant() === 'table-row') {
        <tr class="animate-pulse">
          <td class="p-4">
            <div class="h-4 w-full rounded bg-stone-200 dark:bg-stone-800"></div>
          </td>
          <td class="p-4">
            <div class="h-4 w-full rounded bg-stone-200 dark:bg-stone-800"></div>
          </td>
          <td class="p-4">
            <div class="h-4 w-full rounded bg-stone-200 dark:bg-stone-800"></div>
          </td>
        </tr>
      }
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class UiSkeletonComponent {
  /** Tipo de skeleton a mostrar */
  variant = input<'card' | 'list' | 'product' | 'text' | 'circle' | 'table-row'>('text');
  
  /** Cantidad de skeletons a repetir */
  repeat = input(1);
  
  /** Ancho personalizado (solo para text y circle) */
  width = input('100%');

  /** Array para el @for basado en repeat */
  skeletonArray = () => Array(this.repeat()).fill(0);
}
