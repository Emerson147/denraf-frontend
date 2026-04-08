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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiPageHeaderComponent } from '../../../shared/ui/ui-page-header/ui-page-header.component';
import { UiEmptyStateComponent } from '../../../shared/ui/ui-empty-state/ui-empty-state.component';
import { UiExportMenuComponent } from '../../../shared/ui/ui-export-menu/ui-export-menu.component';
import { UiTicketComponent } from '../../../shared/ui/ui-ticket/ui-ticket.component';
import { SalesService } from '../../../core/services/sales.service';
import { AuthService } from '../../../core/auth/auth';
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
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

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
  
  availableUsers = () => this.authService.getAvailableUsers();

  constructor() {
    // Escuchar cambios de periodo de manera reactiva para volver a pedir a backend
    effect(() => {
       const period = this.selectedPeriod();
       // Opcional: Llamar al backend pasando filtros si lo requerimos.
       // Para UX fluída pasaremos 0 page siempre que cambiemos filtro
       this.salesService.fetchPaginatedSales(0, this.salesService.pageSize());
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
          s.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    }
    
    // Filtro Vendedor (Si hubiera, implementarlo aca)
    return sales;
  });

  // Resumen Header (Estilo iOS)
  summary = computed(() => {
    const sales = this.filteredSales();
    const count = sales.length;
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    return {
      count,
      total,
      average: count > 0 ? total / count : 0,
    };
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
      this.restoreStock()
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
    const user = this.availableUsers().find((u) => u.id === id);
    return user ? user.name : 'Vendedor ' + id.substring(0, 4);
  }

  getVendorInitial(id?: string): string {
    return this.getVendorName(id).charAt(0).toUpperCase();
  }

  getPaymentMethodLabel(method: string): string {
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  getStatusBadge(status: string) {
    switch (status) {
      case 'completed': return { label: 'Completada', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' };
      case 'pending': return { label: 'Pendiente', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' };
      case 'cancelled': return { label: 'Anulada', class: 'bg-red-100 text-red-700 dark:bg-red-900/30' };
      default: return { label: status, class: 'bg-stone-100' };
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

  exportData = computed(() => {
    return this.filteredSales().map((s) => ({
      'Nº Venta': s.saleNumber,
      'Fecha': new Date(s.date).toLocaleDateString(),
      'Cliente': s.customer?.name || 'Cliente Casual',
      'Items': s.items.length,
      'Total': `S/ ${s.total.toFixed(2)}`,
      'Estado': s.status === 'completed' ? 'Completado' : (s.status === 'cancelled' ? 'Anulado' : s.status)
    }));
  });

  private exportService = inject(ExportService);

  exportToZenPDF() {
    console.log('Generando PDF Zen para las ventas...');
    const data = this.exportData();
    const columns = [
      { header: 'Nº Venta', dataKey: 'Nº Venta' },
      { header: 'Fecha', dataKey: 'Fecha' },
      { header: 'Cliente', dataKey: 'Cliente' },
      { header: 'Items', dataKey: 'Items' },
      { header: 'Total', dataKey: 'Total' },
      { header: 'Estado', dataKey: 'Estado' },
    ];
    
    this.exportService.exportToPDF(data, columns, {
      filename: `denraf_ventas_${new Date().getTime()}`,
      title: 'Reporte de Ventas (Historial)',
      orientation: 'portrait'
    });
  }
}
