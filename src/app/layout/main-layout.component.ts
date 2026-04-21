import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BackendAuthService } from '../core/services/backend-auth.service';
import { ThemeService } from '../core/theme/theme.service';
import { UiToastComponent } from '../shared/ui/ui-toast/ui-toast.component';
import { UiNotificationCenterComponent } from '../shared/ui/ui-notification-center/ui-notification-center.component';
import { ConnectionStatusComponent } from '../shared/ui/connection-status/connection-status.component';
import { PwaInstallPromptComponent } from '../shared/ui/pwa-install-prompt/pwa-install-prompt.component';
import { UiErrorLoggerComponent } from '../shared/ui/ui-error-logger/ui-error-logger.component';
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
    ClickOutsideDirective
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  authService = inject(BackendAuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  themeService = inject(ThemeService);
  
  // Estado del sidebar (colapsado o expandido en desktop)
  sidebarCollapsed = signal(false);
  
  // Estado del sidebar móvil (abierto o cerrado)
  mobileMenuOpen = signal(false);

  // Estado del submenu de inventario
  inventorySubmenuOpen = signal(false);

  // Estado del menu de usuario
  userMenuOpen = signal(false);

  // Iniciales dinámicas para el usuario logueado
  userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.nombre) return 'SD';
    const parts = user.nombre.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.nombre.substring(0, 2).toUpperCase();
  });

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

  logout() {
    this.closeMobileMenu();
    this.closeUserMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}