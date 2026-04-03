import { Component, inject, signal, AfterViewInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth';
import { ThemeService } from '../core/theme/theme.service';
import { UiToastComponent } from '../shared/ui/ui-toast/ui-toast.component';
import { UiNotificationCenterComponent } from '../shared/ui/ui-notification-center/ui-notification-center.component';
import { ConnectionStatusComponent } from '../shared/ui/connection-status/connection-status.component';
import { PwaInstallPromptComponent } from '../shared/ui/pwa-install-prompt/pwa-install-prompt.component';
import { UiErrorLoggerComponent } from '../shared/ui/ui-error-logger/ui-error-logger.component';
import { SyncIndicatorComponent } from '../shared/ui/sync-indicator/sync-indicator.component';
import { ClickOutsideDirective } from '../shared/directives/click-outside/click-outside.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    UiToastComponent,
    UiNotificationCenterComponent,
    ConnectionStatusComponent,
    PwaInstallPromptComponent,
    UiErrorLoggerComponent,
    SyncIndicatorComponent
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements AfterViewInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  themeService = inject(ThemeService);
  
  // Estado del sidebar (colapsado o expandido en desktop)
  sidebarCollapsed = signal(false);
  
  // Estado del sidebar móvil (abierto o cerrado)
  mobileMenuOpen = signal(false);

  // Estado del submenu de inventario
  inventorySubmenuOpen = signal(false);

  // Control de visibilidad de botones flotantes
  floatingButtonsVisible = signal(true);
  private scrollTimeout: any;
  private scrollListener?: () => void;

  // Estado del menu de usuario
  userMenuOpen = signal(false);

  ngAfterViewInit() {
    // Esperar un tick para que el DOM esté listo
    const timeoutId = setTimeout(() => {
      const mainContent = document.querySelector('main .overflow-y-auto') as HTMLElement;
      if (mainContent) {
        this.scrollListener = () => this.handleScroll(mainContent);
        mainContent.addEventListener('scroll', this.scrollListener);
        
        // 🧹 Cleanup automático con DestroyRef
        this.destroyRef.onDestroy(() => {
          mainContent.removeEventListener('scroll', this.scrollListener!);
          if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
          }
        });
      }
    }, 100);
    
    // 🧹 Limpiar el timeout inicial también
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  private handleScroll(element: HTMLElement) {
    const scrollTop = element.scrollTop;
    
    // Fade out cuando se hace scroll (más de 80px)
    if (scrollTop > 80) {
      this.floatingButtonsVisible.set(false);
    } else {
      this.floatingButtonsVisible.set(true);
    }

    // Limpiar timeout anterior
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Mostrar botones temporalmente cuando se detiene el scroll
    this.scrollTimeout = setTimeout(() => {
      if (scrollTop > 80) {
        this.floatingButtonsVisible.set(true);
        // Volver a ocultar después de 2 segundos
        const hideTimeoutId = setTimeout(() => {
          const currentScroll = element.scrollTop;
          if (currentScroll > 80) {
            this.floatingButtonsVisible.set(false);
          }
        }, 2000);
        // Aunque este se limpia solo, buena práctica almacenarlo por si acaso
      }
    }, 150);
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(val => !val);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(val => !val);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  toggleInventorySubmenu() {
    this.inventorySubmenuOpen.update(val => !val);
  }

  toggleUserMenu() {
    this.userMenuOpen.update(val => !val);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  switchUser(userId: string) {
    this.authService.switchUser(userId);
    this.closeUserMenu();
  }

  logout() {
    this.closeMobileMenu();
    this.closeUserMenu();
    this.authService.logout(); // Llamamos al metodo que borra y dirige
  }
}