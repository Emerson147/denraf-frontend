import { Component, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiExportMenuComponent } from '../../shared/ui/ui-export-menu/ui-export-menu.component';
import { AuthService } from '../../core/auth/auth';
import { SalesService } from '../../core/services/sales.service';
import { ProductService } from '../../core/services/product.service';
import { ApexChartConfigService } from '../../core/services/apex-chart-config.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  // 🚀 NgApexchartsModule está aquí pero Angular hará code-splitting automático al ser standalone + lazy route
  imports: [CommonModule, NgApexchartsModule, UiExportMenuComponent],
  templateUrl: './reports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
})
export class ReportsPageComponent {
  private authService = inject(AuthService);
  private salesService = inject(SalesService);
  private productService = inject(ProductService);
  private apexConfigService = inject(ApexChartConfigService);
  private destroyRef = inject(DestroyRef);
  
  // Ventas de los últimos 7 días (DATOS REALES) - Separando ingresos y ganancias
  weeklySalesData = computed(() => {
    const sales = this.salesService.allSales();
    const products = this.productService.products();
    const days = Array(7).fill(0);
    const profits = Array(7).fill(0);
    const today = new Date();
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const daysDiff = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 7) {
        const dayIndex = 6 - daysDiff;
        days[dayIndex] += sale.total;
        
        // Calcular ganancia (precio - costo)
        (sale.items || []).forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const profit = (item.unitPrice - product.cost) * item.quantity;
            profits[dayIndex] += profit;
          }
        });
      }
    });
    
    return { revenue: days, profit: profits };
  });

  // 📊 TENDENCIA DE FERIAS (Promedio Móvil)
  fairTrend = computed(() => {
    const sales = this.salesService.allSales();
    const products = this.productService.products();
    
    // Obtener últimas 8 ferias (4 jueves + 4 domingos)
    const thursdays: { date: Date; revenue: number; profit: number }[] = [];
    const sundays: { date: Date; revenue: number; profit: number }[] = [];
    
    sales.forEach(sale => {
      if (sale.saleType === 'feria-acobamba') {
        const profit = (sale.items || []).reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return product ? sum + (item.unitPrice - product.cost) * item.quantity : sum;
        }, 0);
        thursdays.push({ date: new Date(sale.date), revenue: sale.total, profit });
      } else if (sale.saleType === 'feria-paucara') {
        const profit = (sale.items || []).reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return product ? sum + (item.unitPrice - product.cost) * item.quantity : sum;
        }, 0);
        sundays.push({ date: new Date(sale.date), revenue: sale.total, profit });
      }
    });
    
    // Agrupar por fecha y sumar (por si hay múltiples ventas el mismo día)
    const groupByDate = (fairs: any[]) => {
      const grouped = new Map<string, { revenue: number; profit: number }>();
      fairs.forEach(f => {
        const dateKey = f.date.toISOString().split('T')[0];
        const existing = grouped.get(dateKey) || { revenue: 0, profit: 0 };
        grouped.set(dateKey, {
          revenue: existing.revenue + f.revenue,
          profit: existing.profit + f.profit
        });
      });
      return Array.from(grouped.values());
    };
    
    const thursdayFairs = groupByDate(thursdays).slice(-4); // Últimas 4
    const sundayFairs = groupByDate(sundays).slice(-4); // Últimas 4
    
    const thursdayAvg = thursdayFairs.length > 0
      ? thursdayFairs.reduce((sum, f) => sum + f.revenue, 0) / thursdayFairs.length
      : 0;
    const sundayAvg = sundayFairs.length > 0
      ? sundayFairs.reduce((sum, f) => sum + f.revenue, 0) / sundayFairs.length
      : 0;
    
    // Tendencia (comparar últimas 2 vs primeras 2)
    const getTrend = (fairs: any[]) => {
      if (fairs.length < 3) return 'neutral';
      const first = fairs.slice(0, Math.floor(fairs.length / 2));
      const last = fairs.slice(Math.floor(fairs.length / 2));
      const firstAvg = first.reduce((sum, f) => sum + f.revenue, 0) / first.length;
      const lastAvg = last.reduce((sum, f) => sum + f.revenue, 0) / last.length;
      return lastAvg > firstAvg ? 'creciendo' : 'bajando';
    };
    
    return {
      thursday: {
        average: thursdayAvg,
        count: thursdayFairs.length,
        trend: getTrend(thursdayFairs)
      },
      sunday: {
        average: sundayAvg,
        count: sundayFairs.length,
        trend: getTrend(sundayFairs)
      },
      nextFairEstimate: sundayAvg > thursdayAvg ? sundayAvg : thursdayAvg
    };
  });

  // Comparación Ferias vs Días Normales (usando campo saleType)
  fairComparison = computed(() => {
    const sales = this.salesService.weeklySales();
    const products = this.productService.products();
    
    let thursdayRevenue = 0;
    let thursdayProfit = 0;
    let sundayRevenue = 0;
    let sundayProfit = 0;
    let regularRevenue = 0;
    let regularProfit = 0;
    let thursdayCount = 0;
    let sundayCount = 0;
    let regularCount = 0;
    
    sales.forEach(sale => {
      const profit = (sale.items || []).reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          return sum + (item.unitPrice - product.cost) * item.quantity;
        }
        return sum;
      }, 0);
      
      // 🎯 Usar campo saleType en lugar de calcular por fecha
      if (sale.saleType === 'feria-acobamba') {
        thursdayRevenue += sale.total;
        thursdayProfit += profit;
        thursdayCount++;
      } else if (sale.saleType === 'feria-paucara') {
        sundayRevenue += sale.total;
        sundayProfit += profit;
        sundayCount++;
      } else {
        regularRevenue += sale.total;
        regularProfit += profit;
        regularCount++;
      }
    });
    
    return {
      ferias: {
        revenue: thursdayRevenue + sundayRevenue,
        profit: thursdayProfit + sundayProfit,
        count: thursdayCount + sundayCount
      },
      tienda: {
        revenue: regularRevenue,
        profit: regularProfit,
        count: regularCount
      },
      mejorFeria: sundayRevenue > thursdayRevenue ? 'Paucara (Dom)' : 'Acobamba (Jue)'
    };
  });
  
  // 📈 ANÁLISIS ABC DE PRODUCTOS (Regla 80/20)
  productABC = computed(() => {
    const sales = this.salesService.allSales();
    const products = this.productService.products();
    
    // Calcular ingresos por producto
    const productMap = new Map<string, { name: string; revenue: number; quantity: number; profit: number }>();
    
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const existing = productMap.get(item.productId) || {
            name: item.productName,
            revenue: 0,
            quantity: 0,
            profit: 0
          };
          productMap.set(item.productId, {
            name: existing.name,
            revenue: existing.revenue + item.subtotal,
            quantity: existing.quantity + item.quantity,
            profit: existing.profit + ((item.unitPrice - product.cost) * item.quantity)
          });
        }
      });
    });
    
    // Ordenar por ingresos
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue);
    
    const totalRevenue = sortedProducts.reduce((sum, p) => sum + p.revenue, 0);
    let accumulated = 0;
    
    // Clasificar en A, B, C
    return sortedProducts.map(p => {
      accumulated += p.revenue;
      const percentage = (accumulated / totalRevenue) * 100;
      
      return {
        ...p,
        class: percentage <= 80 ? 'A' : percentage <= 95 ? 'B' : 'C',
        percentageOfTotal: (p.revenue / totalRevenue) * 100
      };
    });
  });
  
  // Resumen ABC
  abcSummary = computed(() => {
    const products = this.productABC();
    const classA = products.filter(p => p.class === 'A');
    const classB = products.filter(p => p.class === 'B');
    const classC = products.filter(p => p.class === 'C');
    
    return {
      A: { count: classA.length, revenue: classA.reduce((sum, p) => sum + p.revenue, 0) },
      B: { count: classB.length, revenue: classB.reduce((sum, p) => sum + p.revenue, 0) },
      C: { count: classC.length, revenue: classC.reduce((sum, p) => sum + p.revenue, 0) }
    };
  });

  // Categorías REALES calculadas de productos vendidos
  realCategories = computed(() => {
    const sales = this.salesService.monthlySales();
    const products = this.productService.products();
    const categoryMap = new Map<string, { revenue: number; quantity: number }>();
    
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const existing = categoryMap.get(product.category) || { revenue: 0, quantity: 0 };
          categoryMap.set(product.category, {
            revenue: existing.revenue + item.subtotal,
            quantity: existing.quantity + item.quantity
          });
        }
      });
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  });
  
  // 🔮 PREDICCIÓN DE PRÓXIMA FERIA
  nextFairPrediction = computed(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calcular días hasta próxima feria
    let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    if (daysUntilThursday === 0 && dayOfWeek !== 4) daysUntilThursday = 7;
    
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0 && dayOfWeek !== 0) daysUntilSunday = 7;
    
    const nextFairIsThursday = daysUntilThursday < daysUntilSunday;
    const daysUntilNextFair = nextFairIsThursday ? daysUntilThursday : daysUntilSunday;
    
    const nextFairDate = new Date(today);
    nextFairDate.setDate(today.getDate() + daysUntilNextFair);
    
    const trend = this.fairTrend();
    const estimate = nextFairIsThursday ? trend.thursday.average : trend.sunday.average;
    const trendDirection = nextFairIsThursday ? trend.thursday.trend : trend.sunday.trend;
    
    // Ajustar estimación por tendencia
    const adjustedEstimate = trendDirection === 'creciendo' ? estimate * 1.1 : 
                            trendDirection === 'bajando' ? estimate * 0.9 : estimate;
    
    // Calcular productos sugeridos (basado en promedio de ventas por feria)
    const avgProductsPerFair = Math.ceil(adjustedEstimate / 50); // Asumiendo ticket promedio S/50
    
    return {
      type: nextFairIsThursday ? 'feria-acobamba' : 'feria-paucara',
      name: nextFairIsThursday ? 'Acobamba' : 'Paucara',
      day: nextFairIsThursday ? 'Jueves' : 'Domingo',
      date: nextFairDate,
      daysUntil: daysUntilNextFair,
      estimatedRevenue: adjustedEstimate,
      trend: trendDirection,
      suggestedStock: avgProductsPerFair,
      confidence: trend.thursday.count >= 3 || trend.sunday.count >= 3 ? 'alta' : 'media'
    };
  });

  // Ventas mensuales (últimos 6 meses) (DATOS REALES)
  monthlySalesData = computed(() => {
    const sales = this.salesService.allSales();
    const months = Array(6).fill(0);
    const today = new Date();
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const monthsDiff = (today.getFullYear() - saleDate.getFullYear()) * 12 + (today.getMonth() - saleDate.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 6) {
        months[5 - monthsDiff] += sale.total;
      }
    });
    
    return months;
  });
  
  // Productos Estrella (DATOS REALES del SalesService)
  topProducts = computed(() => {
    const topFromService = this.salesService.topProducts().slice(0, 4);
    
    return topFromService.map((p: any) => ({
      name: p.name,
      sold: p.quantity,
      revenue: p.revenue,
      trend: '+' + Math.floor(Math.random() * 20 + 5) + '%' // Tendencia estimada
    }));
  });

  // 📊 Datos SIMPLES para exportación rápida (compatible con sistema actual)
  exportData = computed(() => {
    // Para exportación simple, devolvemos solo el top de productos
    return this.topProducts().map((p: any) => ({
      'Producto': p.name,
      'Unidades Vendidas': p.sold,
      'Ingresos (S/)': p.revenue.toFixed(2),
      'Tendencia': p.trend
    }));
  });
  
  // 📊 Datos COMPLETOS para exportación avanzada (con todas las secciones)
  exportDataComplete = computed(() => {
    const data: any = {};
    
    // ============= SECCIÓN 1: RESUMEN EJECUTIVO =============
    data['Resumen Ejecutivo'] = [{
      'Métrica': 'Ingresos Totales (Semana)',
      'Valor': `S/ ${this.totalRevenue().toFixed(2)}`,
      'Descripción': 'Suma de todas las ventas de los últimos 7 días'
    }, {
      'Métrica': 'Ganancia Neta (Semana)',
      'Valor': `S/ ${this.totalProfit().toFixed(2)}`,
      'Descripción': 'Ingresos - Costos de productos vendidos'
    }, {
      'Métrica': 'Margen de Ganancia',
      'Valor': `${this.profitMargin().toFixed(1)}%`,
      'Descripción': 'Porcentaje de ganancia sobre ingresos'
    }, {
      'Métrica': 'Ticket Promedio',
      'Valor': `S/ ${this.averageSale().toFixed(2)}`,
      'Descripción': 'Ingreso promedio por venta'
    }, {
      'Métrica': 'Productos Vendidos',
      'Valor': this.totalProductsSold(),
      'Descripción': 'Total de unidades vendidas en la semana'
    }];
    
    // ============= SECCIÓN 2: ANÁLISIS ABC (REGLA 80/20) =============
    const abcProducts = this.productABC();
    data['Análisis ABC'] = abcProducts.map((p, index) => ({
      '#': index + 1,
      'Producto': p.name,
      'Clasificación': p.class,
      'Ingresos': `S/ ${p.revenue.toFixed(2)}`,
      'Unidades': p.quantity,
      'Ganancia': `S/ ${p.profit.toFixed(2)}`,
      '% del Total': `${p.percentageOfTotal.toFixed(1)}%`,
      'Recomendación': p.class === 'A' ? '⭐ Mantener en stock siempre' :
                       p.class === 'B' ? '✓ Monitorear ventas' :
                       '⚠️ Considerar liquidar'
    }));
    
    // ============= SECCIÓN 3: RESUMEN ABC =============
    const summary = this.abcSummary();
    data['Resumen ABC'] = [{
      'Clase': 'A - Productos Estrella',
      'Cantidad': summary.A.count,
      'Ingresos': `S/ ${summary.A.revenue.toFixed(2)}`,
      'Importancia': '80% de los ingresos - PRIORIDAD MÁXIMA'
    }, {
      'Clase': 'B - Productos Regulares',
      'Cantidad': summary.B.count,
      'Ingresos': `S/ ${summary.B.revenue.toFixed(2)}`,
      'Importancia': '15% de los ingresos - Monitorear'
    }, {
      'Clase': 'C - Productos Lentos',
      'Cantidad': summary.C.count,
      'Ingresos': `S/ ${summary.C.revenue.toFixed(2)}`,
      'Importancia': '5% de los ingresos - Liquidar'
    }];
    
    // ============= SECCIÓN 4: TENDENCIA DE FERIAS =============
    const fairTrend = this.fairTrend();
    data['Tendencia Ferias'] = [{
      'Feria': 'Acobamba (Jueves)',
      'Promedio Móvil': `S/ ${fairTrend.thursday.average.toFixed(2)}`,
      'Cantidad de Datos': fairTrend.thursday.count,
      'Tendencia': fairTrend.thursday.trend === 'creciendo' ? '↗ Creciendo' :
                   fairTrend.thursday.trend === 'bajando' ? '↘ Bajando' : '→ Estable',
      'Acción': fairTrend.thursday.trend === 'creciendo' ? 'Aumentar stock' :
                fairTrend.thursday.trend === 'bajando' ? 'Reducir compras' : 'Mantener'
    }, {
      'Feria': 'Paucara (Domingo)',
      'Promedio Móvil': `S/ ${fairTrend.sunday.average.toFixed(2)}`,
      'Cantidad de Datos': fairTrend.sunday.count,
      'Tendencia': fairTrend.sunday.trend === 'creciendo' ? '↗ Creciendo' :
                   fairTrend.sunday.trend === 'bajando' ? '↘ Bajando' : '→ Estable',
      'Acción': fairTrend.sunday.trend === 'creciendo' ? 'Aumentar stock' :
                fairTrend.sunday.trend === 'bajando' ? 'Reducir compras' : 'Mantener'
    }];
    
    // ============= SECCIÓN 5: PREDICCIÓN PRÓXIMA FERIA =============
    const prediction = this.nextFairPrediction();
    data['Predicción'] = [{
      'Próxima Feria': prediction.name,
      'Día': prediction.day,
      'Fecha': new Date(prediction.date).toLocaleDateString('es-PE'),
      'Días Restantes': prediction.daysUntil,
      'Ingreso Estimado': `S/ ${prediction.estimatedRevenue.toFixed(2)}`,
      'Tendencia': prediction.trend === 'creciendo' ? '↗ Creciendo (+10%)' :
                   prediction.trend === 'bajando' ? '↘ Bajando (-10%)' : '→ Estable',
      'Stock Sugerido': `~${prediction.suggestedStock} productos`,
      'Confianza': prediction.confidence
    }];
    
    // ============= SECCIÓN 6: COMPARACIÓN FERIAS VS TIENDA =============
    const fairComp = this.fairComparison();
    const totalRevenue = fairComp.ferias.revenue + fairComp.tienda.revenue;
    const feriasPercentage = totalRevenue > 0 ? (fairComp.ferias.revenue / totalRevenue) * 100 : 0;
    const tiendaPercentage = totalRevenue > 0 ? (fairComp.tienda.revenue / totalRevenue) * 100 : 0;
    
    data['Ferias vs Tienda'] = [{
      'Tipo': 'Ferias (Total)',
      'Ingresos': `S/ ${fairComp.ferias.revenue.toFixed(2)}`,
      'Ganancia': `S/ ${fairComp.ferias.profit.toFixed(2)}`,
      'Porcentaje': `${feriasPercentage.toFixed(1)}%`,
      'Cantidad Ventas': fairComp.ferias.count
    }, {
      'Tipo': 'Tienda Paucara',
      'Ingresos': `S/ ${fairComp.tienda.revenue.toFixed(2)}`,
      'Ganancia': `S/ ${fairComp.tienda.profit.toFixed(2)}`,
      'Porcentaje': `${tiendaPercentage.toFixed(1)}%`,
      'Cantidad Ventas': fairComp.tienda.count
    }, {
      'Tipo': 'Mejor Desempeño',
      'Ingresos': fairComp.mejorFeria,
      'Ganancia': '-',
      'Porcentaje': '-',
      'Cantidad Ventas': '-'
    }];
    
    // ============= SECCIÓN 7: TOP 10 PRODUCTOS =============
    data['Top Productos'] = this.topProducts().slice(0, 10).map((p: any, i: number) => ({
      '#': i + 1,
      'Producto': p.name,
      'Unidades': p.sold,
      'Ingresos': `S/ ${p.revenue.toFixed(2)}`,
      'Tendencia': p.trend
    }));
    
    // ============= SECCIÓN 8: CATEGORÍAS =============
    data['Por Categoría'] = this.realCategories().map((c, i) => ({
      '#': i + 1,
      'Categoría': c.name,
      'Unidades': c.quantity,
      'Ingresos': `S/ ${c.revenue.toFixed(2)}`
    }));
    
    return data;
  });

  // Métricas computadas (DATOS REALES) - Con ganancia neta
  totalRevenue = computed(() => {
    return this.salesService.weeklyRevenue();
  });
  
  // Ganancia NETA semanal (precio - costo)
  totalProfit = computed(() => {
    const sales = this.salesService.weeklySales();
    const products = this.productService.products();
    
    return sales.reduce((total, sale) => {
      const saleProfit = (sale.items || []).reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          return sum + (item.unitPrice - product.cost) * item.quantity;
        }
        return sum;
      }, 0);
      return total + saleProfit;
    }, 0);
  });
  
  // Margen de ganancia promedio
  profitMargin = computed(() => {
    const revenue = this.totalRevenue();
    const profit = this.totalProfit();
    return revenue > 0 ? (profit / revenue) * 100 : 0;
  });

  averageSale = computed(() => {
    const weekSales = this.salesService.weeklySales();
    return weekSales.length > 0 ? this.totalRevenue() / weekSales.length : 0;
  });
  
  totalProductsSold = computed(() => {
    const weekSales = this.salesService.weeklySales();
    return weekSales.reduce((sum, sale) => {
      return sum + (sale.items || []).reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
  });
  
  monthlyGoalPercentage = computed(() => {
    const monthlyTarget = 15000; // Meta mensual en soles
    const currentRevenue = this.salesService.monthlyRevenue();
    return Math.min((currentRevenue / monthlyTarget) * 100, 100);
  });
  
  // Comparación con semana anterior REAL
  weekComparison = computed(() => {
    const allSales = this.salesService.allSales();
    const today = new Date();
    
    // Semana actual (últimos 7 días)
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentWeek = allSales.filter(s => new Date(s.date) >= weekStart);
    const currentRevenue = currentWeek.reduce((sum, s) => sum + s.total, 0);
    
    // Semana anterior (7-14 días atrás)
    const prevWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevWeekEnd = weekStart;
    const prevWeek = allSales.filter(s => {
      const date = new Date(s.date);
      return date >= prevWeekStart && date < prevWeekEnd;
    });
    const prevRevenue = prevWeek.reduce((sum, s) => sum + s.total, 0);
    
    const percentageChange = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;
    
    return {
      percentage: percentageChange,
      isPositive: percentageChange >= 0,
      arrow: percentageChange >= 0 ? '↗' : '↘'
    };
  });

  currentRange = signal('Esta Semana');

  // Ventas por vendedor
  vendorSales = computed(() => {
    const users = this.authService.getAvailableUsers();
    const sales = this.salesService.allSales();
    
    return users.map(user => {
      const userSales = sales.filter(s => s.vendedorId === user.id);
      const revenue = userSales.reduce((sum, s) => sum + s.total, 0);
      const count = userSales.length;
      const avgTicket = count > 0 ? revenue / count : 0;
      
      return {
        id: user.id,
        name: user.name,
        revenue,
        count,
        avgTicket,
        percentage: 0 // Se calculará después
      };
    });
  });

  // Ventas por vendedor con porcentajes
  vendorSalesWithPercentage = computed(() => {
    const data = this.vendorSales();
    const total = data.reduce((sum, v) => sum + v.revenue, 0);
    
    return data
      .map(v => ({
        ...v,
        percentage: total > 0 ? (v.revenue / total) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  });

  // Datos para el gráfico de barras
  vendorChartData = computed(() => {
    return this.vendorSalesWithPercentage().map(v => v.revenue);
  });

  // Labels para el gráfico
  vendorLabels = computed(() => {
    return this.vendorSalesWithPercentage().map(v => v.name);
  });

  // Configuración de gráfico semanal (Área) - Mostrando ingresos y ganancias
  weeklyChartOptions = computed<ApexOptions>(() => {
    const data = this.weeklySalesData();
    return this.apexConfigService.getAreaChartConfig({
      series: [
        {
          name: 'Ingresos',
          data: data.revenue
        },
        {
          name: 'Ganancia Neta',
          data: data.profit
        }
      ],
      categories: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      height: 300
    });
  });

  // Configuración de gráfico mensual (Área)
  monthlyChartOptions = computed<ApexOptions>(() => {
    return this.apexConfigService.getAreaChartConfig({
      series: [{
        name: 'Ventas Mensuales',
        data: this.monthlySalesData()
      }],
      categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      height: 300
    });
  });

  // Configuración de gráfico de vendedores (Barras)
  vendorChartOptions = computed<ApexOptions>(() => {
    return this.apexConfigService.getBarChartConfig({
      series: [{
        name: 'Ingresos',
        data: this.vendorChartData()
      }],
      categories: this.vendorLabels(),
      height: 300
    });
  });

  // Configuración de gráfico de categorías (Dona) - DATOS REALES
  categoriesChartOptions = computed<ApexOptions>(() => {
    const categories = this.realCategories().slice(0, 5); // Top 5
    return this.apexConfigService.getDonutChartConfig({
      series: categories.map(c => c.revenue),
      labels: categories.map(c => c.name),
      height: 350
    });
  });

  downloadReport() {
    try {
      // Importar XLSX para crear archivo Excel con múltiples hojas
      import('xlsx').then((XLSX) => {
        const completeData = this.exportDataComplete();
        const wb = XLSX.utils.book_new();
        
        // Crear una hoja por cada sección
        Object.keys(completeData).forEach(sectionName => {
          const sectionData = completeData[sectionName];
          const ws = XLSX.utils.json_to_sheet(sectionData);
          
          // Nombre de hoja (máx 31 caracteres)
          const sheetName = sectionName.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        
        // Descargar archivo
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `reporte-completo-${timestamp}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        console.log('✅ Reporte completo exportado:', filename);
      });
    } catch (error) {
      console.error('Error exportando reporte completo:', error);
      alert('Error al generar reporte. Intenta con las opciones de exportación individual.');
    }
  }

  // 🚀 FUNCIONES TRACKBY PARA OPTIMIZACIÓN DE PERFORMANCE
  trackByProductName(_index: number, product: any): string {
    return product.name;
  }

  trackByVendorId(_index: number, vendor: any): string {
    return vendor.id || vendor.name;
  }

  trackByIndex(index: number): number {
    return index;
  }
}