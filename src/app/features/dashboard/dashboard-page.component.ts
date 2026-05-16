import { Component, computed, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { 
  UiPageHeaderComponent,
  UiSkeletonComponent,
  PeriodSelectorComponent,
} from '../../shared/ui';
import { Period } from '../../shared/ui/period-selector/period-selector.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { ApexChartConfigService } from '../../core/services/apex-chart-config.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    NgApexchartsModule,
    UiPageHeaderComponent,
    UiSkeletonComponent,
    PeriodSelectorComponent
  ],
  providers: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private apexConfigService = inject(ApexChartConfigService);

  // Estado del Dashboard
  dashboardData = this.dashboardService.dashboardData;
  isLoading = this.dashboardService.isLoading;
  searchQuery = signal<string>('');

  // Tab activo para el bloque inferior "Bento"
  activeDashboardTab = signal<'topProductos' | 'stockBajo' | 'proyeccion'>('topProductos');

  ngOnInit() {
    // Carga inicial
    this.dashboardService.fetchDashboardData('semana');
  }

  // Configuración de gráficos ApexCharts (Ventas por Día)
  weeklyChartOptions = computed<ApexOptions>(() => {
    const data = this.dashboardData();
    const ventasPorDia = data?.ventasPorDia || {};
    
    // Object.keys(ventasPorDia) nos da ['Lunes', 'Martes', ...]
    const categories = Object.keys(ventasPorDia);
    const seriesData = Object.values(ventasPorDia);

    return this.apexConfigService.getAreaChartConfig({
      series: [
        {
          name: 'Ventas del Día',
          data: seriesData.length ? seriesData : [0,0,0,0,0,0,0]
        }
      ],
      categories: categories.length ? categories : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      height: 240
    });
  });

  // Datos formateados para exportación
  exportData = computed(() => {
    const data = this.dashboardData();
    if (!data) return {};

    const decimalPipe = new DecimalPipe('en-US');

    // 1. Resumen Ejecutivo
    const resumenEjecutivo = [
      { Métrica: 'Ingresos Totales', Valor: `S/ ${decimalPipe.transform(data.ingresosSemana || 0, '1.2-2')}` },
      { Métrica: 'Ganancia Neta', Valor: `S/ ${decimalPipe.transform(data.gananciaNeta || 0, '1.2-2')}` },
      { Métrica: 'Ticket Promedio', Valor: `S/ ${decimalPipe.transform(data.ticketPromedio || 0, '1.2-2')}` },
      { Métrica: 'Retorno de Inversión (ROI)', Valor: `${decimalPipe.transform(data.roi || 0, '1.1-1')}%` },
      { Métrica: 'Crecimiento Semanal', Valor: `${(data.crecimientoSemanal || 0) > 0 ? '+' : ''}${data.crecimientoSemanal || 0}%` },
    ];

    // 2. Ventas por Día
    const ventasPorDia = Object.entries(data.ventasPorDia || {}).map(([dia, monto]) => ({
      Día: dia,
      'Ingresos Generados': `S/ ${decimalPipe.transform(monto as number, '1.2-2')}`
    }));

    // 3. Top Productos
    const topProductos = (data.topProductos || []).map((p, i) => ({
      '#': i + 1,
      Producto: p.nombre,
      'Categoría': p.categoria,
      'Unidades': p.unidadesVendidas,
      'Ingresos': `S/ ${decimalPipe.transform(p.ingresos, '1.2-2')}`
    }));

    // 4. Stock Crítico
    const stockCritico = (data.productosStockBajo || []).map((p, i) => ({
      '#': i + 1,
      Producto: p.nombre,
      'Stock Actual': p.stock,
      'Mínimo Requerido': p.minStock
    }));

    // 5. Predicción
    const prediccion = [
      {
        'Próxima Feria': 'Pronóstico General',
        'Día': '-',
        'Ingreso Estimado': `S/ ${decimalPipe.transform(data.proyeccion?.ingresosEstimados || 0, '1.2-2')}`,
        'Ventas Estimadas': data.proyeccion?.ventasEstimadas || 0,
        'Stock Sugerido': 'Basado en proyecciones',
        'Confianza': data.proyeccion?.confianza === 'high' ? 'Alta' : data.proyeccion?.confianza === 'medium' ? 'Media' : 'Baja'
      }
    ];

    // 6. Actividad Reciente
    const actividadReciente = (data.actividadReciente || []).map(sale => ({
      'Nº Venta': sale.saleNumber,
      'Fecha': sale.createdAt,
      'Producto Principal': sale.productoPrincipal || 'Varios',
      'Método de Pago': sale.paymentMethod,
      'Estado': sale.status === 'completed' ? 'Completada' : sale.status === 'cancelled' ? 'Anulada' : 'Pendiente',
      'Monto Total': `S/ ${decimalPipe.transform(sale.total, '1.2-2')}`
    }));

    return {
      'Resumen Ejecutivo': resumenEjecutivo,
      'Ingresos por Día': ventasPorDia,
      'Predicción': prediccion,
      'Top Productos': topProductos,
      'Stock Crítico': stockCritico,
      'Actividad Reciente': actividadReciente
    };
  });

  /**
   * Maneja el cambio de período del selector.
   * Adaptado para soportar los endpoints de backend.
   */
  onPeriodChange(period: Period) {
    if (period.option === 'today') {
      this.dashboardService.fetchDashboardData('hoy');
    } else if (period.option === 'week') {
      this.dashboardService.fetchDashboardData('semana');
    } else if (period.option === 'month') {
      this.dashboardService.fetchDashboardData('mes');
    } else if (period.option === 'custom') {
      const startStr = period.startDate.toISOString().split('T')[0];
      const endStr = period.endDate.toISOString().split('T')[0];
      this.dashboardService.fetchDashboardData('custom', startStr, endStr);
    }
  }
}
