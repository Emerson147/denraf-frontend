import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
    // Ruta publica  (Login) - Fuera del Layout
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page/login-page.component').then(m => m.LoginPageComponent)
  },

  // Ruta privada (Dashboard) - Dentro del Layout
  {
    path: '',
    component: MainLayoutComponent, // Este tiene el sidebar
    canActivate: [authGuard],
    children: [
      {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
      // Aquí cargaremos tus páginas luego. Por ahora, un placeholder.
      { 
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-page.component').then(m => m.DashboardPageComponent),
        canActivate: [adminGuard],
        data: { preload: true, preloadDelay: 0 }
      },
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventory/inventory-layout.component').then(m => m.InventoryLayoutComponent),
        children: [
          {
            path: 'productos',
            loadComponent: () => import('./features/inventory/productos-page/productos-page.component').then(m => m.ProductosPageComponent)
          },
          {
            path: 'analisis',
            canActivate: [adminGuard],
            loadComponent: () => import('./features/inventory/analisis-page/analisis-page.component').then(m => m.AnalisisPageComponent)
          },
          {
            path: 'compras',
            canActivate: [adminGuard],
            loadComponent: () => import('./features/inventory/inventory-movements/inventory-movements.component').then(m => m.InventoryMovementsComponent)
          },
          {
            path: '',
            redirectTo: 'productos',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'pos', // punto de venta
        loadComponent: () => import('./features/pos/pos-page/pos-page.component').then(m => m.PosPageComponent),
        data: { preload: true, preloadDelay: 2000 } // 🚀 Precarga en 2s (high priority)
      },
      {
        path: 'clients', // clientes
        loadComponent: () => import('./features/clients/clients-page.component').then(m => m.ClientsPageComponent)
      },
      {
        path: 'reports',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/reports/reports-page.component').then(m => m.ReportsPageComponent),
        data: { preload: true, preloadDelay: 5000 }
      },
      {
        path: 'sales',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/sales/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
      },
      {
        path: 'goals',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/goals/goals-page.component').then(m => m.GoalsPageComponent)
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/users-page.component').then(m => m.UsersPageComponent)
      },
      {
        path: 'notifications', // centro de notificaciones
        loadComponent: () => import('./features/notifications/notifications-page.component').then(m => m.NotificationsPageComponent)
      },
      {
        path: 'settings',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/settings/settings-page.component').then(m => m.SettingsPageComponent)
      }           
    ]
  },

  // Redireccion por defecto(si entran a una ruta rara lo mandan al login)
  {path: '', redirectTo: 'login', pathMatch: 'full'},

  // Ruta de error (404)
  {path: '**', redirectTo: 'login', pathMatch: 'full'},
];