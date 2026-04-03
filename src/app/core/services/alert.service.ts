import { Injectable, inject, effect } from '@angular/core';
import { SalesService } from './sales.service';
import { ProductService } from './product.service';
import { NotificationService } from './notification.service';
import { AnalyticsService } from './analytics.service';

/**
 * 🚨 AlertService - Sistema de alertas inteligentes
 * 
 * Monitorea automáticamente:
 * - Días sin ventas
 * - Metas semanales (alcanzadas/no alcanzadas)
 * - Productos sin movimiento
 * 
 * Se integra con NotificationService para mostrar alertas
 */
@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private salesService = inject(SalesService);
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);
  private analyticsService = inject(AnalyticsService);

  // Configuración de alertas
  private readonly WEEKLY_SALES_GOAL = 5000; // Meta semanal en soles
  private readonly NO_MOVEMENT_DAYS = 30; // Días sin movimiento para alertar
  private readonly NO_SALES_DAYS = 1; // Días sin ventas para alertar

  constructor() {
    // Monitorear cambios en ventas para detectar alertas
    effect(() => {
      const sales = this.salesService.sales();
      if (sales.length > 0) {
        this.checkAlerts();
      }
    });
  }

  /**
   * Verifica todas las alertas
   */
  private checkAlerts() {
    this.checkNoSalesDays();
    this.checkWeeklyGoal();
    this.checkProductsWithoutMovement();
  }

  /**
   * 🚨 Alerta: Días sin ventas
   * Detecta si ha pasado más de 1 día sin ventas
   */
  private checkNoSalesDays() {
    const sales = this.salesService.sales();
    if (sales.length === 0) return;

    const lastSale = sales[0]; // Las ventas están ordenadas por fecha desc
    const lastSaleDate = new Date(lastSale.date);
    const now = new Date();
    const daysSinceLastSale = Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));

    // Si han pasado más de 1 día sin ventas, alertar
    if (daysSinceLastSale >= this.NO_SALES_DAYS) {
      const key = `no-sales-${lastSaleDate.toDateString()}`;
      if (!this.wasAlertSent(key)) {
        this.notificationService.warning(
          '⏰ Sin Ventas Recientes',
          `Han pasado ${daysSinceLastSale} día(s) sin registrar ventas. Última venta: ${this.formatDate(lastSaleDate)}`,
          {
            actionLabel: 'Ver Historial',
            actionRoute: '/ventas/historial'
          }
        );
        this.markAlertAsSent(key);
      }
    }
  }

  /**
   * 🎯 Alerta: Meta semanal
   * Verifica si se alcanzó la meta de ventas semanales
   * Se envía los lunes temprano
   */
  private checkWeeklyGoal() {
    const today = new Date();
    const isMonday = today.getDay() === 1;
    const isEarlyMorning = today.getHours() < 12;

    // Solo revisar los lunes en la mañana
    if (!isMonday || !isEarlyMorning) return;

    // Calcular ingresos semanales directamente
    const weeklyRevenue = this.salesService.weeklyRevenue();
    const goalReached = weeklyRevenue >= this.WEEKLY_SALES_GOAL;
    const percentage = ((weeklyRevenue / this.WEEKLY_SALES_GOAL) * 100).toFixed(1);

    const weekKey = `weekly-goal-${this.getWeekKey()}`;
    if (!this.wasAlertSent(weekKey)) {
      if (goalReached) {
        this.notificationService.success(
          '🎉 ¡Meta Alcanzada!',
          `Excelente semana. Lograste S/ ${weeklyRevenue.toFixed(0)} de tu meta de S/ ${this.WEEKLY_SALES_GOAL}`,
          {
            actionLabel: 'Ver Dashboard',
            actionRoute: '/dashboard'
          }
        );
      } else {
        this.notificationService.warning(
          '📊 Meta No Alcanzada',
          `Esta semana alcanzaste el ${percentage}% de tu meta (S/ ${weeklyRevenue.toFixed(0)} / S/ ${this.WEEKLY_SALES_GOAL})`,
          {
            actionLabel: 'Ver Análisis',
            actionRoute: '/reportes/analisis'
          }
        );
      }
      this.markAlertAsSent(weekKey);
    }
  }

  /**
   * 📦 Alerta: Productos sin movimiento
   * Detecta productos que no se han vendido en X días
   */
  private checkProductsWithoutMovement() {
    const products = this.productService.products();
    const sales = this.salesService.sales();
    const now = new Date();

    const productsWithoutMovement = products.filter(product => {
      // Buscar la última venta de este producto
      const lastSaleWithProduct = sales.find(sale => 
        sale.items.some(item => item.productId === product.id)
      );

      if (!lastSaleWithProduct) {
        // Producto nunca vendido, verificar si fue creado hace más de X días
        const createdDate = new Date(product.createdAt || product.id);
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated >= this.NO_MOVEMENT_DAYS;
      }

      // Producto vendido antes, verificar última venta
      const lastSaleDate = new Date(lastSaleWithProduct.date);
      const daysSinceLastSale = Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastSale >= this.NO_MOVEMENT_DAYS;
    });

    // Si hay productos sin movimiento, alertar (máximo 1 vez por semana)
    if (productsWithoutMovement.length > 0) {
      const weekKey = `no-movement-${this.getWeekKey()}`;
      if (!this.wasAlertSent(weekKey)) {
        const topProducts = productsWithoutMovement.slice(0, 3).map(p => p.name).join(', ');
        this.notificationService.info(
          '📦 Productos Sin Movimiento',
          `${productsWithoutMovement.length} producto(s) sin ventas en ${this.NO_MOVEMENT_DAYS}+ días: ${topProducts}`,
          {
            actionLabel: 'Ver Inventario',
            actionRoute: '/inventario'
          }
        );
        this.markAlertAsSent(weekKey);
      }
    }
  }

  /**
   * Verifica si una alerta ya fue enviada
   */
  private wasAlertSent(key: string): boolean {
    const sent = localStorage.getItem(`alert-sent-${key}`);
    return sent === 'true';
  }

  /**
   * Marca una alerta como enviada
   */
  private markAlertAsSent(key: string) {
    localStorage.setItem(`alert-sent-${key}`, 'true');
  }

  /**
   * Obtiene la clave de la semana actual (año-semana)
   */
  private getWeekKey(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber}`;
  }

  /**
   * Formatea una fecha para mostrar
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Limpiar alertas antiguas (llamar periódicamente)
   */
  clearOldAlerts() {
    const keys = Object.keys(localStorage);
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    keys.forEach(key => {
      if (key.startsWith('alert-sent-')) {
        const timestamp = localStorage.getItem(`${key}-timestamp`);
        if (timestamp && parseInt(timestamp) < oneWeekAgo) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}-timestamp`);
        }
      }
    });
  }
}
