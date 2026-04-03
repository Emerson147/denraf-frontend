import { Component, computed, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { 
  UiInputComponent,
  UiButtonComponent,
  UiPageHeaderComponent,
  UiKpiCardComponent,
  UiExportMenuComponent,
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
    UiInputComponent,
    UiPageHeaderComponent,
    UiKpiCardComponent,
    UiExportMenuComponent,
    UiSkeletonComponent,
    PeriodSelectorComponent,
    UiButtonComponent
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

  // Datos formateados para exportación de Actividad Reciente
  exportData = computed(() => {
    const act = this.dashboardData()?.actividadReciente || [];
    return act.map(sale => ({
      'Nº Venta': sale.saleNumber,
      'Fecha': sale.createdAt,
      'Producto Principal': sale.productoPrincipal || 'Varios / No especificado',
      'Metodo de Pago': sale.paymentMethod,
      'Estado': sale.status,
      'Monto Total': sale.total
    }));
  });

  /**
   * Maneja el cambio de período del selector.
   * Adaptado para soportar los endpoints de backend.
   */
  onPeriodChange(period: Period) {
    let param = 'semana';
    
    const diffTime = Math.abs(period.endDate.getTime() - period.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) param = 'hoy';
    else if (diffDays <= 7) param = 'semana';
    else param = 'mes';

    this.dashboardService.fetchDashboardData(param);
  }
}
