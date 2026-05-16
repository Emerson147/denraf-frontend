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
    <div class="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-1.5 transition-all duration-100 relative">
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

      <!-- Custom Date Button -->
      <button
        (click)="toggleCustomDate()"
        [class]="selectedPeriod() === 'custom' ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'"
        class="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100 touch-manipulation min-h-[44px] sm:min-h-[36px] flex items-center justify-center"
        title="Rango Personalizado"
      >
        <span class="material-symbols-outlined text-[18px]">calendar_month</span>
      </button>

      <!-- Date Picker Overlay -->
      @if (showCustomPicker()) {
        <div class="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 z-50 flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-top-2">
           <div class="flex flex-col gap-1">
             <label class="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-1">Inicio</label>
             <input type="date" [value]="customStartDate()" (change)="onCustomDateChange($event, 'start')" class="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border-none text-sm dark:text-stone-100 outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer">
           </div>
           <div class="flex flex-col gap-1">
             <label class="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-1">Fin</label>
             <input type="date" [value]="customEndDate()" (change)="onCustomDateChange($event, 'end')" class="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border-none text-sm dark:text-stone-100 outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer">
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.6;
      transition: 0.2s;
    }
    input[type="date"]::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }
  `]
})
export class PeriodSelectorComponent {
  selectedPeriod = signal<PeriodOption>('week');
  periodChange = output<Period>();

  showCustomPicker = signal(false);
  
  // Initialize with current date in YYYY-MM-DD format
  private today = new Date().toISOString().split('T')[0];
  customStartDate = signal<string>(this.today);
  customEndDate = signal<string>(this.today);

  options = [
    { value: 'today' as PeriodOption, label: 'Hoy', shortLabel: 'Hoy' },
    { value: 'week' as PeriodOption, label: 'Esta Semana', shortLabel: 'Semana' },
    { value: 'month' as PeriodOption, label: 'Este Mes', shortLabel: 'Mes' }
  ];

  selectPeriod(option: PeriodOption) {
    this.selectedPeriod.set(option);
    this.showCustomPicker.set(false);
    
    if (option !== 'custom') {
      const period = this.calculatePeriod(option);
      this.periodChange.emit(period);
    }
  }

  toggleCustomDate() {
    this.showCustomPicker.update(v => !v);
    if (this.showCustomPicker() && this.selectedPeriod() !== 'custom') {
      this.selectedPeriod.set('custom');
      this.emitCustomPeriod();
    }
  }

  onCustomDateChange(event: Event, type: 'start' | 'end') {
    const input = event.target as HTMLInputElement;
    if (type === 'start') {
      this.customStartDate.set(input.value);
    } else {
      this.customEndDate.set(input.value);
    }
    this.selectedPeriod.set('custom');
    this.emitCustomPeriod();
  }

  private emitCustomPeriod() {
    const start = new Date(this.customStartDate() + 'T00:00:00');
    const end = new Date(this.customEndDate() + 'T23:59:59');
    this.periodChange.emit({
      option: 'custom',
      label: 'Personalizado',
      startDate: start,
      endDate: end
    });
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
        // Not used directly from options anymore, but kept for type safety
        return { option, label: 'Personalizado', startDate: new Date(this.customStartDate() + 'T00:00:00'), endDate: new Date(this.customEndDate() + 'T23:59:59') };
    }
  }
}
