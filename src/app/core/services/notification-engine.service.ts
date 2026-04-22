import { Injectable, inject, Injector, effect, runInInjectionContext } from '@angular/core';
import { ProductService } from './product.service';
import { SalesService } from './sales.service';
import { NotificationService } from './notification.service';

/**
 * 🧠 NotificationEngineService
 * 
 * Escucha los signals de ProductService y SalesService
 * y genera notificaciones inteligentes automáticamente.
 * No tiene backend — analiza datos que ya están en memoria.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationEngineService {
  private products = inject(ProductService);
  private sales = inject(SalesService);
  private notifications = inject(NotificationService);
  private injector = inject(Injector);

  private initialized = false;

  /** Call once from MainLayout to start the engine */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Effects need injection context — use runInInjectionContext
    runInInjectionContext(this.injector, () => {
      this.setupStockAlerts();
      this.setupSalesAlerts();
      this.setupProductPerformance();
    });
  }

  // ─── 🔴 CRITICAL: Stock Alerts ─────────────────────────────
  private setupStockAlerts() {
    effect(() => {
      const outOfStock = this.products.outOfStockProducts();
      const lowStock = this.products.lowStockProducts();
      const isLoading = this.products.isLoading();

      // Don't fire while still loading data
      if (isLoading) return;

      // Out of stock — CRITICAL 🔴
      if (outOfStock.length > 0) {
        const names = outOfStock.slice(0, 3).map(p => p.name).join(', ');
        const extra = outOfStock.length > 3 ? ` y ${outOfStock.length - 3} más` : '';
        
        this.notifications.error(
          'Productos sin stock',
          `${outOfStock.length} producto${outOfStock.length > 1 ? 's' : ''} agotado${outOfStock.length > 1 ? 's' : ''}: ${names}${extra}`,
          { 
            category: 'stock', 
            actionLabel: 'Ver inventario', 
            actionRoute: '/inventario/productos',
            dedupeKey: `out-of-stock-${outOfStock.length}`
          }
        );
      }

      // Low stock — IMPORTANT ⚠️
      if (lowStock.length > 0) {
        const names = lowStock.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ');
        const extra = lowStock.length > 3 ? ` y ${lowStock.length - 3} más` : '';

        this.notifications.warning(
          'Stock bajo',
          `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} por debajo del mínimo: ${names}${extra}`,
          { 
            category: 'stock', 
            priority: 'important',
            actionLabel: 'Ver inventario', 
            actionRoute: '/inventario/productos',
            dedupeKey: `low-stock-${lowStock.length}`
          }
        );
      }
    });
  }

  // ─── 🟡 IMPORTANT: Sales Alerts ────────────────────────────
  private setupSalesAlerts() {
    effect(() => {
      const todaySales = this.sales.todaySales();
      const todayRevenue = this.sales.todayRevenue();
      const allSales = this.sales.sales();
      const isLoading = this.sales.isLoading();

      if (isLoading) return;

      // Daily summary — only if there are sales
      if (todaySales.length > 0) {
        this.notifications.success(
          'Ventas de hoy',
          `${todaySales.length} venta${todaySales.length > 1 ? 's' : ''} — S/ ${todayRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
          { 
            category: 'sales',
            actionLabel: 'Ver historial',
            actionRoute: '/sales',
            dedupeKey: `today-sales-${new Date().toDateString()}`
          }
        );
      }

      // No sales yesterday alert
      if (allSales.length > 0) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterdaySales = allSales.filter(s => {
          const d = new Date(s.date);
          return d >= yesterday && d < today;
        });

        if (yesterdaySales.length === 0) {
          this.notifications.warning(
            'Sin ventas ayer',
            'No se registró ninguna venta ayer. Revisa si hay algún problema.',
            { 
              category: 'sales',
              priority: 'important',
              actionLabel: 'Ver reportes',
              actionRoute: '/reports',
              dedupeKey: `no-sales-${yesterday.toDateString()}`
            }
          );
        }
      }
    });
  }

  // ─── 🟢 INFO: Product Performance ─────────────────────────
  private setupProductPerformance() {
    effect(() => {
      const topProducts = this.sales.topProducts();
      const isLoading = this.sales.isLoading();

      if (isLoading || topProducts.length === 0) return;

      // Top selling product
      const top = topProducts[0];
      if (top && top.quantity >= 5) {
        this.notifications.info(
          'Producto estrella',
          `"${top.name}" lleva ${top.quantity} und. vendidas — S/ ${top.revenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
          { 
            category: 'sales',
            actionLabel: 'Ver reportes',
            actionRoute: '/reports',
            dedupeKey: `top-product-${top.name}`
          }
        );
      }
    });
  }
}
