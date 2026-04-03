import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PeriodOption = 'today' | 'week' | 'month' | 'custom';

export interface Period {
  option: PeriodOption;
  label: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-1.5 transition-all duration-100">
      @for (option of options; track option.value) {
        <button
          (click)="selectPeriod(option.value)"
          [class]="getButtonClass(option.value)"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-100 touch-manipulation min-h-[44px] sm:min-h-[36px]"
        >
          <span class="hidden sm:inline">{{ option.label }}</span>
          <span class="sm:hidden">{{ option.shortLabel }}</span>
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
export class PeriodSelectorComponent {
  selectedPeriod = signal<PeriodOption>('week');
  periodChange = output<Period>();

  options = [
    { value: 'today' as PeriodOption, label: 'Hoy', shortLabel: 'Hoy' },
    { value: 'week' as PeriodOption, label: 'Esta Semana', shortLabel: 'Semana' },
    { value: 'month' as PeriodOption, label: 'Este Mes', shortLabel: 'Mes' }
  ];

  selectPeriod(option: PeriodOption) {
    this.selectedPeriod.set(option);
    const period = this.calculatePeriod(option);
    this.periodChange.emit(period);
  }

  getButtonClass(option: PeriodOption): string {
    const isSelected = this.selectedPeriod() === option;
    return isSelected
      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800';
  }

  private calculatePeriod(option: PeriodOption): Period {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (option) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        return { option, label: 'Hoy', startDate, endDate };

      case 'week':
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        return { option, label: 'Esta Semana', startDate, endDate };

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        return { option, label: 'Este Mes', startDate, endDate };

      case 'custom':
        // Por ahora retorna la semana actual, se puede extender con un date picker
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date();
        return { option, label: 'Personalizado', startDate, endDate };
    }
  }
}
