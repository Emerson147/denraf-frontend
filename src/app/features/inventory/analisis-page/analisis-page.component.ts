import { Component, computed, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductService } from '../../../core/services/product.service';
import { ApexChartConfigService } from '../../../core/services/apex-chart-config.service';
import { BackendLiquidacionService } from '../../../core/services/backend-liquidacion.service';
import { UiPageHeaderComponent } from '../../../shared/ui/ui-page-header/ui-page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-analisis-page',
  standalone: true,
  // 🚀 Code-splitting: Esta ruta se lazy-loadea automáticamente en app.routes.ts
  imports: [
    CommonModule,
    NgApexchartsModule,
    UiPageHeaderComponent,
  ],
  templateUrl: './analisis-page.component.html',
  styleUrls: ['./analisis-page.component.css']
})
export class AnalisisPageComponent {
  private destroyRef = inject(DestroyRef);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private apexConfigService = inject(ApexChartConfigService);
  private backendLiquidacionService = inject(BackendLiquidacionService);

  // Servicios y datos inteligentes (Legacy retiene alertas básicas)
  metrics = this.inventoryService.metrics;
  stockAlerts = this.inventoryService.stockAlerts;
  criticalProducts = this.inventoryService.criticalProducts;
  highDemandProducts = this.inventoryService.highDemandProducts;
  lowRotationProducts = this.inventoryService.lowRotationProducts;
  reorderSuggestions = this.inventoryService.reorderSuggestions;
  productAnalytics = this.inventoryService.productAnalytics;
  
  // 🚀 CONEXIÓN A BACKEND SPRING BOOT: Modelo de Feria y Liquidación
  liquidacionData = toSignal(this.backendLiquidacionService.getLiquidaciones());

  resumenFinanciero = computed(() => {
    return this.liquidacionData()?.resumen || {
      totalCapital: 0, capitalActivo: 0, capitalLento: 0, capitalCongelado: 0,
      metaLiberacion: 0, ratioLiquidez: 0,
      productosCongelados: 0, productosLentos: 0, productosActivos: 0
    };
  });

  productosAnalizadosBackend = computed(() => this.liquidacionData()?.productos || []);

  capitalHealth = computed(() => {
    const res = this.resumenFinanciero();
    return {
      totalInvested: res.totalCapital,
      activeCapital: res.capitalActivo,
      slowCapital: res.capitalLento,
      frozenCapital: res.capitalCongelado,
      liquidityRatio: res.ratioLiquidez,
      targetLiberation: res.metaLiberacion
    };
  });

  liquidationSuggestions = computed(() => {
    // Tabla ROJA de liquidación (Productos en estado CONGELADO)
    const congelados = this.productosAnalizadosBackend().filter(p => p.estado === 'CONGELADO');
    return congelados.map(item => ({
      product: { id: item.productoId, name: item.nombre, stock: item.stock },
      costPrice: item.costo,
      currentPrice: item.precioActual,
      fairsWithoutSale: item.feriasSinVender,
      daysWithoutSale: item.diasSinVender,
      frozenCapital: item.capitalCongelado,
      liquidationPlan: {
        week1: { price: item.precioConDescuento20, profit: item.precioConDescuento20 - item.costo },
        week2: { price: item.precioConDescuento30, profit: item.precioConDescuento30 - item.costo },
        week3: { price: item.precioConDescuento40, profit: item.precioConDescuento40 - item.costo }
      }
    }));
  });

  frozenProducts = computed(() => {
    // Tarjeta "Estancados" (Status = CONGELADO)
    const congelados = this.productosAnalizadosBackend().filter(p => p.estado === 'CONGELADO');
    return congelados.map(item => ({
      product: { id: item.productoId, name: item.nombre, stock: item.stock },
      fairsSinceLastSale: item.feriasSinVender
    }));
  });

  basicProducts = computed(() => {
    // Tarjeta "Básicos" (Alta rotación) - Rotación de >= 2 por feria
    const basicos = this.productosAnalizadosBackend().filter(p => p.rotacionPorFeria >= 2);
    return basicos.map(item => ({
      product: { id: item.productoId, name: item.nombre, stock: item.stock },
      rotationPerFair: item.rotacionPorFeria,
      shouldReorder: item.stock < 10
    }));
  });

  productClassifications = computed(() => {
    // Tarjeta "Variedad" (Media/Baja rotación) - Todo el que no sea congelado ni alta rotación
    const variedad = this.productosAnalizadosBackend().filter(p => p.estado !== 'CONGELADO' && p.rotacionPorFeria < 2);
    return variedad.map(item => ({
      product: { id: item.productoId, name: item.nombre, stock: item.stock },
      classification: 'variedad',
      rotationPerFair: item.rotacionPorFeria,
      fairsSinceLastSale: item.feriasSinVender
    }));
  });
  
  // ( Legacy de compras en inventory.service.ts )
  productsToReorder = this.inventoryService.reorderSuggestions;
  
  // Computed para alertas de alta prioridad
  highPriorityAlertsCount = computed(() => 
    this.stockAlerts().filter(alert => alert.priority === 'high').length
  );
  
  // Fecha actual formateada
  currentDate = computed(() => {
    const today = new Date();
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]}`;
  });
  
  // Propiedades para acceder a funciones globales en el template
  readonly Infinity = Infinity;
  readonly isFinite = isFinite;

  // KPI: Valor Total del Inventario
  totalInventoryValue = this.productService.totalInventoryValue;

  // KPI: Productos con Stock Bajo
  lowStockCount = computed(() => {
    return this.metrics().lowStockProducts + this.metrics().criticalProducts;
  });

  // Gráfico de rotación de productos (Top 10 más vendidos)
  rotationChartOptions = computed<ApexOptions>(() => {
    const topProducts = this.highDemandProducts().slice(0, 10);
    
    return this.apexConfigService.getBarChartConfig({
      series: [{
        name: 'Rotación (und/día)',
        data: topProducts.map(p => Number(p.rotationRate.toFixed(2)))
      }],
      categories: topProducts.map(p => p.product.name.substring(0, 15)),
      height: 300,
      horizontal: true
    });
  });

  // Gráfico radial de estado del inventario
  inventoryStatusChartOptions = computed<ApexOptions>(() => {
    const m = this.metrics();
    const total = m.totalProducts;
    
    const healthy = total - m.criticalProducts - m.lowStockProducts - m.overstockedProducts;
    
    return this.apexConfigService.getDonutChartConfig({
      series: [
        healthy,
        m.lowStockProducts,
        m.criticalProducts,
        m.overstockedProducts
      ],
      labels: ['Saludable', 'Stock Bajo', 'Crítico', 'Sobrestock'],
      height: 300
    });
  });
}
