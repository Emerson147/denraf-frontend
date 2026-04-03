import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorHandlerService, ErrorLog } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-ui-error-logger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Botón flotante para abrir logger (solo visible si hay errores) -->
    @if (hasErrors()) {
      <button
        (click)="showLogger.set(!showLogger())"
        class="fixed bottom-24 right-6 w-12 h-12 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center z-30 hover:bg-red-600 transition-colors"
        title="Ver errores del sistema"
      >
        <span class="material-icons-outlined text-xl">bug_report</span>
        <div class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full flex items-center justify-center">
          {{ errorCount() }}
        </div>
      </button>
    }

    <!-- Panel de logs -->
    @if (showLogger()) {
      <div class="fixed inset-0 z-50 flex items-end md:items-center md:justify-end p-4">
        <!-- Overlay -->
        <div 
          (click)="showLogger.set(false)"
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        ></div>
        
        <!-- Panel -->
        <div class="relative w-full md:w-[600px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col">
          <!-- Header -->
          <div class="p-5 border-b border-stone-200 bg-red-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span class="material-icons-outlined text-white text-xl">bug_report</span>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-stone-800">Error Logger</h2>
                  <p class="text-xs text-stone-500">
                    {{ errorCount() }} {{ errorCount() === 1 ? 'error' : 'errores' }} en esta sesión
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button
                  (click)="clearLogs()"
                  class="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Limpiar
                </button>
                <button
                  (click)="exportLogs()"
                  class="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Exportar
                </button>
                <button
                  (click)="showLogger.set(false)"
                  class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
                >
                  <span class="material-icons-outlined text-stone-500">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-stone-200">
            <button
              (click)="activeTab.set('session')"
              [class.border-red-500]="activeTab() === 'session'"
              [class.text-red-600]="activeTab() === 'session'"
              [class.text-stone-500]="activeTab() !== 'session'"
              class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
            >
              Sesión ({{ sessionLogs().length }})
            </button>
            <button
              (click)="activeTab.set('critical')"
              [class.border-red-500]="activeTab() === 'critical'"
              [class.text-red-600]="activeTab() === 'critical'"
              [class.text-stone-500]="activeTab() !== 'critical'"
              class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
            >
              Críticos ({{ criticalLogs().length }})
            </button>
          </div>

          <!-- Logs list -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            @if (displayLogs().length === 0) {
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <span class="material-icons-outlined text-green-500 text-3xl">check_circle</span>
                </div>
                <p class="text-stone-500 text-sm">No hay errores</p>
                <p class="text-stone-400 text-xs mt-1">Todo funcionando correctamente</p>
              </div>
            } @else {
              @for (log of displayLogs(); track log.timestamp) {
                <div 
                  [class.bg-red-50]="log.severity === 'critical'"
                  [class.bg-orange-50]="log.severity === 'high'"
                  [class.bg-yellow-50]="log.severity === 'medium'"
                  [class.bg-stone-50]="log.severity === 'low'"
                  class="p-3 rounded-lg border transition-all hover:shadow-sm"
                  [class.border-red-200]="log.severity === 'critical'"
                  [class.border-orange-200]="log.severity === 'high'"
                  [class.border-yellow-200]="log.severity === 'medium'"
                  [class.border-stone-200]="log.severity === 'low'"
                >
                  <div class="flex items-start gap-2">
                    <!-- Severity icon -->
                    <span 
                      class="material-icons-outlined text-lg shrink-0"
                      [class.text-red-500]="log.severity === 'critical'"
                      [class.text-orange-500]="log.severity === 'high'"
                      [class.text-yellow-600]="log.severity === 'medium'"
                      [class.text-stone-400]="log.severity === 'low'"
                    >
                      {{ getSeverityIcon(log.severity) }}
                    </span>
                    
                    <div class="flex-1 min-w-0">
                      <!-- Context -->
                      @if (log.context) {
                        <p class="text-xs font-medium text-stone-500 mb-1">
                          {{ log.context }}
                        </p>
                      }
                      
                      <!-- Message -->
                      <p class="text-sm font-medium text-stone-800 break-words">
                        {{ log.message }}
                      </p>
                      
                      <!-- Timestamp -->
                      <p class="text-xs text-stone-400 mt-1">
                        {{ formatTimestamp(log.timestamp) }}
                      </p>
                      
                      <!-- Stack trace (expandable) -->
                      @if (log.stack) {
                        <details class="mt-2">
                          <summary class="text-xs text-stone-500 cursor-pointer hover:text-stone-700">
                            Ver stack trace
                          </summary>
                          <pre class="mt-2 p-2 bg-stone-900 text-green-400 text-xs rounded overflow-x-auto">{{ log.stack }}</pre>
                        </details>
                      }
                    </div>
                    
                    <!-- Severity badge -->
                    <span 
                      class="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                      [class.bg-red-500]="log.severity === 'critical'"
                      [class.bg-orange-500]="log.severity === 'high'"
                      [class.bg-yellow-500]="log.severity === 'medium'"
                      [class.bg-stone-400]="log.severity === 'low'"
                      class="text-white"
                    >
                      {{ log.severity.toUpperCase() }}
                    </span>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    details summary {
      list-style: none;
    }
    details summary::-webkit-details-marker {
      display: none;
    }
  `]
})
export class UiErrorLoggerComponent {
  private errorHandler = inject(ErrorHandlerService);
  
  showLogger = signal(false);
  activeTab = signal<'session' | 'critical'>('session');
  
  sessionLogs = computed(() => this.errorHandler.getSessionLogs());
  criticalLogs = computed(() => this.errorHandler.getCriticalLogs());
  
  displayLogs = computed(() => {
    return this.activeTab() === 'session' 
      ? this.sessionLogs() 
      : this.criticalLogs();
  });
  
  errorCount = computed(() => this.sessionLogs().length);
  hasErrors = computed(() => this.errorCount() > 0);

  getSeverityIcon(severity: ErrorLog['severity']): string {
    const icons = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'bug_report'
    };
    return icons[severity];
  }

  formatTimestamp(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  }

  clearLogs(): void {
    if (confirm('¿Seguro que quieres limpiar todos los logs?')) {
      this.errorHandler.clearSessionLogs();
      if (this.activeTab() === 'critical') {
        this.errorHandler.clearCriticalLogs();
      }
    }
  }

  exportLogs(): void {
    const logs = this.errorHandler.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
