import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
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
  activeAnalysisTab = signal<'topProductos' | 'categorias' | 'abc' | 'pagos'>('topProductos');
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
    if (period.option === 'today') {
      this.reportService.fetchReport('hoy');
    } else if (period.option === 'week') {
      this.reportService.fetchReport('semana');
    } else if (period.option === 'month') {
      this.reportService.fetchReport('mes');
    } else if (period.option === 'custom') {
      const startStr = period.startDate.toISOString().split('T')[0];
      const endStr = period.endDate.toISOString().split('T')[0];
      this.reportService.fetchReport('custom', startStr, endStr);
    }
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
      thursday: { average: r?.promedioMovilJueves || 0, count: 4, trend: r?.tendenciaJueves || 'Estable' },
      sunday: { average: r?.promedioMovilDomingo || 0, count: 4, trend: r?.tendenciaDomingo || 'Estable' }
    };
  });

  nextFairPrediction = computed(() => {
    const r = this.reportData();
    let isJueves = r?.proximaFeria?.toLowerCase().includes('acobamba') || r?.proximaFeria?.toLowerCase() === 'jueves';
    return {
      day: isJueves ? 'Jueves' : 'Domingo',
      name: r?.proximaFeria || 'N/A',
      daysUntil: 2,
      date: new Date(),
      estimatedRevenue: r?.prediccionProximaFeria || 0,
      trend: r?.tendenciaProximaFeria || 'Estable',
      suggestedStock: Math.round((r?.prediccionProximaFeria || 0) / 40),
      confidence: r?.confianzaProximaFeria || 'Baja'
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
    if (!rep) return [];

    const datePipe = new DatePipe('en-US');
    const decimalPipe = new DecimalPipe('en-US');

    // 1. Resumen Ejecutivo
    const resumenEjecutivo = [
      { Métrica: 'Ingresos Totales', Valor: `S/ ${decimalPipe.transform(rep.ingresosTotales, '1.2-2')}` },
      { Métrica: 'Ganancia Neta', Valor: `S/ ${decimalPipe.transform(rep.gananciaNeta, '1.2-2')}` },
      { Métrica: 'Ticket Promedio', Valor: `S/ ${decimalPipe.transform(rep.ticketPromedio, '1.2-2')}` },
      { Métrica: 'Productos Vendidos', Valor: rep.productosVendidos.toString() },
      { Métrica: 'Total de Ventas', Valor: rep.totalVentas.toString() },
      { Métrica: 'Crecimiento Semanal', Valor: `${rep.crecimientoSemanal > 0 ? '+' : ''}${rep.crecimientoSemanal}%` },
    ];

    // 2. Análisis ABC
    const abcA = (rep.productosA || []).map(p => ({ ...p, Clase: 'A' }));
    const abcB = (rep.productosB || []).map(p => ({ ...p, Clase: 'B' }));
    const abcC = (rep.productosC || []).map(p => ({ ...p, Clase: 'C' }));
    const abcAll = [...abcA, ...abcB, ...abcC];
    
    const analisisABC = abcAll.map(p => ({
      Producto: p.nombre,
      Categoría: p.categoria,
      Clasificación: p.Clase,
      'Unidades': p.unidades,
      'Ingresos': `S/ ${decimalPipe.transform(p.ingresos, '1.2-2')}`,
      'Participación': `${p.porcentajeDelTotal}%`
    }));

    // 3. Resumen ABC
    const totalA = abcA.reduce((sum, p) => sum + p.ingresos, 0);
    const totalB = abcB.reduce((sum, p) => sum + p.ingresos, 0);
    const totalC = abcC.reduce((sum, p) => sum + p.ingresos, 0);
    const totalIngresos = rep.ingresosTotales > 0 ? rep.ingresosTotales : 1;

    const resumenABC = [
      { Clase: 'A (Alto Valor)', Cantidad: abcA.length, Ingresos: `S/ ${decimalPipe.transform(totalA, '1.2-2')}`, '% Ingresos': `${((totalA/totalIngresos)*100).toFixed(1)}%` },
      { Clase: 'B (Valor Medio)', Cantidad: abcB.length, Ingresos: `S/ ${decimalPipe.transform(totalB, '1.2-2')}`, '% Ingresos': `${((totalB/totalIngresos)*100).toFixed(1)}%` },
      { Clase: 'C (Bajo Valor)', Cantidad: abcC.length, Ingresos: `S/ ${decimalPipe.transform(totalC, '1.2-2')}`, '% Ingresos': `${((totalC/totalIngresos)*100).toFixed(1)}%` },
    ];

    // 4. Tendencia Ferias
    const tendenciaFerias = [
      { Feria: rep.nombreFeriaJueves || 'Feria Jueves', Promedio: `S/ ${decimalPipe.transform(rep.promedioMovilJueves, '1.2-2')}`, Tendencia: rep.promedioMovilJueves > 0 ? 'Creciendo' : 'Estable' },
      { Feria: rep.nombreFeriaDomingo || 'Feria Domingo', Promedio: `S/ ${decimalPipe.transform(rep.promedioMovilDomingo, '1.2-2')}`, Tendencia: rep.promedioMovilDomingo > 0 ? 'Creciendo' : 'Estable' }
    ];

    // 5. Ferias vs Tienda
    const feriasVsTienda = [
      { Canal: 'Ferias', Ingresos: `S/ ${decimalPipe.transform(rep.ventasFerias, '1.2-2')}`, Ganancia: `S/ ${decimalPipe.transform(rep.gananciaFerias, '1.2-2')}` },
      { Canal: 'Tienda', Ingresos: `S/ ${decimalPipe.transform(rep.ventasTienda, '1.2-2')}`, Ganancia: `S/ ${decimalPipe.transform(rep.gananciaTienda, '1.2-2')}` }
    ];

    // 6. Top Productos
    const topProductos = (rep.topProductos || []).map((p, i) => ({
      '#': i + 1,
      Producto: p.nombre,
      Categoría: p.categoria,
      'Unidades': p.unidadesVendidas,
      'Ingresos': `S/ ${decimalPipe.transform(p.ingresos, '1.2-2')}`,
      'Margen': `${p.margen.toFixed(1)}%`
    }));

    // 7. Predicción
    const prediccion = [
      {
        'Próxima Feria': rep.proximaFeria || '-',
        'Día': rep.proximaFeria === 'Jueves' ? 'Jueves' : 'Domingo',
        'Días Restantes': '-',
        'Ingreso Estimado': `S/ ${decimalPipe.transform(rep.prediccionProximaFeria, '1.2-2')}`,
        'Tendencia': 'Positiva',
        'Stock Sugerido': 'Abastecimiento Completo',
        'Confianza': 'Media'
      }
    ];

    return {
      'Resumen Ejecutivo': resumenEjecutivo,
      'Análisis ABC': analisisABC,
      'Resumen ABC': resumenABC,
      'Tendencia Ferias': tendenciaFerias,
      'Predicción': prediccion,
      'Ferias vs Tienda': feriasVsTienda,
      'Top Productos': topProductos,
    };
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

  paymentMethodsChartOptions = computed<ApexOptions>(() => {
    const methodsMap = this.reportData()?.ventasPorMetodoPago || {};
    const labels = Object.keys(methodsMap);
    const series = Object.values(methodsMap);

    // Si no hay datos, mostrar un gráfico vacío bonito
    if (series.length === 0) {
        return this.apexConfigService.getDonutChartConfig({
            series: [1],
            labels: ['Sin datos'],
            height: 280
        });
    }

    return this.apexConfigService.getDonutChartConfig({
      series: series,
      labels: labels,
      height: 280
    });
  });

  heatmapChartOptions = computed<ApexOptions>(() => {
    const data = this.reportData()?.ventasPorHora || [];
    
    // Generar matriz Días x Horas (Ej: Lunes a Domingo, 8am a 8pm)
    // Para simplificar, ApexCharts Heatmap espera series: [{ name: 'Lunes', data: [{x: '8am', y: 10}, {x: '9am', y: 20}] }]
    
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    
    const series = dias.map(dia => {
        const dataForDay = horas.map(hora => {
            const match = data.find(d => d.diaSemana === dia && d.hora === hora);
            return {
                x: `${hora}:00`,
                y: match ? match.ingresos : 0
            };
        });
        return { name: dia, data: dataForDay };
    });

    return this.apexConfigService.getHeatmapChartConfig({
      series: series,
      height: 350
    });
  });
}