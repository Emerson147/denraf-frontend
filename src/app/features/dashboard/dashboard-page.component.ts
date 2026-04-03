import { Component, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { 
  UiInputComponent,
  UiButtonComponent,
  UiPageHeaderComponent,
  UiKpiCardComponent,
  UiExportMenuComponent,
  UiSkeletonComponent,
  PeriodSelectorComponent
} from '../../shared/ui';
import { ToastService } from '../../core/services/toast.service';
import { SalesService } from '../../core/services/sales.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { Sale } from '../../core/models';
import { ApexChartConfigService } from '../../core/services/apex-chart-config.service';
import { InventoryMovementService } from '../../core/services/inventory-movement.service';
import { AlertService } from '../../core/services/alert.service';
import { Period } from '../../shared/ui/period-selector/period-selector.component';

// MODELO DE PRODUCTO (Inventario)
interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  sizes: string[];
  cost: number;
  price: number;
  image: string | null;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  // 🚀 Code-splitting automático: Angular lazy-loadea esta ruta completa (dashboard + sus dependencias)
  imports: [
    CommonModule,
    NgApexchartsModule,
    UiInputComponent,
    UiButtonComponent,
    UiPageHeaderComponent,
    UiKpiCardComponent,
    UiExportMenuComponent,
    UiSkeletonComponent,
    PeriodSelectorComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
})
export class DashboardPageComponent {
  private toastService = inject(ToastService);
  private salesService = inject(SalesService);
  private analyticsService = inject(AnalyticsService);
  private apexConfigService = inject(ApexChartConfigService);
  private inventoryMovementService = inject(InventoryMovementService);
  private alertService = inject(AlertService);

  // 📅 Filtro de período seleccionado
  selectedPeriod = signal<Period | null>(null);

  // 🔄 Estado de carga
  isLoading = computed(() => this.salesService.isLoading());

  // Métricas de analytics
  profitMargin = this.analyticsService.profitMargin;
  roi = this.analyticsService.roi;
  averageTicket = this.analyticsService.averageTicket;
  conversionRate = this.analyticsService.conversionRate;
  topProfitableProducts = this.analyticsService.topProfitableProducts;
  weekComparison = this.analyticsService.weekComparison;
  weekComparisonChartData = this.analyticsService.weekComparisonChartData;
  salesForecast = this.analyticsService.salesForecast;

  // Configuración de gráficos ApexCharts
  weeklyChartOptions = computed<ApexOptions>(() => {
    const comparison = this.weekComparison();
    return this.apexConfigService.getAreaChartConfig({
      series: [
        {
          name: 'Esta semana',
          data: comparison.current.dailyData
        },
        {
          name: 'Semana anterior',
          data: comparison.previous.dailyData
        }
      ],
      categories: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      height: 240
    });
  });

  // Estado del formulario de búsqueda y dialogo
  searchQuery = signal<string>('');
  isDialogOpen = signal(false);
  dialogTrigger = signal<HTMLElement | null>(null);

  // Estado del formulario de producto
  newProductName = signal('');
  newProductCategory = signal('Casacas');
  newProductStock = signal<number>(0);
  newProductCost = signal<number>(0);
  newProductPrice = signal<number>(0);
  newProductSizes = signal<string[]>([]);
  newProductImage = signal<string | null>(null);

  // Computed para ganancia y margen
  newProductProfit = computed(() => {
    return this.newProductPrice() - this.newProductCost();
  });

  newProductMargin = computed(() => {
    const cost = this.newProductCost();
    const price = this.newProductPrice();
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  });

  // Lista de productos (simulado por ahora, pendiente ProductService)
  products = signal<Product[]>([]);

  // --- DATOS DEL DASHBOARD DESDE SALESSERVICE ---
  
  // KPIs principales (dinámicos según período seleccionado)
  todaySales = computed(() => {
    const period = this.selectedPeriod();
    if (!period) return this.salesService.todaySales();
    
    return this.salesService.allSales().filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= period.startDate && saleDate <= period.endDate;
    });
  });

  todayRevenue = computed(() => {
    return this.todaySales().reduce((sum, s) => sum + s.total, 0);
  });

  weeklySales = computed(() => {
    const period = this.selectedPeriod();
    if (!period) return this.salesService.weeklySales();
    
    return this.salesService.allSales().filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= period.startDate && saleDate <= period.endDate;
    });
  });

  weeklyRevenue = computed(() => {
    return this.weeklySales().reduce((sum, s) => sum + s.total, 0);
  });

  monthlySales = this.salesService.monthlySales;
  monthlyRevenue = this.salesService.monthlyRevenue;

  // Gráfico de ingresos semanales (últimos 7 días)
  weeklyRevenueChart = computed(() => {
    const days = 7;
    const today = new Date();
    const revenues: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const daySales = this.salesService.allSales().filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total, 0);
      revenues.push(dayRevenue);
    }

    return revenues;
  });

  // Ventas pendientes
  pendingSales = computed(() => {
    return this.salesService.allSales().filter(s => s.status === 'pending').length;
  });

  // Top productos desde ventas reales
  topProducts = this.salesService.topProducts;

  // 💰 Métricas financieras desde inventario
  todayInvestment = this.inventoryMovementService.todayInvestment;
  weeklyInvestment = this.inventoryMovementService.weeklyInvestment;
  monthlyInvestment = this.inventoryMovementService.monthlyInvestment;

  // ✨ Ganancia neta (Ingresos - Inversión)
  todayNetProfit = computed(() => this.todayRevenue() - this.todayInvestment());
  weeklyNetProfit = computed(() => this.weeklyRevenue() - this.weeklyInvestment());
  monthlyNetProfit = computed(() => this.monthlyRevenue() - this.monthlyInvestment());

  // 📅 Mejor día de ventas (según período seleccionado o últimos 30 días)
  bestSalesDayData = computed(() => {
    const period = this.selectedPeriod();
    let startDate: Date;
    let endDate: Date;
    
    if (period) {
      startDate = period.startDate;
      endDate = period.endDate;
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const salesByDay = new Map<string, { revenue: number; count: number; date: Date }>();
    
    this.salesService.allSales()
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      })
      .forEach(sale => {
        const dateKey = new Date(sale.date).toLocaleDateString('es-ES', { weekday: 'long' });
        const existing = salesByDay.get(dateKey) || { revenue: 0, count: 0, date: new Date(sale.date) };
        salesByDay.set(dateKey, {
          revenue: existing.revenue + sale.total,
          count: existing.count + 1,
          date: existing.date
        });
      });

    if (salesByDay.size === 0) {
      return { day: 'N/A', revenue: 0, count: 0 };
    }

    const best = Array.from(salesByDay.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)[0];
    
    return {
      day: best[0].charAt(0).toUpperCase() + best[0].slice(1),
      revenue: best[1].revenue,
      count: best[1].count
    };
  });

  // Productos con stock bajo (simulado, pendiente ProductService)
  lowStockProducts = signal([
    { name: 'Casaca Bomber', stock: 2, category: 'Casacas' },
    { name: 'Jean Slim Fit', stock: 3, category: 'Pantalones' },
    { name: 'Gorra Urbana', stock: 1, category: 'Accesorios' }
  ]);

  // Datos formateados para exportación
  exportData = computed(() => {
    return this.todaySales().map(sale => ({
      'Nº Venta': sale.saleNumber,
      'Fecha': new Date(sale.date).toLocaleDateString('es-PE'),
      'Cliente': sale.customer?.name || 'Cliente General',
      'Items': sale.items?.length || 0,
      'Subtotal': sale.subtotal,
      'Descuento': sale.discount,
      'Total': sale.total,
      'Estado': sale.status === 'completed' ? 'Completada' : sale.status === 'pending' ? 'Pendiente' : 'Cancelada'
    }));
  });

  // ACCIÓN: Abrir panel
  // ACCIÓN: Abrir panel de nuevo producto
  openNewOrder(event?: Event | HTMLElement) {
    const target = (event instanceof Event ? event.target : event) as HTMLElement;
    this.dialogTrigger.set(target || null);
    this.isDialogOpen.set(true);
  }

  // --- MÉTODOS PARA EL FORMULARIO DE PRODUCTO ---

  toggleSize(size: string) {
    this.newProductSizes.update((sizes) => {
      if (sizes.includes(size)) {
        return sizes.filter((s) => s !== size);
      } else {
        return [...sizes, size];
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.newProductImage.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  saveProduct() {
    const newProduct: Product = {
      id: `PROD-${Math.floor(Math.random() * 10000)}`,
      name: this.newProductName(),
      category: this.newProductCategory(),
      stock: this.newProductStock(),
      sizes: this.newProductSizes(),
      cost: this.newProductCost(),
      price: this.newProductPrice(),
      image: this.newProductImage(),
    };

    this.products.update((prev) => [newProduct, ...prev]);

    this.toastService.success(`Producto "${newProduct.name}" agregado correctamente`);
    this.isDialogOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.newProductName.set('');
    this.newProductCategory.set('Casacas');
    this.newProductStock.set(0);
    this.newProductCost.set(0);
    this.newProductPrice.set(0);
    this.newProductSizes.set(['M']); // Default 'M'
    this.newProductImage.set(null);
  }

  /**
   * 📅 Maneja el cambio de período del selector
   */
  onPeriodChange(period: Period) {
    this.selectedPeriod.set(period);
    
    // Actualizar el período en AnalyticsService para que todos los computed se recalculen
    this.analyticsService.setPeriod(period.startDate, period.endDate);
  }

  // 🚀 FUNCIONES TRACKBY PARA OPTIMIZACIÓN DE PERFORMANCE
  trackBySaleId(_index: number, sale: Sale): string {
    return sale.id;
  }

  trackByProductName(_index: number, product: any): string {
    return product.name;
  }

  trackByLowStockProduct(_index: number, product: any): string {
    return product.name + product.category;
  }
}
