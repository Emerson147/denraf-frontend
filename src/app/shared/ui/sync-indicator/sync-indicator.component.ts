import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncService } from '../../../core/services/sync.service';

/**
 * 🔄 Sync Indicator Component
 * 
 * Indicador minimalista de estado de sincronización con Supabase
 * - Muestra estado: Online/Offline/Sincronizando/Pendientes
 * - Animación sutil cuando está sincronizando
 * - Click para forzar sincronización manual
 */
@Component({
  selector: 'app-sync-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl
             bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700
             shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl
             cursor-pointer group"
      [class.animate-pulse]="syncService.isSyncing()"
      (click)="handleClick()"
      [title]="tooltipText()"
    >
      <!-- Icono de estado -->
      <div class="relative">
        <span 
          class="material-icons-outlined text-[18px] transition-colors duration-300"
          [class.text-emerald-500]="syncService.isOnline() && !syncService.isSyncing() && !syncService.hasPending()"
          [class.text-blue-500]="syncService.isSyncing()"
          [class.text-amber-500]="syncService.hasPending() && !syncService.isSyncing()"
          [class.text-stone-400]="!syncService.isOnline()"
        >
          {{ getIcon() }}
        </span>
        
        <!-- Dot indicator animado cuando está sincronizando -->
        @if (syncService.isSyncing()) {
          <span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
          <span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500"></span>
        }
        
        <!-- Badge con pendientes -->
        @if (syncService.hasPending() && !syncService.isSyncing()) {
          <span class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
            {{ syncService.pendingCount() }}
          </span>
        }
      </div>
      
      <!-- Texto de estado -->
      <div class="flex flex-col">
        <span class="text-xs font-medium text-stone-700 dark:text-stone-300">
          {{ syncService.statusText() }}
        </span>
        @if (syncService.lastSyncAt()) {
          <span class="text-[10px] text-stone-400 dark:text-stone-500">
            {{ formatLastSync() }}
          </span>
        }
      </div>
      
      <!-- Icono de acción (solo visible en hover) -->
      <span 
        class="material-icons-outlined text-[16px] text-stone-400 dark:text-stone-500 
               opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        refresh
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class SyncIndicatorComponent {
  syncService = inject(SyncService);

  tooltipText = computed(() => {
    if (this.syncService.isSyncing()) {
      return 'Sincronizando con Supabase...';
    }
    if (!this.syncService.isOnline()) {
      return 'Sin conexión - Trabajando offline';
    }
    if (this.syncService.hasPending()) {
      return `${this.syncService.pendingCount()} cambios pendientes - Click para sincronizar`;
    }
    return 'Todo sincronizado - Click para actualizar';
  });

  getIcon(): string {
    if (this.syncService.isSyncing()) {
      return 'sync';
    }
    if (!this.syncService.isOnline()) {
      return 'cloud_off';
    }
    if (this.syncService.hasPending()) {
      return 'cloud_upload';
    }
    return 'cloud_done';
  }

  formatLastSync(): string {
    const lastSync = this.syncService.lastSyncAt();
    if (!lastSync) return '';

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSync.getTime()) / 1000); // segundos

    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return 'hace más de 1 día';
  }

  handleClick(): void {
    if (!this.syncService.isSyncing()) {
      console.log('🔄 Sincronización manual iniciada');
      this.syncService.syncAll();
    }
  }
}
