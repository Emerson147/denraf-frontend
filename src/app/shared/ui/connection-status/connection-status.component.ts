import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../core/services/offline.service';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Indicador de conexión minimalista -->
    <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      
      <!-- Badge de estado online/offline -->
      @if (!offlineService.isOnline()) {
        <div 
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg backdrop-blur-sm transition-all duration-300"
        >
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-stone-900 dark:text-stone-100">Modo Offline</span>
            @if (offlineService.pendingSync() > 0) {
              <span class="text-[10px] text-stone-500 dark:text-stone-400">
                {{ offlineService.pendingSync() }} {{ offlineService.pendingSync() === 1 ? 'operación' : 'operaciones' }} pendientes
              </span>
            }
          </div>
        </div>
      }

      <!-- Notificación de sincronización -->
      @if (offlineService.isOnline() && offlineService.pendingSync() > 0) {
        <div 
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg backdrop-blur-sm transition-all duration-300"
        >
          <span class="material-icons-outlined text-sm animate-spin">sync</span>
          <span class="text-xs font-medium">Sincronizando...</span>
        </div>
      }

    </div>

    <!-- Toast de reconexión (solo aparece 3 segundos) -->
    @if (showToast()) {
      <div 
        class="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white shadow-xl backdrop-blur-sm border border-emerald-400 flex items-center gap-3 animate-slide-in-right"
      >
        <span class="material-icons-outlined text-lg">cloud_done</span>
        <div>
          <p class="text-sm font-medium">Conexión restaurada</p>
          <p class="text-xs opacity-90">Sincronizando datos...</p>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-in-right {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .animate-slide-in-right {
      animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `]
})
export class ConnectionStatusComponent {
  offlineService = inject(OfflineService);
  showToast = signal(false);
  private wasOffline = false;
  
  constructor() {
    // Detectar cuando vuelve la conexión (solo al cambiar de offline a online)
    effect(() => {
      const isOnline = this.offlineService.isOnline();
      
      // Solo mostrar toast si CAMBIÓ de offline a online
      if (isOnline && this.wasOffline) {
        this.showToast.set(true);
        setTimeout(() => {
          this.showToast.set(false);
        }, 3000);
      }
      
      // Actualizar estado anterior
      this.wasOffline = !isOnline;
    });
  }
}
