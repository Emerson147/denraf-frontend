import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  ElementRef,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiPageHeaderComponent } from '../../../shared/ui/ui-page-header/ui-page-header.component';
import { UiEmptyStateComponent } from '../../../shared/ui/ui-empty-state/ui-empty-state.component';
import { UiExportMenuComponent } from '../../../shared/ui/ui-export-menu/ui-export-menu.component';
import { UiTicketComponent } from '../../../shared/ui/ui-ticket/ui-ticket.component';
import { SalesService } from '../../../core/services/sales.service';
import { BackendAuthService, UserDTO } from '../../../core/services/backend-auth.service';
import { LoggerService } from '../../../core/services/logger.service';
import { ExportService } from '../../../core/services/export.service';
import { Sale } from '../../../core/models';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiPageHeaderComponent,
    UiEmptyStateComponent,
    UiExportMenuComponent,
    UiTicketComponent,
  ],
  templateUrl: './sales-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesHistoryComponent {
  salesService = inject(SalesService);
  private authService = inject(BackendAuthService);
  private logger = inject(LoggerService);
  private exportService = inject(ExportService);

  availableUsers: UserDTO[] = [];

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // 🔥 ATAJOS DE TECLADO
  @HostListener('window:keydown.f2', ['$event'])
  onF2Key(event: Event) {
    event.preventDefault();
    this.searchInput?.nativeElement?.focus();
    this.searchInput?.nativeElement?.select();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    event.preventDefault();
    if (this.selectedSale()) this.closeDetails();
  }

  // Paginación y Filtros de Estado
  searchQuery = signal('');
  selectedPeriod = signal<'today' | 'week' | 'month' | 'all'>('all');

  constructor() {
    this.authService.getUsers().subscribe((users) => (this.availableUsers = users));
    // Escuchar cambios de periodo de manera reactiva para volver a pedir a backend
    effect(() => {
      const period = this.selectedPeriod();
      untracked(() => {
        let filters: any = {};
        const now = new Date();

        // Evitar toISOString() puro porque convierte a UTC y causa desfase de 5 horas (Perú)
        // Ocultando las ventas hechas en la madrugada (antes de las 5 AM).
        const toLocalISOString = (date: Date) => {
          const pad = (n: number) => n < 10 ? '0' + n : n;
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        if (period === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          filters.desde = toLocalISOString(start);
          filters.hasta = toLocalISOString(end);
        } else if (period === 'week') {
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Lunes como inicio
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          filters.desde = toLocalISOString(start);
          filters.hasta = toLocalISOString(end);
        } else if (period === 'month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          filters.desde = toLocalISOString(start);
          filters.hasta = toLocalISOString(end);
        }

        // Para UX fluída pasaremos 0 page siempre que cambiemos filtro
        this.salesService.fetchPaginatedSales(0, this.salesService.pageSize(), filters);
      });
    });
  }

  // Las ventas vienen "paginadas" pero asumimos chunk largo o local de momento
  filteredSales = computed(() => {
    let sales = this.salesService.sales();

    // Filtro Texto Libre de Interfaz
    const query = this.searchQuery().toLowerCase();
    if (query) {
      sales = sales.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(query) ||
          s.customer?.name.toLowerCase().includes(query) ||
          s.items.some((item) => item.productName.toLowerCase().includes(query)),
      );
    }

    // Filtro Vendedor (Si hubiera, implementarlo aca)
    return sales;
  });

  // Resumen Header (Estilo iOS)
  summary = computed(() => {
    const count = this.salesService.validElements();
    const total = this.salesService.totalFilteredRevenue();
    return {
      count,
      total,
      average: count > 0 ? total / count : 0,
    };
  });

  periodLabel = computed(() => {
    const label: Record<string, string> = {
      today: 'Hoy',
      week: 'Semana',
      month: 'Mes',
      all: 'Todos',
    };
    return label[this.selectedPeriod()];
  });

  // Modales y Visuales
  selectedSale = signal<Sale | null>(null);
  viewDetails(sale: Sale) {
    this.selectedSale.set(sale);
  }

  closeDetails() {
    this.selectedSale.set(null);
  }

  printTicket(sale: Sale) {
    this.exportService.printTicket(sale);
  }

  // Variables para Anulación
  cancelModalOpen = signal(false);
  saleToCancel = signal<Sale | null>(null);
  cancelReason = signal('');
  restoreStock = signal(true);

  openCancelModal(sale: Sale) {
    this.saleToCancel.set(sale);
    this.cancelReason.set('');
    this.restoreStock.set(true);
    this.cancelModalOpen.set(true);
  }

  closeCancelModal() {
    this.cancelModalOpen.set(false);
    this.saleToCancel.set(null);
  }

  confirmCancelSale() {
    const sale = this.saleToCancel();
    if (!sale) return;
    const success = this.salesService.cancelSale(
      sale.id,
      this.cancelReason() || 'Sin motivo',
      this.restoreStock(),
    );
    if (success) this.closeCancelModal();
  }

  // Ticket Modal
  showTicketModal = signal(false);
  ticketSale = signal<Sale | null>(null);

  reprintTicket(sale: Sale) {
    this.ticketSale.set(sale);
    this.showTicketModal.set(true);
  }

  closeTicketModal() {
    this.showTicketModal.set(false);
    this.ticketSale.set(null);
  }

  getTicketItems(sale: Sale): any[] {
    return sale.items.map((item) => ({
      product: { id: item.productId, name: item.productName, price: item.unitPrice },
      quantity: item.quantity,
    }));
  }

  getTicketNumber(saleNumber: string): number {
    const match = saleNumber.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Utilidades Visuales (Vendedores, Colores, Labels)
  getVendorColor(id?: string): string {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
  }

  getVendorName(id?: string): string {
    if (!id) return 'Sistema';
    const user = this.availableUsers.find((u: UserDTO) => u.id === id);
    return user ? user.nombre : 'Vendedor ' + id.substring(0, 4);
  }

  getVendorInitial(id?: string): string {
    return this.getVendorName(id).charAt(0).toUpperCase();
  }

  getPaymentMethodLabel(method: string): string {
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return {
          label: 'Completada',
          class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
        };
      case 'pending':
        return { label: 'Pendiente', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' };
      case 'cancelled':
        return { label: 'Anulada', class: 'bg-red-100 text-red-700 dark:bg-red-900/30' };
      default:
        return { label: status, class: 'bg-stone-100' };
    }
  }

  // Paginación UI Methods
  nextPage() {
    const current = this.salesService.currentPage();
    if (current < Math.max(0, this.salesService.totalPages() - 1)) {
      this.salesService.fetchPaginatedSales(current + 1, this.salesService.pageSize());
    }
  }

  prevPage() {
    const current = this.salesService.currentPage();
    if (current > 0) {
      this.salesService.fetchPaginatedSales(current - 1, this.salesService.pageSize());
    }
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.salesService.changePageSize(newSize);
  }

  // ─────────────────────────────────────────────────────────────────
  // 📊 DATOS PARA EXPORTACIÓN MULTI-SECCIÓN (como en la otra vista)
  // ─────────────────────────────────────────────────────────────────
  exportData = computed(() => {
    const sales = this.filteredSales();
    const summary = this.summary();
    const periodLabel = this.periodLabel();

    // SECCIÓN 1: Resumen Ejecutivo
    const ventasCompletadas = sales.filter((s) => s.status === 'completed');
    const ventasAnuladas = sales.filter((s) => s.status === 'cancelled');

    const byPaymentMethod: Record<string, number> = {};
    sales.forEach((s) => {
      const method = this.getPaymentMethodLabel(s.paymentMethod);
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + 1;
    });
    const metodoPago = Object.entries(byPaymentMethod)
      .map(([method, count]) => `${method}: ${count}`)
      .join(', ');

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

    // SECCIÓN 2: Resumen por Vendedor
    const byVendedor: Record<string, { count: number; total: number }> = {};
    sales.forEach((s) => {
      const vendedor = this.getVendorName(s.vendedorId);
      if (!byVendedor[vendedor]) byVendedor[vendedor] = { count: 0, total: 0 };
      byVendedor[vendedor].count++;
      byVendedor[vendedor].total += s.total;
    });
    const resumenVendedores = Object.entries(byVendedor).map(([vendedor, stats]) => ({
      Vendedor: vendedor,
      'N° Ventas': stats.count,
      'Total Vendido': `S/ ${stats.total.toFixed(2)}`,
      Promedio: `S/ ${(stats.total / stats.count).toFixed(2)}`,
    }));

    // SECCIÓN 3: Listado de Ventas
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
      'Tipo Venta': sale.saleType
        ? sale.saleType === 'feria-acobamba'
          ? 'Feria Acobamba'
          : sale.saleType === 'feria-paucara'
            ? 'Feria Paucara'
            : 'Tienda'
        : 'Tienda',
      Estado:
        sale.status === 'completed'
          ? 'Completada'
          : sale.status === 'pending'
            ? 'Pendiente'
            : 'Anulada',
      Notas: sale.notes || '-',
    }));

    // SECCIÓN 4: Detalle de Productos Vendidos
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

    // SECCIÓN 5: Top Productos
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
      'Resumen por Vendedor': resumenVendedores,
      'Detalle de Ventas': ventasListado,
      'Detalle Productos': detalleProductos,
      'Top Productos': topProductos,
    };
  });

  // EXPORTAR PDF ZEN MINIMALISTA COMPLETO
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
    // PALETA ZEN MINIMALISTA (Inspirada en piedra natural)
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
    // UTILIDADES DE DISEÑO
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
    // CALCULAR ESTADÍSTICAS AVANZADAS
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

    // Análisis de Clientes
    const customerMap = new Map<string, { name: string; count: number; total: number }>();
    sales.forEach((s) => {
      const name = s.customer?.name || 'Cliente General';
      const existing = customerMap.get(name) || { name, count: 0, total: 0 };
      existing.count++;
      existing.total += s.total;
      customerMap.set(name, existing);
    });
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Análisis de Variantes (Tallas y Colores)
    const sizeMap = new Map<string, number>();
    const colorMap = new Map<string, number>();
    let totalItemsSold = 0;
    sales.forEach((s) => {
      s.items.forEach((i) => {
        totalItemsSold += i.quantity;
        if (i.size) sizeMap.set(i.size, (sizeMap.get(i.size) || 0) + i.quantity);
        if (i.color) colorMap.set(i.color, (colorMap.get(i.color) || 0) + i.quantity);
      });
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
      y,
    );
    doc.setTextColor(...colors.rose600);
    doc.text(`[X] Anuladas: ${ventasAnuladas.length}`, margin.left + 80, y);
    doc.setTextColor(...colors.stone500);
    doc.text(`[...] Pendientes: ${ventasPendientes}`, margin.left + 120, y);
    y += 12;

    // === INDICADORES DE DESEMPEÑO (KPIs) ===
    y = drawSectionHeader('Indicadores Clave de Desempeño', '', y);
    const avgItemsPerSale = summary.count > 0 ? totalItemsSold / summary.count : 0;
    const kpiData = [
      ['Unidades Totales Vendidas', `${totalItemsSold} unidades`, 'Volumen total de productos'],
      ['Promedio Ítems por Ticket', `${avgItemsPerSale.toFixed(1)} productos`, 'Diversidad de compra'],
      ['Tasa de Ventas Completadas', `${((ventasCompletadas.length / summary.count) * 100).toFixed(1)}%`, 'Efectividad de cierre'],
      ['Clientes Atendidos', `${customerMap.size} clientes`, 'Alcance de audiencia']
    ];
    autoTable(doc, {
      startY: y, body: kpiData, theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2, textColor: colors.stone700 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { textColor: colors.teal700, fontStyle: 'bold', cellWidth: 40 } },
      margin: { left: margin.left }
    });
    y = (doc as any).lastAutoTable.finalY + 12;


     // ═══════════════════════════════════════════════════════════════════
    // SECCIÓN: DESGLOSE POR MÉTODO DE PAGO
    // ═══════════════════════════════════════════════════════════════════
    y = drawSectionHeader('Métodos de Pago', '', y);

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
    // SECCIÓN: RANKING DE CLIENTES
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(50);
    y = drawSectionHeader('Ranking de Mejores Clientes', '👥', y);
    const customerTableData = topCustomers.map((c, idx) => [
      (idx + 1).toString(), c.name, c.count.toString(), `S/ ${c.total.toFixed(2)}`, `${((c.total / summary.total) * 100).toFixed(1)}%`
    ]);
    autoTable(doc, {
      startY: y, head: [['#', 'Cliente', 'Visitas', 'Total Invertido', '%']], body: customerTableData, theme: 'striped',
      headStyles: { fillColor: colors.stone900, textColor: colors.white, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } },
      margin: { left: margin.left, right: margin.right }, tableWidth: contentWidth * 0.9
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // ═══════════════════════════════════════════════════════════════════
    // SECCIÓN: ANÁLISIS DE TALLAS Y COLORES
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(50);
    y = drawSectionHeader('Preferencia de Variantes (Tallas y Colores)', '👗', y);
    const sizeData = Array.from(sizeMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const colorData = Array.from(colorMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 5);
    
    const variantRows = [];
    const maxLen = Math.max(sizeData.length, colorData.length);
    for(let i=0; i<maxLen; i++) {
      variantRows.push([
        sizeData[i] ? `${sizeData[i][0]} (${sizeData[i][1]} und)` : '',
        colorData[i] ? `${colorData[i][0]} (${colorData[i][1]} und)` : ''
      ]);
    }
    autoTable(doc, {
      startY: y, head: [['Tallas más vendidas', 'Colores más vendidos']], body: variantRows, theme: 'plain',
      headStyles: { fillColor: colors.stone100, textColor: colors.stone700, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: colors.stone600 },
      margin: { left: margin.left, right: margin.right }, tableWidth: contentWidth * 0.7
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    
    // ═══════════════════════════════════════════════════════════════════
    // 📈 SECCIÓN: TIPOS DE VENTA
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(40);
    y = drawSectionHeader('Resumen por Tipo de Venta', '📊', y);
    const tipoVentaData = Object.entries(byTipoVenta).map(([tipo, stats]) => [
      tipo,
      stats.count.toString(),
      `S/ ${stats.total.toFixed(2)}`,
      `${((stats.total / summary.total) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Tipo Venta', 'N° Ventas', 'Total', '% Ingresos']],
      body: tipoVentaData,
      theme: 'striped',
      headStyles: {
        fillColor: colors.stone700,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 25 },
      },
      margin: { left: margin.left, right: margin.right },
      tableWidth: contentWidth * 0.8,
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // ═══════════════════════════════════════════════════════════════════
    // SECCIÓN: Rendimientos por Vendedor
    // ═══════════════════════════════════════════════════════════════════
    y = checkPageBreak(40);
    y = drawSectionHeader('Rendimiento por Vendedor', '', y);
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
    y = drawSectionHeader('Top Productos Vendidos', '🏆', y);
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
    // Se muestra siempre, con salto de página si es necesario
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


  // exportToZenPDF() {
  //   console.log('Generando PDF Zen para las ventas...');
  //   const data = this.exportData();
  //   const columns = [
  //     { header: 'Nº Venta', dataKey: 'Nº Venta' },
  //     { header: 'Fecha', dataKey: 'Fecha' },
  //     { header: 'Cliente', dataKey: 'Cliente' },
  //     { header: 'Items', dataKey: 'Items' },
  //     { header: 'Total', dataKey: 'Total' },
  //     { header: 'Estado', dataKey: 'Estado' },
  //   ];

  //   this.exportService.exportToPDF(data, columns, {
  //     filename: `denraf_ventas_${new Date().getTime()}`,
  //     title: 'Reporte de Ventas (Historial)',
  //     orientation: 'portrait'
  //   });
  // }
}
