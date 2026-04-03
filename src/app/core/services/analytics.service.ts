import { Injectable, computed, inject, signal } from '@angular/core';
import { SalesService } from './sales.service';
import { Sale } from '../models';

export interface KpiMetric {
  current: number;
  previous: number;
  change: number; // Porcentaje de cambio
  trend: 'up' | 'down' | 'stable';
}

export interface ProductProfitability {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  estimatedCost: number;
  profit: number;
  margin: number; // Porcentaje
}

export interface PeriodComparison {
  current: {
    sales: number;
    revenue: number;
    avgTicket: number;
    dailyData: number[];
  };
  previous: {
    sales: number;
    revenue: number;
    avgTicket: number;
    dailyData: number[];
  };
  growth: {
    sales: number;
    revenue: number;
    avgTicket: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private salesService = inject(SalesService);

  // 📅 Período seleccionado para filtrado dinámico
  private selectedPeriod = signal<{ startDate: Date; endDate: Date } | null>(null);

  /**
   * Actualiza el período seleccionado para filtrar métricas
   */
  setPeriod(startDate: Date, endDate: Date) {
    this.selectedPeriod.set({ startDate, endDate });
  }

  /**
   * Limpia el filtro de período (volver a usar períodos por defecto)
   */
  clearPeriod() {
    this.selectedPeriod.set(null);
  }

  /**
   * Obtiene ventas filtradas por el período seleccionado o usa método por defecto
   */
  private getSalesForPeriod(defaultGetter: () => Sale[]): Sale[] {
    const period = this.selectedPeriod();
    if (!period) {
      return defaultGetter();
    }

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= period.startDate && saleDate <= period.endDate;
    });
  }

  /**
   * Revenue semanal (para uso en AlertService)
   */
  weeklyRevenue = computed(() => {
    const weeklySales = this.getCurrentWeekSales();
    return weeklySales.reduce((sum, s) => sum + s.total, 0);
  });

  // --- KPIs PRINCIPALES ---

  // Margen de Ganancia Promedio (asumiendo costo es 60% del precio de venta)
  profitMargin = computed<KpiMetric>(() => {
    const currentWeek = this.getSalesForPeriod(() => this.getCurrentWeekSales());
    const previousWeek = this.getPreviousWeekSales();

    const calculateMargin = (sales: Sale[]) => {
      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const estimatedCost = totalRevenue * 0.6; // Estimación: costo es 60% del precio
      const profit = totalRevenue - estimatedCost;
      return totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    };

    const current = calculateMargin(currentWeek);
    const previous = calculateMargin(previousWeek);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  });

  // ROI (Return on Investment) - Retorno sobre inversión
  roi = computed<KpiMetric>(() => {
    const currentMonth = this.getSalesForPeriod(() => this.getCurrentMonthSales());
    const previousMonth = this.getPreviousMonthSales();

    const calculateROI = (sales: Sale[]) => {
      const revenue = sales.reduce((sum, s) => sum + s.total, 0);
      const cost = revenue * 0.6; // Estimación
      return cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    };

    const current = calculateROI(currentMonth);
    const previous = calculateROI(previousMonth);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  });

  // Ticket Promedio
  averageTicket = computed<KpiMetric>(() => {
    const currentWeek = this.getSalesForPeriod(() => this.getCurrentWeekSales());
    const previousWeek = this.getPreviousWeekSales();

    const calculateAvg = (sales: Sale[]) => {
      return sales.length > 0 ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length : 0;
    };

    const current = calculateAvg(currentWeek);
    const previous = calculateAvg(previousWeek);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  });

  // Tasa de Conversión (ventas completadas vs totales)
  conversionRate = computed<KpiMetric>(() => {
    const currentWeek = this.getSalesForPeriod(() => this.getCurrentWeekSales());
    const previousWeek = this.getPreviousWeekSales();

    const calculateRate = (sales: Sale[]) => {
      const completed = sales.filter((s) => s.status === 'completed').length;
      return sales.length > 0 ? (completed / sales.length) * 100 : 0;
    };

    const current = calculateRate(currentWeek);
    const previous = calculateRate(previousWeek);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  });

  // --- ANÁLISIS DE RENTABILIDAD POR PRODUCTO ---

  topProfitableProducts = computed<ProductProfitability[]>(() => {
    const allSales = this.getSalesForPeriod(() => this.salesService.allSales());
    const productMap = new Map<string, ProductProfitability>();

    allSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const key = item.productId;
        const existing = productMap.get(key);

        const revenue = item.subtotal;
        const estimatedCost = revenue * 0.6; // 60% costo estimado
        const profit = revenue - estimatedCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        if (existing) {
          existing.totalSold += item.quantity;
          existing.revenue += revenue;
          existing.estimatedCost += estimatedCost;
          existing.profit += profit;
          existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
        } else {
          productMap.set(key, {
            productId: item.productId,
            productName: item.productName || item.productId,
            totalSold: item.quantity,
            revenue,
            estimatedCost,
            profit,
            margin,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  });

  // --- COMPARACIÓN DE PERÍODOS ---

  weekComparison = computed<PeriodComparison>(() => {
    const current = this.getSalesForPeriod(() => this.getCurrentWeekSales());
    const previous = this.getPreviousWeekSales();

    const currentRevenue = current.reduce((sum, s) => sum + s.total, 0);
    const previousRevenue = previous.reduce((sum, s) => sum + s.total, 0);

    // Calcular datos diarios
    const period = this.selectedPeriod();
    let days = 7;
    let referenceDate = new Date();
    
    // Si hay período seleccionado, usar sus fechas
    if (period) {
      const diffTime = Math.abs(period.endDate.getTime() - period.startDate.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      referenceDate = period.endDate;
    }

    const currentDailyData: number[] = [];
    const previousDailyData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      // Día actual
      const currentDate = new Date(referenceDate);
      currentDate.setDate(referenceDate.getDate() - i);
      const currentDayStart = new Date(currentDate.setHours(0, 0, 0, 0));
      const currentDayEnd = new Date(currentDate.setHours(23, 59, 59, 999));

      const currentDaySales = this.salesService.allSales().filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= currentDayStart && saleDate <= currentDayEnd;
      });
      currentDailyData.push(currentDaySales.reduce((sum, s) => sum + s.total, 0));

      // Día anterior (hace X días según el período)
      const previousDate = new Date(referenceDate);
      previousDate.setDate(referenceDate.getDate() - i - days);
      const previousDayStart = new Date(previousDate.setHours(0, 0, 0, 0));
      const previousDayEnd = new Date(previousDate.setHours(23, 59, 59, 999));

      const previousDaySales = this.salesService.allSales().filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= previousDayStart && saleDate <= previousDayEnd;
      });
      previousDailyData.push(previousDaySales.reduce((sum, s) => sum + s.total, 0));
    }

    return {
      current: {
        sales: current.length,
        revenue: currentRevenue,
        avgTicket: current.length > 0 ? currentRevenue / current.length : 0,
        dailyData: currentDailyData,
      },
      previous: {
        sales: previous.length,
        revenue: previousRevenue,
        avgTicket: previous.length > 0 ? previousRevenue / previous.length : 0,
        dailyData: previousDailyData,
      },
      growth: {
        sales:
          previous.length > 0 ? ((current.length - previous.length) / previous.length) * 100 : 0,
        revenue:
          previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        avgTicket:
          previous.length > 0 && current.length > 0
            ? ((currentRevenue / current.length - previousRevenue / previous.length) /
                (previousRevenue / previous.length)) *
              100
            : 0,
      },
    };
  });

  // Datos para gráfico de comparación (últimos 7 días)
  weekComparisonChartData = computed(() => {
    const days = 7;
    const today = new Date();
    const currentWeekRevenues: number[] = [];
    const previousWeekRevenues: number[] = [];
    const labels: string[] = [];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = days - 1; i >= 0; i--) {
      // Semana actual
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);
      const currentDayStart = new Date(currentDate.setHours(0, 0, 0, 0));
      const currentDayEnd = new Date(currentDate.setHours(23, 59, 59, 999));

      const currentDaySales = this.salesService.allSales().filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= currentDayStart && saleDate <= currentDayEnd;
      });

      const currentRevenue = currentDaySales.reduce((sum, sale) => sum + sale.total, 0);
      currentWeekRevenues.push(currentRevenue);

      // Semana anterior (mismo día de la semana hace 7 días)
      const previousDate = new Date(today);
      previousDate.setDate(today.getDate() - i - 7);
      const previousDayStart = new Date(previousDate.setHours(0, 0, 0, 0));
      const previousDayEnd = new Date(previousDate.setHours(23, 59, 59, 999));

      const previousDaySales = this.salesService.allSales().filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= previousDayStart && saleDate <= previousDayEnd;
      });

      const previousRevenue = previousDaySales.reduce((sum, sale) => sum + sale.total, 0);
      previousWeekRevenues.push(previousRevenue);

      // Labels
      labels.push(dayNames[currentDate.getDay()]);
    }

    return {
      current: currentWeekRevenues,
      previous: previousWeekRevenues,
      labels,
    };
  });

  // --- PREDICCIÓN BÁSICA ---

  // Proyección de ventas para próxima semana basada en promedio histórico
  salesForecast = computed(() => {
    const last4Weeks = this.getLast4WeeksSales();
    const avgWeeklySales = last4Weeks.reduce((sum, s) => sum + s.total, 0) / 4;
    const avgWeeklyCount = last4Weeks.length / 4;

    return {
      projectedRevenue: avgWeeklySales,
      projectedSalesCount: Math.round(avgWeeklyCount),
      confidence: last4Weeks.length > 10 ? 'high' : last4Weeks.length > 5 ? 'medium' : 'low',
    };
  });

  // --- MÉTODOS AUXILIARES PRIVADOS ---

  private getCurrentWeekSales(): Sale[] {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Domingo
    weekStart.setHours(0, 0, 0, 0);

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= weekStart;
    });
  }

  private getPreviousWeekSales(): Sale[] {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - 7); // Semana anterior
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= weekStart && saleDate < weekEnd;
    });
  }

  private getCurrentMonthSales(): Sale[] {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= monthStart;
    });
  }

  private getPreviousMonthSales(): Sale[] {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= monthStart && saleDate <= monthEnd;
    });
  }

  private getLast4WeeksSales(): Sale[] {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);

    return this.salesService.allSales().filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= fourWeeksAgo;
    });
  }
}
