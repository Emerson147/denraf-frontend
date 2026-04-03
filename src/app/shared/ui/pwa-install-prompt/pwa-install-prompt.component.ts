import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Banner de instalación PWA - Estilo minimalista zen -->
    @if (showPrompt()) {
      <div 
        class="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up"
      >
        <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl overflow-hidden">
          
          <!-- Header con gradiente sutil -->
          <div class="bg-gradient-to-br from-stone-900 to-stone-800 dark:from-stone-950 dark:to-stone-900 p-6 text-white">
            <div class="flex items-start gap-4">
              <div class="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-3xl border border-white/20">
                📊
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold mb-1">Instalar DenRaf</h3>
                <p class="text-sm text-stone-300 leading-relaxed">
                  Accede más rápido y trabaja sin conexión
                </p>
              </div>
              <button
                (click)="dismissPrompt()"
                class="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span class="material-icons-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          <!-- Features list -->
          <div class="p-6 space-y-3">
            <div class="flex items-center gap-3 text-sm">
              <div class="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <span class="material-icons-outlined text-emerald-600 dark:text-emerald-400 text-base">offline_bolt</span>
              </div>
              <span class="text-stone-700 dark:text-stone-300">Funciona sin internet</span>
            </div>
            
            <div class="flex items-center gap-3 text-sm">
              <div class="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <span class="material-icons-outlined text-blue-600 dark:text-blue-400 text-base">speed</span>
              </div>
              <span class="text-stone-700 dark:text-stone-300">Carga instantánea</span>
            </div>
            
            <div class="flex items-center gap-3 text-sm">
              <div class="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <span class="material-icons-outlined text-purple-600 dark:text-purple-400 text-base">notifications_active</span>
              </div>
              <span class="text-stone-700 dark:text-stone-300">Notificaciones en tiempo real</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="p-6 pt-0 flex gap-3">
            <button
              (click)="dismissPrompt()"
              class="flex-1 px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Ahora no
            </button>
            <button
              (click)="installPWA()"
              class="flex-1 px-4 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-sm hover:bg-black dark:hover:bg-stone-200 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span class="material-icons-outlined text-base">download</span>
              Instalar
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(100px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-slide-up {
      animation: slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `]
})
export class PwaInstallPromptComponent implements OnInit {
  showPrompt = signal(false);
  private deferredPrompt: any = null;

  ngOnInit() {
    // Escuchar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Mostrar el prompt después de 5 segundos (para no ser intrusivo)
      // Solo si el usuario no lo ha rechazado antes
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => {
          this.showPrompt.set(true);
        }, 5000);
      }
    });

    // Detectar si ya está instalada
    window.addEventListener('appinstalled', () => {
      this.showPrompt.set(false);
      this.deferredPrompt = null;
    });
  }

  async installPWA() {
    if (!this.deferredPrompt) return;

    // Mostrar el prompt nativo del navegador
    this.deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalada exitosamente');
    }

    this.deferredPrompt = null;
    this.showPrompt.set(false);
  }

  dismissPrompt() {
    this.showPrompt.set(false);
    // Recordar que el usuario rechazó el prompt (por 7 días)
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-prompt-dismissed', dismissedUntil.toString());
  }
}
