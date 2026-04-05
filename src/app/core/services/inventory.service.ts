import { Injectable, computed, signal, inject } from '@angular/core';
import { SalesService } from './sales.service';
import { ProductService } from './product.service';
import { Product, SaleItem, CapitalHealth, ProductClassification, LiquidationSuggestion } from '../models';

export interface ProductAnalysis {
  product: Product;
  totalSold: number; // Unidades vendidas (últimos 30 días)
  revenue: number; // Ingresos generados
  rotationRate: number; // Tasa de rotación (ventas por día)
  daysUntilStockout: number; // Días hasta agotamiento
  status: 'critical' | 'low' | 'healthy' | 'overstocked';
  demandLevel: 'high' | 'medium' | 'low';
  reorderQuantity: number; // Cantidad sugerida para reorden
}

export interface StockAlert {
  id: string;
  product: Product;
  alertType: 'critical' | 'low' | 'stockout' | 'overstock';
  message: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface InventoryMetrics {
  totalProducts: number;
  totalValue: number; // Valor total del inventario (costo)
  averageRotation: number;
  criticalProducts: number;
  lowStockProducts: number;
  overstockedProducts: number;
  outOfStockProducts: number;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private salesService = inject(SalesService);
  private productService = inject(ProductService);

  // ✅ Umbrales configurables
  private readonly CRITICAL_THRESHOLD = 3;
  private readonly LOW_THRESHOLD = 10;
  private readonly OVERSTOCK_MULTIPLIER = 3;
  private readonly ANALYSIS_DAYS = 30;
  
  // 🆕 Umbrales para modelo de feria
  private readonly DAYS_PER_FAIR = 3.5; // Promedio: 2 ferias por semana
  private readonly FAIRS_FROZEN_THRESHOLD = 8; // >8 ferias = congelado
  private readonly FAIRS_SLOW_THRESHOLD = 4; // 4-8 ferias = lento

  /**
   * Análisis completo de cada producto
   * ✅ SINCRONIZADO con ProductService (fuente única de verdad)
   */
  productAnalytics = computed<ProductAnalysis[]>(() => {
    // ✅ Obtener productos del servicio central (sincronizado con POS)
    const products = this.productService.products();
    const sales = this.salesService.sales();
    const today = new Date();
    const analysisStartDate = new Date(today.getTime() - this.ANALYSIS_DAYS * 24 * 60 * 60 * 1000);

    return products.map((product) => {
      // Filtrar ventas de este producto en el período
      const productSales = sales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return (
          saleDate >= analysisStartDate &&
          (sale.items || []).some((item) => item.productId === product.id)
        );
      });

      // Calcular unidades vendidas y revenue
      let totalSold = 0;
      let revenue = 0;

      productSales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          if (item.productId === product.id) {
            totalSold += item.quantity;
            revenue += item.subtotal;
          }
        });
      });

      // Tasa de rotación (unidades por día)
      const rotationRate = totalSold / this.ANALYSIS_DAYS;

      // Días hasta agotamiento
      const daysUntilStockout =
        rotationRate > 0 ? Math.floor(product.stock / rotationRate) : Infinity;

      // Determinar estado del producto
      let status: ProductAnalysis['status'];
      if (product.stock === 0) {
        status = 'critical';
      } else if (product.stock <= this.CRITICAL_THRESHOLD) {
        status = 'critical';
      } else if (product.stock <= this.LOW_THRESHOLD) {
        status = 'low';
      } else if (product.stock > rotationRate * this.OVERSTOCK_MULTIPLIER && rotationRate > 0) {
        status = 'overstocked';
      } else {
        status = 'healthy';
      }

      // Nivel de demanda
      let demandLevel: ProductAnalysis['demandLevel'];
      if (rotationRate >= 1) {
        demandLevel = 'high'; // Más de 1 unidad por día
      } else if (rotationRate >= 0.3) {
        demandLevel = 'medium'; // Entre 0.3 y 1 por día
      } else {
        demandLevel = 'low'; // Menos de 0.3 por día
      }

      // Cantidad sugerida para reorden
      // Fórmula: (rotación diaria * 30 días) - stock actual
      const monthlyDemand = rotationRate * 30;
      const reorderQuantity = Math.max(0, Math.ceil(monthlyDemand - product.stock));

      return {
        product,
        totalSold,
        revenue,
        rotationRate,
        daysUntilStockout,
        status,
        demandLevel,
        reorderQuantity,
      };
    });
  });

  /**
   * Alertas automáticas de stock
   */
  stockAlerts = computed<StockAlert[]>(() => {
    const analytics = this.productAnalytics();
    const alerts: StockAlert[] = [];

    analytics.forEach((analysis) => {
      const { product, status, daysUntilStockout } = analysis;

      // Alerta de stock crítico
      if (status === 'critical' && product.stock > 0) {
        alerts.push({
          id: `alert-critical-${product.id}`,
          product,
          alertType: 'critical',
          message: `¡Stock crítico! Solo quedan ${product.stock} unidades`,
          priority: 'high',
          createdAt: new Date(),
        });
      }

      // Alerta de agotamiento
      if (product.stock === 0) {
        alerts.push({
          id: `alert-stockout-${product.id}`,
          product,
          alertType: 'stockout',
          message: 'Producto agotado. Reabastecer urgente.',
          priority: 'high',
          createdAt: new Date(),
        });
      }

      // Alerta de stock bajo
      if (status === 'low') {
        alerts.push({
          id: `alert-low-${product.id}`,
          product,
          alertType: 'low',
          message: `Stock bajo. ${daysUntilStockout} días hasta agotamiento`,
          priority: 'medium',
          createdAt: new Date(),
        });
      }

      // Alerta de sobrestock
      if (status === 'overstocked') {
        alerts.push({
          id: `alert-overstock-${product.id}`,
          product,
          alertType: 'overstock',
          message: 'Stock excesivo. Considerar promoción.',
          priority: 'low',
          createdAt: new Date(),
        });
      }
    });

    return alerts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  });

  /**
   * Métricas generales del inventario
   */
  metrics = computed<InventoryMetrics>(() => {
    const analytics = this.productAnalytics();
    const products = this.productService.products();

    const totalValue = products.reduce((sum: number, p: any) => sum + p.cost * p.stock, 0);
    const rotations = analytics.map((a) => a.rotationRate).filter((r) => r > 0);
    const averageRotation =
      rotations.length > 0 ? rotations.reduce((sum, r) => sum + r, 0) / rotations.length : 0;

    return {
      totalProducts: products.length,
      totalValue,
      averageRotation,
      criticalProducts: analytics.filter((a) => a.status === 'critical').length,
      lowStockProducts: analytics.filter((a) => a.status === 'low').length,
      overstockedProducts: analytics.filter((a) => a.status === 'overstocked').length,
      outOfStockProducts: products.filter((p: any) => p.stock === 0).length,
    };
  });

  /**
   * Productos críticos (requieren atención inmediata)
   */
  criticalProducts = computed(() => {
    return this.productAnalytics()
      .filter((a) => a.status === 'critical' || a.product.stock === 0)
      .sort((a, b) => a.product.stock - b.product.stock);
  });

  /**
   * Productos de alta demanda
   */
  highDemandProducts = computed(() => {
    return this.productAnalytics()
      .filter((a) => a.demandLevel === 'high')
      .sort((a, b) => b.rotationRate - a.rotationRate)
      .slice(0, 10);
  });

  /**
   * Productos de baja rotación
   */
  lowRotationProducts = computed(() => {
    return this.productAnalytics()
      .filter((a) => a.demandLevel === 'low' && a.product.stock > 0)
      .sort((a, b) => a.rotationRate - b.rotationRate)
      .slice(0, 10);
  });

  /**
   * Sugerencias de reorden
   */
  reorderSuggestions = computed(() => {
    return this.productAnalytics()
      .filter(
        (a) =>
          a.reorderQuantity > 0 &&
          (a.status === 'critical' || a.status === 'low' || a.product.stock === 0)
      )
      .sort((a, b) => {
        // Priorizar por urgencia (días hasta agotamiento)
        if (a.product.stock === 0) return -1;
        if (b.product.stock === 0) return 1;
        return a.daysUntilStockout - b.daysUntilStockout;
      });
  });

  /**
   * Productos por categoría
   */
  productsByCategory = computed(() => {
    const products = this.productService.products();
    const categoryMap = new Map<string, Product[]>();

    products.forEach((product: any) => {
      const existing = categoryMap.get(product.category) || [];
      categoryMap.set(product.category, [...existing, product]);
    });

    return Array.from(categoryMap.entries()).map(([category, items]) => ({
      category,
      count: items.length,
      totalStock: items.reduce((sum, p) => sum + p.stock, 0),
      totalValue: items.reduce((sum, p) => sum + p.cost * p.stock, 0),
    }));
  });

  // 🚨 Las métricas del modelo de Feria y Liquidación han sido migradas al Backend (LiquidacionController)
  // para optimización del Heap Size (RAM) del navegador del cliente. 
  // Usa BackendLiquidacionService.ts en su lugar.
}

