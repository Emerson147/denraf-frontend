import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPageHeaderComponent } from '../../../shared/ui/ui-page-header/ui-page-header.component';
import { UiEmptyStateComponent } from '../../../shared/ui/ui-empty-state/ui-empty-state.component';
import { UiExportMenuComponent } from '../../../shared/ui/ui-export-menu/ui-export-menu.component';
import { UiTicketComponent } from '../../../shared/ui/ui-ticket/ui-ticket.component';
import { SalesService } from '../../../core/services/sales.service';
import { AuthService } from '../../../core/auth/auth';
import { LoggerService } from '../../../core/services/logger.service';
import { Sale, SaleItem } from '../../../core/models';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    UiPageHeaderComponent,
    UiEmptyStateComponent,
    UiExportMenuComponent,
    UiTicketComponent,
  ],
  templateUrl: './sales-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
})
export class SalesHistoryComponent {
  private salesService = inject(SalesService);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

  // ViewChild para enfoque automático
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // 🔥 ATAJOS DE TECLADO PROFESIONALES
  @HostListener('window:keydown.f2', ['$event'])
  onF2Key(event: Event) {
    event.preventDefault();
    this.searchInput?.nativeElement?.focus();
    this.searchInput?.nativeElement?.select();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    event.preventDefault();
    if (this.selectedSale()) {
      this.closeDetails();
    }
  }

  @HostListener('window:keydown.1', ['$event'])
  onKey1(event: Event) {
    if ((event.target as HTMLElement).tagName !== 'INPUT') {
      event.preventDefault();
      this.selectedPeriod.set('today');
    }
  }

  @HostListener('window:keydown.2', ['$event'])
  onKey2(event: Event) {
    if ((event.target as HTMLElement).tagName !== 'INPUT') {
      event.preventDefault();
      this.selectedPeriod.set('week');
    }
  }

  @HostListener('window:keydown.3', ['$event'])
  onKey3(event: Event) {
    if ((event.target as HTMLElement).tagName !== 'INPUT') {
      event.preventDefault();
      this.selectedPeriod.set('month');
    }
  }

  @HostListener('window:keydown.4', ['$event'])
  onKey4(event: Event) {
    if ((event.target as HTMLElement).tagName !== 'INPUT') {
      event.preventDefault();
      this.selectedPeriod.set('all');
    }
  }

  // Filtros
  searchQuery = signal('');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'all'>('today');
  selectedPayment = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);
  selectedVendor = signal<string | null>(null); // Filtro por vendedor

  // Lista de usuarios disponibles (dinámica desde AuthService)
  availableUsers = () => this.authService.getAvailableUsers();

  constructor() {
    // SalesService se inicializa automáticamente con Supabase-first
    // Las ventas se cargan automáticamente al iniciar

    // Escuchar actualizaciones de ventas offline sincronizadas
    window.addEventListener('sales-updated', () => {
      console.log('📡 Detectado evento sales-updated');
      // Las ventas se actualizan automáticamente mediante signals
    });
  }

  // Ventas filtradas
  filteredSales = computed(() => {
    let sales = this.salesService.allSales();

    // Filtro por período
    switch (this.selectedPeriod()) {
      case 'today':
        sales = this.salesService.todaySales();
        break;
      case 'week':
        sales = this.salesService.weeklySales();
        break;
      case 'month':
        sales = this.salesService.monthlySales();
        break;
    }

    // Filtro por búsqueda
    const query = this.searchQuery().toLowerCase();
    if (query) {
      sales = sales.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(query) ||
          s.customer?.name.toLowerCase().includes(query) ||
          s.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    }

    // Filtro por método de pago
    if (this.selectedPayment()) {
      sales = sales.filter((s) => s.paymentMethod === this.selectedPayment());
    }

    // Filtro por estado
    if (this.selectedStatus()) {
      sales = sales.filter((s) => s.status === this.selectedStatus());
    }

    // Filtro por vendedor
    if (this.selectedVendor()) {
      sales = sales.filter((s) => s.vendedorId === this.selectedVendor());
    }

    return sales;
  });

  // Resumen de ventas filtradas
  summary = computed(() => {
    const sales = this.filteredSales();
    return {
      count: sales.length,
      total: sales.reduce((sum, s) => sum + s.total, 0),
      average: sales.length > 0 ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length : 0,
    };
  });

  // Venta seleccionada para ver detalles
  selectedSale = signal<Sale | null>(null);

  // 📊 Datos formateados para exportación EMPRESARIAL (multi-sección)
  exportData = computed(() => {
    const sales = this.filteredSales();
    const summary = this.summary();
    const periodLabel = this.periodLabel();

    // Si no hay ventas, retornar solo el resumen
    if (sales.length === 0) {
      return {
        'Resumen Ejecutivo': [
          { Métrica: 'Período', Valor: periodLabel },
          { Métrica: 'Total Ventas', Valor: '0' },
          { Métrica: 'Ingresos', Valor: 'S/ 0.00' },
          { Métrica: 'Ticket Promedio', Valor: 'S/ 0.00' },
        ],
        Ventas: [],
      };
    }

    // 📈 SECCIÓN 1: Resumen Ejecutivo
    const ventasCompletadas = sales.filter((s) => s.status === 'completed');
    const ventasAnuladas = sales.filter((s) => s.status === 'cancelled');

    // Métodos de pago
    const byPaymentMethod: Record<string, number> = {};
    sales.forEach((s) => {
      const method = this.getPaymentMethodLabel(s.paymentMethod);
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + 1;
    });
    const metodoPago = Object.entries(byPaymentMethod)
      .map(([method, count]) => `${method}: ${count}`)
      .join(', ');

    // Tipo de venta
    const byVentaType: Record<string, number> = {};
    sales.forEach((s) => {
      const tipo = s.saleType || 'tienda';
      byVentaType[tipo] = (byVentaType[tipo] || 0) + 1;
    });

    const resumenEjecutivo = [
      { Métrica: 'Período', Valor: periodLabel },
      { Métrica: 'Total Ventas', Valor: summary.count.toString() },
      { Métrica: 'Ventas Completadas', Valor: ventasCompletadas.length.toString() },
      { Métrica: 'Ventas Anuladas', Valor: ventasAnuladas.length.toString() },
      { Métrica: 'Ingresos Totales', Valor: `S/ ${summary.total.toFixed(2)}` },
      { Métrica: 'Ticket Promedio', Valor: `S/ ${summary.average.toFixed(2)}` },
      { Métrica: 'Métodos de Pago', Valor: metodoPago },
      { Métrica: 'Fecha Generación', Valor: new Date().toLocaleString('es-PE') },
    ];

    // 📋 SECCIÓN 2: Resumen por Vendedor
    const byVendedor: Record<string, { count: number; total: number }> = {};
    sales.forEach((s) => {
      const vendedor = this.getVendorName(s.vendedorId);
      if (!byVendedor[vendedor]) {
        byVendedor[vendedor] = { count: 0, total: 0 };
      }
      byVendedor[vendedor].count++;
      byVendedor[vendedor].total += s.total;
    });

    const resumenVendedores = Object.entries(byVendedor).map(([vendedor, stats]) => ({
      Vendedor: vendedor,
      'N° Ventas': stats.count,
      'Total Vendido': `S/ ${stats.total.toFixed(2)}`,
      Promedio: `S/ ${(stats.total / stats.count).toFixed(2)}`,
    }));

    // 📝 SECCIÓN 3: Listado de Ventas
    const ventasListado = sales.map((sale) => ({
      'N° Venta': sale.saleNumber,
      Fecha: new Date(sale.date).toLocaleDateString('es-PE'),
      Hora: new Date(sale.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      Vendedor: this.getVendorName(sale.vendedorId),
      Cliente: sale.customer?.name || 'Cliente General',
      Teléfono: sale.customer?.phone || '-',
      Productos: sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
      'N° Items': sale.items.reduce((sum, i) => sum + i.quantity, 0),
      Subtotal: `S/ ${sale.subtotal.toFixed(2)}`,
      IGV: `S/ ${(sale.total - sale.subtotal).toFixed(2)}`,
      Descuento: sale.discount > 0 ? `S/ ${sale.discount.toFixed(2)}` : '-',
      Total: `S/ ${sale.total.toFixed(2)}`,
      'Método Pago': this.getPaymentMethodLabel(sale.paymentMethod),
      'Tipo Venta':
        sale.saleType === 'feria-acobamba'
          ? 'Feria Acobamba'
          : sale.saleType === 'feria-paucara'
          ? 'Feria Paucara'
          : 'Tienda',
      Estado:
        sale.status === 'completed'
          ? 'Completada'
          : sale.status === 'pending'
          ? 'Pendiente'
          : 'Anulada',
      Notas: sale.notes || '-',
    }));

    // 📦 SECCIÓN 4: Detalle de Productos Vendidos
    const detalleProductos: any[] = [];
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        detalleProductos.push({
          'N° Venta': sale.saleNumber,
          Fecha: new Date(sale.date).toLocaleDateString('es-PE'),
          Vendedor: this.getVendorName(sale.vendedorId),
          Producto: item.productName,
          Talla: item.size || '-',
          Color: item.color || '-',
          Cantidad: item.quantity,
          'Precio Unit.': `S/ ${item.unitPrice.toFixed(2)}`,
          Subtotal: `S/ ${item.subtotal.toFixed(2)}`,
          Cliente: sale.customer?.name || 'Cliente General',
        });
      });
    });

    // 📊 SECCIÓN 5: Top Productos
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      });
    });

    const topProductos = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20)
      .map((p, idx) => ({
        '#': idx + 1,
        Producto: p.name,
        'Unidades Vendidas': p.quantity,
        Ingresos: `S/ ${p.revenue.toFixed(2)}`,
      }));

    return {
      'Resumen Ejecutivo': resumenEjecutivo,
      'Por Vendedor': resumenVendedores,
      Ventas: ventasListado,
      'Detalle Productos': detalleProductos,
      'Top Productos': topProductos,
    };
  });

  // Texto descriptivo del período actual
  periodLabel = computed(() => {
    const labels = {
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      all: 'Todas',
    };
    return labels[this.selectedPeriod()];
  });

  // 🎫 Estado para modal de anulación
  cancelModalOpen = signal(false);
  saleToCancel = signal<Sale | null>(null);
  cancelReason = signal('');
  restoreStock = signal(true);

  // 🔄 Estado para reimprimir ticket
  showTicketModal = signal(false);
  ticketSale = signal<Sale | null>(null);

  viewSaleDetails(sale: Sale) {
    this.selectedSale.set(sale);
  }

  closeDetails() {
    this.selectedSale.set(null);
  }

  // 🖨️ Reimprimir ticket
  reprintTicket(sale: Sale) {
    this.ticketSale.set(sale);
    this.showTicketModal.set(true);
    this.logger.log('🖨️ Reimprimiendo ticket:', sale.saleNumber);
  }

  closeTicketModal() {
    this.showTicketModal.set(false);
    this.ticketSale.set(null);
  }

  // ❌ Abrir modal de anulación
  openCancelModal(sale: Sale) {
    this.saleToCancel.set(sale);
    this.cancelReason.set('');
    this.restoreStock.set(true);
    this.cancelModalOpen.set(true);
  }

  closeCancelModal() {
    this.cancelModalOpen.set(false);
    this.saleToCancel.set(null);
    this.cancelReason.set('');
  }

  // ✅ Confirmar anulación
  confirmCancelSale() {
    const sale = this.saleToCancel();
    if (!sale) return;

    const success = this.salesService.cancelSale(
      sale.id,
      this.cancelReason() || 'Sin motivo especificado',
      this.restoreStock()
    );

    if (success) {
      this.closeCancelModal();
    }
  }

  // 🎟️ Transformar items de venta a formato de ticket
  getTicketItems(
    sale: Sale
  ): { product: { id: string; name: string; price: number }; quantity: number }[] {
    return sale.items.map((item) => ({
      product: {
        id: item.productId,
        name: item.productName,
        price: item.unitPrice,
      },
      quantity: item.quantity,
    }));
  }

  // 🔢 Extraer número de ticket del saleNumber (e.g., "V-20260107-123456" -> 123456)
  getTicketNumber(saleNumber: string): number {
    const match = saleNumber.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  exportSales() {
    const json = this.salesService.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-denraf-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 📄 EXPORTAR PDF ZEN MINIMALISTA COMPLETO
  // Incluye TODAS las secciones: Resumen, Vendedores, Ventas, Detalle, Top Productos
  async exportToZenPDF() {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const sales = this.filteredSales();
    const summary = this.summary();
    const periodLabel = this.periodLabel();
    if (sales.length === 0) {
      alert('No hay ventas para exportar');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    let y = 0;

    // ═══════════════════════════════════════════════════════════════════
    // 🎨 PALETA ZEN MINIMALISTA (Inspirada en piedra natural)
    // ═══════════════════════════════════════════════════════════════════
    const colors = {
      // Tonos piedra (base)
      stone950: [12, 10, 9] as [number, number, number],
      stone900: [28, 25, 23] as [number, number, number],
      stone700: [68, 64, 60] as [number, number, number],
      stone600: [87, 83, 78] as [number, number, number],
      stone500: [120, 113, 108] as [number, number, number],
      stone400: [168, 162, 158] as [number, number, number],
      stone300: [214, 211, 209] as [number, number, number],
      stone200: [231, 229, 228] as [number, number, number],
      stone100: [245, 245, 244] as [number, number, number],
      stone50: [250, 250, 249] as [number, number, number],
      // Acentos zen sutiles
      teal700: [15, 118, 110] as [number, number, number],
      teal600: [13, 148, 136] as [number, number, number],
      amber600: [217, 119, 6] as [number, number, number],
      amber500: [245, 158, 11] as [number, number, number],
      emerald600: [5, 150, 105] as [number, number, number],
      rose600: [225, 29, 72] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    };

    // ═══════════════════════════════════════════════════════════════════
    // 🔧 UTILIDADES DE DISEÑO
    // ═══════════════════════════════════════════════════════════════════
    const margin = { left: 16, right: 16, top: 20 };
    const contentWidth = pw - margin.left - margin.right;

    const drawLine = (yPos: number, color = colors.stone200, thickness = 0.3) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(thickness);
      doc.line(margin.left, yPos, pw - margin.right, yPos);
    };

    const drawSectionHeader = (title: string, icon: string, yPos: number): number => {
      // Bullet decorativo
      doc.setFillColor(...colors.stone700);
      doc.circle(margin.left + 2, yPos - 1.5, 1.5, 'F');

      // Título de sección
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.stone900);
      doc.text(title, margin.left + 8, yPos);

      return yPos + 8;
    };

    const addPage = () => {
      doc.addPage();
      y = margin.top;
      return y;
    };

    const checkPageBreak = (neededSpace: number): number => {
      if (y + neededSpace > ph - 25) {
        return addPage();
      }
      return y;
    };

    // ═══════════════════════════════════════════════════════════════════
    // 📊 CALCULAR ESTADÍSTICAS AVANZADAS
    // ═══════════════════════════════════════════════════════════════════
    const ventasCompletadas = sales.filter((s) => s.status === 'completed');
    const ventasAnuladas = sales.filter((s) => s.status === 'cancelled');
    const totalCompletadas = ventasCompletadas.reduce((sum, s) => sum + s.total, 0);

    // Por método de pago
    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    sales.forEach((s) => {
      const method = this.getPaymentMethodLabel(s.paymentMethod);
      if (!byPaymentMethod[method]) byPaymentMethod[method] = { count: 0, total: 0 };
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += s.total;
    });

    // Por vendedor
    const byVendedor: Record<string, { count: number; total: number }> = {};
    sales.forEach((s) => {
      const vendedor = this.getVendorName(s.vendedorId);
      if (!byVendedor[vendedor]) byVendedor[vendedor] = { count: 0, total: 0 };
      byVendedor[vendedor].count++;
      byVendedor[vendedor].total += s.total;
    });

    // Por tipo de venta
    const byTipoVenta: Record<string, { count: number; total: number }> = {};
    sales.forEach((s) => {
      const tipo =
        s.saleType === 'feria-acobamba'
          ? 'Feria Acobamba'
          : s.saleType === 'feria-paucara'
          ? 'Feria Paucara'
          : 'Tienda';
      if (!byTipoVenta[tipo]) byTipoVenta[tipo] = { count: 0, total: 0 };
      byTipoVenta[tipo].count++;
      byTipoVenta[tipo].total += s.total;
    });

    // Top productos
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.qty += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            qty: item.quantity,
            revenue: item.subtotal,
          });
        }
      });
    });
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 15);

    // ═══════════════════════════════════════════════════════════════════
    // 📄 PÁGINA 1: PORTADA + RESUMEN EJECUTIVO
    // ═══════════════════════════════════════════════════════════════════
    y = 22;

    // === HEADER MINIMALISTA ===
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.stone900);
    doc.text('Historial de Ventas', margin.left, y);
    y += 6;

    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.stone500);
    doc.text('DenRaf · Reporte detallado de transacciones', margin.left, y);
    y += 10;

    // Línea separadora elegante
    drawLine(y, colors.stone300, 0.5);
    y += 8;

    // === METADATA DEL REPORTE ===
    doc.setFontSize(9);
    doc.setTextColor(...colors.stone600);
    const dateGenerated = new Date().toLocaleString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generado: ${dateGenerated}`, margin.left, y);
    doc.text(`Período: ${periodLabel}`, pw / 2, y);
    y += 12;

    // === MÉTRICAS PRINCIPALES (Estilo dashboard) ===
    const metricBoxWidth = (contentWidth - 10) / 3;
    const metricBoxHeight = 28;
    const metrics = [
      {
        label: 'Total Ventas',
        value: summary.count.toString(),
        unit: 'transacciones',
        color: colors.stone700,
      },
      {
        label: 'Ingresos',
        value: `S/ ${summary.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
        unit: '',
        color: colors.amber600,
      },
      {
        label: 'Ticket Promedio',
        value: `S/ ${summary.average.toFixed(2)}`,
        unit: '',
        color: colors.teal600,
      },
    ];

    metrics.forEach((metric, idx) => {
      const x = margin.left + idx * (metricBoxWidth + 5);

      // Fondo sutil
      doc.setFillColor(...colors.stone100);
      doc.roundedRect(x, y, metricBoxWidth, metricBoxHeight, 3, 3, 'F');

      // Etiqueta
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.stone500);
      doc.text(metric.label.toUpperCase(), x + 5, y + 8);

      // Valor grande
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...metric.color);
      doc.text(metric.value, x + 5, y + 18);

      // Unidad (si existe)
      if (metric.unit) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.stone400);
        doc.text(metric.unit, x + 5, y + 24);
      }
    });
    y += metricBoxHeight + 12;

    // === RESUMEN DE ESTADO ===
    drawLine(y - 4, colors.stone200, 0.2);
    y += 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const ventasPendientes = sales.filter((s) => s.status === 'pending').length;

    doc.setTextColor(...colors.emerald600);
    doc.text(
      `[OK] Completadas: ${ventasCompletadas.length} (S/ ${totalCompletadas.toFixed(2)})`,
      margin.left,
      y
    );
    doc.setTextColor(...colors.rose600);
    doc.text(`[X] Anuladas: ${ventasAnuladas.length}`, margin.left + 80, y);
    doc.setTextColor(...colors.stone500);
    doc.text(`[...] Pendientes: ${ventasPendientes}`, margin.left + 120, y);
    y += 12;

    // ═══════════════════════════════════════════════════════════════════
    // 📊 SECCIÓN: DESGLOSE POR MÉTODO DE PAGO
    // ═══════════════════════════════════════════════════════════════════
    y = drawSectionHeader('Métodos de Pago', '💳', y);

    const paymentData = Object.entries(byPaymentMethod).map(([method, stats]) => [
      method,
      stats.count.toString(),
      `S/ ${stats.total.toFixed(2)}`,
      `${((stats.count / summary.count) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Método', 'N° Ventas', 'Total', '%']],
      body: paymentData,
      theme: 'plain',
      headStyles: {
        fillColor: colors.stone100,
        textColor: colors.stone700,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.stone700 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 20 },
      },
      margin: { left: margin.left, right: margin.right },
      tableWidth: contentWidth * 0.7,
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ═══════════════════════════════════════════════════════════════════
    // 📊 SECCIÓN: TIPOS DE VENTA
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(40);
    y = drawSectionHeader('Tipos de Venta', '🏪', y);

    const tipoData = Object.entries(byTipoVenta).map(([tipo, stats]) => [
      tipo,
      stats.count.toString(),
      `S/ ${stats.total.toFixed(2)}`,
      `${((stats.total / summary.total) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Ventas', 'Total', '% Ingresos']],
      body: tipoData,
      theme: 'plain',
      headStyles: {
        fillColor: colors.stone100,
        textColor: colors.stone700,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.stone700 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 25 },
      },
      margin: { left: margin.left, right: margin.right },
      tableWidth: contentWidth * 0.7,
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ═══════════════════════════════════════════════════════════════════
    // 👥 SECCIÓN: RENDIMIENTO POR VENDEDOR
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(50);
    y = drawSectionHeader('Rendimiento por Vendedor', '👤', y);

    const vendedorData = Object.entries(byVendedor)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([vendedor, stats], idx) => [
        (idx + 1).toString(),
        vendedor,
        stats.count.toString(),
        `S/ ${stats.total.toFixed(2)}`,
        `S/ ${(stats.total / stats.count).toFixed(2)}`,
        `${((stats.total / summary.total) * 100).toFixed(1)}%`,
      ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Vendedor', 'N° Ventas', 'Total Vendido', 'Ticket Prom.', '% Total']],
      body: vendedorData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.stone900,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.stone700 },
      alternateRowStyles: { fillColor: colors.stone50 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 20 },
      },
      margin: { left: margin.left, right: margin.right },
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // ═══════════════════════════════════════════════════════════════════
    // 🏆 SECCIÓN: TOP PRODUCTOS
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(60);
    y = drawSectionHeader('Top Productos Vendidos', '📦', y);

    const topData = topProducts.map((p, idx) => [
      (idx + 1).toString(),
      p.name.length > 35 ? p.name.substring(0, 35) + '...' : p.name,
      p.qty.toString(),
      `S/ ${p.revenue.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Producto', 'Unidades', 'Ingresos']],
      body: topData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.teal700,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.stone700 },
      alternateRowStyles: { fillColor: colors.stone50 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 95 },
        2: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
      },
      margin: { left: margin.left, right: margin.right },
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // ═══════════════════════════════════════════════════════════════════
    // 📋 SECCIÓN: LISTADO COMPLETO DE VENTAS
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(30);
    doc.addPage(); // Nueva página para el listado completo
    y = margin.top;

    y = drawSectionHeader(`Listado Completo de Ventas (${sales.length} registros)`, '📑', y);

    const ventasTableData = sales.map((s) => [
      s.saleNumber,
      new Date(s.date).toLocaleDateString('es-PE'),
      new Date(s.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      this.getVendorName(s.vendedorId),
      (s.customer?.name || 'General').length > 18
        ? (s.customer?.name || 'General').substring(0, 18) + '...'
        : s.customer?.name || 'General',
      s.items.length.toString(),
      this.getPaymentMethodLabel(s.paymentMethod),
      `S/ ${s.total.toFixed(2)}`,
      s.status === 'completed' ? 'OK' : s.status === 'cancelled' ? 'ANUL' : 'PEND',
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        ['N° Venta', 'Fecha', 'Hora', 'Vendedor', 'Cliente', 'Items', 'Pago', 'Total', 'Estado'],
      ],
      body: ventasTableData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.stone900,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2.5,
        halign: 'left',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        textColor: colors.stone700,
      },
      alternateRowStyles: { fillColor: colors.stone50 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20 },
        2: { cellWidth: 14 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 22 },
        7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      },
      margin: { top: margin.top, left: margin.left, right: margin.right },
      didParseCell: (data: any) => {
        if (data.column.index === 8 && data.section === 'body') {
          if (data.cell.raw === 'OK') data.cell.styles.textColor = colors.emerald600;
          else if (data.cell.raw === 'ANUL') data.cell.styles.textColor = colors.rose600;
          else if (data.cell.raw === 'PEND') data.cell.styles.textColor = colors.amber600;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // ═══════════════════════════════════════════════════════════════════
    // 📦 SECCIÓN: DETALLE DE PRODUCTOS VENDIDOS
    // ═══════════════════════════════════════════════════════════════════
    if (sales.length <= 50) {
      // Solo si no hay demasiados registros
      y = checkPageBreak(30);
      if (y < 50) {
        doc.addPage();
        y = margin.top;
      }

      y = drawSectionHeader('Detalle de Productos por Venta', '🧾', y);

      const detalleData: any[] = [];
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          detalleData.push([
            sale.saleNumber,
            new Date(sale.date).toLocaleDateString('es-PE'),
            item.productName.length > 28
              ? item.productName.substring(0, 28) + '...'
              : item.productName,
            item.size || '-',
            item.quantity.toString(),
            `S/ ${item.unitPrice.toFixed(2)}`,
            `S/ ${item.subtotal.toFixed(2)}`,
          ]);
        });
      });

      autoTable(doc, {
        startY: y,
        head: [['N° Venta', 'Fecha', 'Producto', 'Talla', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: detalleData,
        theme: 'striped',
        headStyles: {
          fillColor: colors.stone700,
          textColor: colors.white,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2.5,
        },
        styles: { fontSize: 6.5, cellPadding: 1.8, textColor: colors.stone600 },
        alternateRowStyles: { fillColor: colors.stone50 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 18 },
          2: { cellWidth: 55 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 12, halign: 'center' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin.left, right: margin.right },
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📄 FOOTER EN TODAS LAS PÁGINAS
    // ═══════════════════════════════════════════════════════════════════
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Línea separadora del footer
      doc.setDrawColor(...colors.stone200);
      doc.setLineWidth(0.3);
      doc.line(margin.left, ph - 15, pw - margin.right, ph - 15);

      // Texto del footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.stone400);
      doc.text(`DenRaf · Historial de Ventas · ${periodLabel}`, margin.left, ph - 10);
      doc.text(`Página ${p} de ${totalPages}`, pw - margin.right, ph - 10, { align: 'right' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 💾 GUARDAR PDF
    // ═══════════════════════════════════════════════════════════════════
    const filename = `ventas-denraf-${periodLabel.toLowerCase().replace(/\s+/g, '-')}-${
      new Date().toISOString().split('T')[0]
    }.pdf`;
    doc.save(filename);
    this.logger.log('📄 PDF Zen exportado:', filename);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      yape: 'Yape',
      plin: 'Plin',
    };
    return labels[method] || method;
  }

  getStatusBadge(status: string) {
    const badges: Record<string, { label: string; class: string }> = {
      completed: {
        label: 'Completada',
        class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
      },
      pending: {
        label: 'Pendiente',
        class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
      },
      cancelled: {
        label: 'Cancelada',
        class: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
      },
    };
    return (
      badges[status] || {
        label: status,
        class: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
      }
    );
  }

  getVendorName(vendedorId: string): string {
    const user = this.authService.getAvailableUsers().find((u) => u.id === vendedorId);
    return user?.name || 'Usuario';
  }

  getVendorInitial(vendedorId: string): string {
    const name = this.getVendorName(vendedorId);
    return name.charAt(0).toUpperCase();
  }

  getVendorColor(vendedorId: string): string {
    const colors: Record<string, string> = {
      'user-1': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
      'user-2': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
      'user-3': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    };
    return (
      colors[vendedorId] || 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
    );
  }

  // 🚀 FUNCIONES TRACKBY PARA OPTIMIZACIÓN DE PERFORMANCE
  trackBySaleId(_index: number, sale: Sale): string {
    return sale.id;
  }

  trackByVendor(_index: number, vendor: string): string {
    return vendor;
  }
}
