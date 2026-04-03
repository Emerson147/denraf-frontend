import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-kpi-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm p-6 hover:shadow-md transition-all duration-300">
      <!-- Header con icono -->
      <div class="flex items-start justify-between mb-4">
        <div class="h-12 w-12 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center transition-colors duration-300">
          <span class="material-icons-outlined text-2xl">{{ icon }}</span>
        </div>
        
        <!-- Badge de tendencia -->
        @if (change !== null) {
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors duration-300"
               [ngClass]="{
                 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400': trend === 'up',
                 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400': trend === 'down',
                 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300': trend === 'stable'
               }">
            @if (trend === 'up') {
              <span class="material-icons-outlined text-sm">trending_up</span>
            }
            @if (trend === 'down') {
              <span class="material-icons-outlined text-sm">trending_down</span>
            }
            @if (trend === 'stable') {
              <span class="material-icons-outlined text-sm">remove</span>
            }
            <span>{{ change > 0 ? '+' : '' }}{{ change | number:'1.1-1' }}%</span>
          </div>
        }
      </div>

      <!-- Título y subtítulo -->
      <div class="mb-3">
        <p class="text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wide font-medium">{{ label }}</p>
        @if (subtitle) {
          <p class="text-stone-400 dark:text-stone-500 text-xs mt-0.5">{{ subtitle }}</p>
        }
      </div>

      <!-- Valor principal -->
      <div class="flex items-baseline gap-2">
        @if (prefix) {
          <span class="text-stone-600 dark:text-stone-400 text-xl font-semibold">{{ prefix }}</span>
        }
        <p class="text-4xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
          {{ value | number:format }}
        </p>
        @if (suffix) {
          <span class="text-stone-600 dark:text-stone-400 text-xl font-semibold">{{ suffix }}</span>
        }
      </div>

      <!-- Descripción adicional -->
      @if (description) {
        <p class="text-xs text-stone-400 dark:text-stone-500 mt-3 leading-relaxed">{{ description }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class UiKpiCardComponent {
  @Input() label: string = '';
  @Input() subtitle?: string;
  @Input() value: number = 0;
  @Input() format: string = '1.0-0'; // Formato de número: '1.2-2' para decimales, '1.0-0' para enteros
  @Input() prefix?: string; // Ej: 'S/', '$'
  @Input() suffix?: string; // Ej: '%', 'kg'
  @Input() icon: string = 'analytics'; // Material icon name
  @Input() trend: 'up' | 'down' | 'stable' = 'stable';
  @Input() change: number | null = null; // Porcentaje de cambio vs período anterior
  @Input() description?: string;
}
