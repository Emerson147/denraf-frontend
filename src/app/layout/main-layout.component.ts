import { Component, inject, signal, computed } from '@angular/core';
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

// ─── Interfaces ──────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  tooltip?: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

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
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  authService = inject(BackendAuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  
  // ─── State ──────────────────────────────────────────────────
  sidebarCollapsed = signal(false);
  moreSheetOpen = signal(false);
  inventorySubmenuOpen = signal(false);
  userMenuOpen = signal(false);

  // ─── Desktop Navigation Config (Single Source of Truth) ─────
  navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/', exact: true, tooltip: 'Dashboard' },
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { label: 'Punto de Venta', icon: 'point_of_sale', route: '/pos', tooltip: 'Punto de Venta' },
        { label: 'Historial', icon: 'receipt_long', route: '/sales', tooltip: 'Historial de Ventas' },
      ]
    },
    {
      title: 'Gestión',
      items: [
        {
          label: 'Inventario', icon: 'checkroom', route: '/inventario', tooltip: 'Inventario',
          children: [
            { label: 'Productos', icon: 'inventory_2', route: '/inventario/productos' },
            { label: 'Análisis', icon: 'analytics', route: '/inventario/analisis' },
            { label: 'Compras', icon: 'shopping_cart', route: '/inventario/compras', tooltip: 'Compras de Inventario' },
          ]
        },
        { label: 'Clientes', icon: 'person_search', route: '/clients', tooltip: 'Clientes' },
      ]
    },
    {
      title: 'Análisis',
      items: [
        { label: 'Reportes', icon: 'bar_chart', route: '/reports', tooltip: 'Reportes' },
        { label: 'Metas', icon: 'emoji_events', route: '/goals', tooltip: 'Metas y Logros' },
      ]
    },
    {
      title: 'Administración',
      items: [
        { label: 'Usuarios', icon: 'manage_accounts', route: '/users', tooltip: 'Gestión de Usuarios', adminOnly: true },
      ]
    }
  ];

  // ─── Mobile Bottom Tab Bar (4 primary + "Más") ──────────────
  readonly bottomTabs: NavItem[] = [
    { label: 'Home', icon: 'dashboard', route: '/', exact: true },
    { label: 'POS', icon: 'point_of_sale', route: '/pos' },
    { label: 'Inventario', icon: 'checkroom', route: '/inventario/productos' },
    { label: 'Reportes', icon: 'bar_chart', route: '/reports' },
  ];

  // ─── "Más" Sheet Items (everything not in bottomTabs) ───────
  moreSheetItems = computed(() => {
    const isAdmin = this.authService.currentUser()?.rol === 'ADMIN';
    const items: NavItem[] = [
      { label: 'Clientes', icon: 'person_search', route: '/clients' },
      { label: 'Historial de Ventas', icon: 'receipt_long', route: '/sales' },
      { label: 'Análisis Inventario', icon: 'analytics', route: '/inventario/analisis' },
      { label: 'Compras', icon: 'shopping_cart', route: '/inventario/compras' },
      { label: 'Metas y Logros', icon: 'emoji_events', route: '/goals' },
    ];
    if (isAdmin) {
      items.push({ label: 'Usuarios', icon: 'manage_accounts', route: '/users' });
    }
    return items;
  });

  // ─── Computed ───────────────────────────────────────────────
  /** Filter sections based on user role */
  visibleSections = computed(() => {
    const isAdmin = this.authService.currentUser()?.rol === 'ADMIN';
    return this.navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => !item.adminOnly || isAdmin)
      }))
      .filter(section => section.items.length > 0);
  });

  userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.nombre) return 'SD';
    const parts = user.nombre.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.nombre.substring(0, 2).toUpperCase();
  });

  // ─── Actions ────────────────────────────────────────────────
  toggleSidebar() {
    this.sidebarCollapsed.update(val => !val);
    // Close submenu when collapsing to avoid orphan state
    if (this.sidebarCollapsed()) {
      this.inventorySubmenuOpen.set(false);
    }
  }

  toggleMoreSheet() {
    this.moreSheetOpen.update(val => !val);
  }

  closeMoreSheet() {
    this.moreSheetOpen.set(false);
  }

  navigateFromMore(route: string) {
    this.closeMoreSheet();
    this.router.navigate([route]);
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
    this.closeMoreSheet();
    this.closeUserMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}