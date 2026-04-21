import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Indicador de conexión minimalista -->
    <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      
      <!-- Badge de estado online/offline -->
      @if (!isOnline()) {
        <div 
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg backdrop-blur-sm transition-all duration-300"
        >
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-stone-900 dark:text-stone-100">Modo Offline</span>
          </div>
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
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  showToast = signal(false);

  @HostListener('window:online')
  onOnline() {
    this.isOnline.set(true);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  @HostListener('window:offline')
  onOffline() {
    this.isOnline.set(false);
  }
}
