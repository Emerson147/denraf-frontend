import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ReportService } from '../../core/services/report.service';
import { ApexChartConfigService } from '../../core/services/apex-chart-config.service';
import {
  UiPageHeaderComponent,
  UiExportMenuComponent,
  UiSkeletonComponent,
  PeriodSelectorComponent,
} from '../../shared/ui';
import { Period } from '../../shared/ui/period-selector/period-selector.component';
import { BackendAuthService, UserDTO } from '../../core/services/backend-auth.service';
import { SalesService } from '../../core/services/sales.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    UiPageHeaderComponent,
    UiExportMenuComponent,
    UiSkeletonComponent,
    PeriodSelectorComponent,
  ],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent implements OnInit {
  public reportService = inject(ReportService);
  private apexConfigService = inject(ApexChartConfigService);
  private authService = inject(BackendAuthService);
  private salesService = inject(SalesService);

  // Estado
  loading = computed(() => this.reportService.isLoading());
  reportData = computed(() => this.reportService.reportData());
  systemUsers = signal<UserDTO[]>([]);

  // Tabs para paneles Bento
  activeAnalysisTab = signal<'topProductos' | 'categorias' | 'abc'>('topProductos');
  activeInsightsTab = signal<'prediccion' | 'tendencia'>('prediccion');

  ngOnInit() {
    this.reportService.fetchReport('semana');
    
    // Cargar usuarios para cruzar con las ventas
    this.authService.getUsers().subscribe({
      next: (users) => this.systemUsers.set(users),
      error: (err) => console.error('Error cargando usuarios para reportes:', err)
    });
  }

  onPeriodChange(period: Period) {
    let param: 'semana' | 'mes' | 'anio' = 'semana';
    const diffTime = Math.abs(period.endDate.getTime() - period.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) param = 'semana';
    else if (diffDays <= 31) param = 'mes';
    else param = 'anio';
    this.reportService.fetchReport(param);
  }

  descargarExcel() {
    this.reportService.descargarExcel();
  }

  // --- MAPPEO REACTIVO DESDE EL BACKEND ---

  totalRevenue = computed(() => this.reportData()?.ingresosTotales || 0);
  totalProfit = computed(() => this.reportData()?.gananciaNeta || 0);

  profitMargin = computed(() => {
    const rev = this.totalRevenue();
    return rev > 0 ? (this.totalProfit() / rev) * 100 : 0;
  });

  totalProductsSold = computed(() => this.reportData()?.productosVendidos || 0);

  monthlyGoalPercentage = computed(() => {
    const rev = this.totalRevenue();
    return Math.min((rev / 20000) * 100, 100);
  });

  weekComparison = computed(() => {
    const change = this.reportData()?.crecimientoSemanal || 0;
    return {
      percentage: Math.abs(change),
      isPositive: change >= 0,
      arrow: change >= 0 ? '↗' : '↘'
    };
  });

  fairComparison = computed(() => {
    const report = this.reportData();
    return {
      ferias: {
        revenue: report?.ventasFerias || 0,
        profit: report?.gananciaFerias || 0,
        count: 2
      },
      tienda: {
        revenue: report?.ventasTienda || 0,
        profit: report?.gananciaTienda || 0,
        count: 5
      },
      mejorFeria: report?.mejorFeria || 'N/A'
    };
  });

  topProducts = computed(() => {
    return (this.reportData()?.topProductos || []).map(p => ({
      name: p.nombre,
      sold: p.unidadesVendidas,
      revenue: p.ingresos,
      trend: `+${p.margen.toFixed(0)}%`
    }));
  });

  productABC = computed(() => {
    const rep = this.reportData();
    if (!rep) return [];
    return [
      ...rep.productosA,
      ...rep.productosB,
      ...rep.productosC
    ].map(p => ({
      name: p.nombre,
      class: p.clasificacion,
      revenue: p.ingresos,
      quantity: p.unidades,
      percentageOfTotal: p.porcentajeDelTotal
    })).sort((a, b) => b.revenue - a.revenue);
  });

  abcSummary = computed(() => {
    const rep = this.reportData();
    return {
      A: { count: rep?.productosA?.length || 0, revenue: rep?.productosA?.reduce((s, p) => s + p.ingresos, 0) || 0 },
      B: { count: rep?.productosB?.length || 0, revenue: rep?.productosB?.reduce((s, p) => s + p.ingresos, 0) || 0 },
      C: { count: rep?.productosC?.length || 0, revenue: rep?.productosC?.reduce((s, p) => s + p.ingresos, 0) || 0 }
    };
  });

  fairTrend = computed(() => {
    const r = this.reportData();
    return {
      thursday: { average: r?.promedioMovilJueves || 0, count: 4, trend: 'estable' },
      sunday: { average: r?.promedioMovilDomingo || 0, count: 4, trend: 'estable' }
    };
  });

  nextFairPrediction = computed(() => {
    const r = this.reportData();
    let isJueves = r?.proximaFeria?.toLowerCase().includes('acobamba');
    return {
      day: isJueves ? 'Jueves' : 'Domingo',
      name: r?.proximaFeria || 'N/A',
      daysUntil: 2,
      date: new Date(),
      estimatedRevenue: r?.prediccionProximaFeria || 0,
      trend: 'creciendo',
      suggestedStock: Math.round((r?.prediccionProximaFeria || 0) / 40),
      confidence: 'alta'
    };
  });

  vendorSalesWithPercentage = computed(() => {
    const allUsers = this.systemUsers();

    // 🚀 FULL REACTIVE MODE: Siempre calculamos desde Angular para garantizar 100% tiempo real sin F5
    const periodSales = this.reportService.currentPeriod() === 'semana' 
                        ? this.salesService.weeklySales() 
                        : this.salesService.monthlySales();
    
    const localSales: Record<string, { count: number, revenue: number }> = {};
    let totalRevenue = 0;

    periodSales.forEach(s => {
      // Agrupar por vendedorId si existe en los usuarios, sino por createdBy
      const userObj = allUsers.find(u => u.id === s.vendedorId);
      const sellerName = userObj ? (userObj.nombre || userObj.email) : (s.createdBy || 'Sistema');
      
      if (!localSales[sellerName]) localSales[sellerName] = { count: 0, revenue: 0 };
      localSales[sellerName].count += 1;
      localSales[sellerName].revenue += s.total;
      totalRevenue += s.total;
    });

    const results = Object.entries(localSales).map(([nombre, data]) => ({
      name: nombre,
      revenue: data.revenue,
      count: data.count,
      avgTicket: data.count > 0 ? data.revenue / data.count : 0,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
    }));

    // Asegurar que TODOS los usuarios registrados aparezcan, incluso con S/ 0
    allUsers.forEach(u => {
       const uName = u.nombre || u.email || 'Desconocido';
       if (!localSales[uName]) {
         results.push({
            name: uName,
            revenue: 0,
            count: 0,
            avgTicket: 0,
            percentage: 0
         });
       }
    });

    // Remover duplicados en el array final
    const uniqueResults = [];
    const seenNames = new Set();
    for (const r of results) {
       if (!seenNames.has(r.name)) {
          seenNames.add(r.name);
          uniqueResults.push(r);
       }
    }

    return uniqueResults.sort((a, b) => b.revenue - a.revenue);
  });

  // Datos para exportar
  exportData = computed(() => {
    const rep = this.reportData();
    const top = rep?.topProductos || [];
    return top.map(p => ({
      'Producto': p.nombre,
      'Categoría': p.categoria,
      'Unidades': p.unidadesVendidas,
      'Ingresos': p.ingresos,
      'Margen %': p.margen
    }));
  });

  // Helpers
  totalFairRevenue = computed(() =>
    this.fairComparison().ferias.revenue + this.fairComparison().tienda.revenue
  );

  fairPercentage = computed(() => {
    const total = this.totalFairRevenue();
    return total > 0 ? (this.fairComparison().ferias.revenue / total) * 100 : 50;
  });

  storePercentage = computed(() => {
    const total = this.totalFairRevenue();
    return total > 0 ? (this.fairComparison().tienda.revenue / total) * 100 : 50;
  });

  // --- CHARTS OPTIONS ---

  weeklyChartOptions = computed<ApexOptions>(() => {
    const dailyMap = this.reportData()?.ventasPorDia || {};
    const categories = Object.keys(dailyMap).length > 0 ? Object.keys(dailyMap) : ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const revenueData = Object.values(dailyMap).length > 0 ? Object.values(dailyMap) : [0, 0, 0, 0, 0, 0, 0];

    return this.apexConfigService.getAreaChartConfig({
      series: [
        { name: 'Ingresos', data: revenueData },
        { name: 'Ganancia Neta', data: revenueData.map(v => v * 0.3) }
      ],
      categories: categories,
      height: 280
    });
  });

  categoriesChartOptions = computed<ApexOptions>(() => {
    const catsMap = this.reportData()?.ventasPorCategoria || {};
    const labels = Object.keys(catsMap);
    const series = Object.values(catsMap);

    return this.apexConfigService.getDonutChartConfig({
      series: series.length ? series : [1],
      labels: labels.length ? labels : ['Sin datos'],
      height: 280
    });
  });

  vendorChartOptions = computed<ApexOptions>(() => {
    const vendors = this.vendorSalesWithPercentage();
    return this.apexConfigService.getBarChartConfig({
      series: [{ name: 'Ingresos', data: vendors.map(v => v.revenue) }],
      categories: vendors.map(v => v.name),
      height: 250
    });
  });
}