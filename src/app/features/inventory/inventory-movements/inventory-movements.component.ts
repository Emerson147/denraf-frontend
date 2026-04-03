import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryMovementService } from '../../../core/services/inventory-movement.service';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import { InventoryMovement, Product } from '../../../core/models';
import { UiAnimatedDialogComponent } from '../../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { UiPageHeaderComponent } from '../../../shared/ui/ui-page-header/ui-page-header.component';

@Component({
  selector: 'app-inventory-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, UiAnimatedDialogComponent, UiPageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-movements.component.html',
  styleUrls: ['./inventory-movements.component.css'],
})
export class InventoryMovementsComponent {
  private movementService = inject(InventoryMovementService);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  // State
  selectedTab = signal<'all' | 'entradas' | 'ajustes'>('all');
  searchQuery = signal('');
  showNewMovementDialog = signal(false);

  // Formulario de nuevo movimiento
  movementType = signal<'entrada' | 'ajuste'>('entrada');
  selectedProductId = signal<string>('');
  quantity = signal<number>(1);
  reason = signal<string>('');
  supplier = signal<string>('');
  invoice = signal<string>('');
  cost = signal<number>(0);
  notes = signal<string>('');

  // Data
  products = this.productService.products;
  loading = computed(() => this.movementService.isLoading());

  // Movimientos filtrados
  filteredMovements = computed(() => {
    let movements = this.movementService.movements();

    // Filtrar por tab
    switch (this.selectedTab()) {
      case 'entradas':
        movements = this.movementService.entradas();
        break;
      case 'ajustes':
        movements = this.movementService.ajustes();
        break;
    }

    // Filtrar por búsqueda
    const query = this.searchQuery().toLowerCase();
    if (query) {
      movements = movements.filter(
        (m) =>
          m.productName.toLowerCase().includes(query) ||
          m.movementNumber.toLowerCase().includes(query) ||
          m.reason.toLowerCase().includes(query)
      );
    }

    return movements;
  });

  // Stats
  todayEntradas = computed(
    () => this.movementService.todayMovements().filter((m) => m.type === 'entrada').length
  );

  todayAjustes = computed(
    () => this.movementService.todayMovements().filter((m) => m.type === 'ajuste').length
  );

  /**
   * Abrir modal para nuevo movimiento
   */
  openNewMovementDialog() {
    this.resetForm();
    this.showNewMovementDialog.set(true);
  }

  /**
   * Cerrar modal
   */
  closeDialog() {
    this.showNewMovementDialog.set(false);
    this.resetForm();
  }

  /**
   * Registrar nuevo movimiento
   */
  submitMovement() {
    const productId = this.selectedProductId();
    const product = this.products().find((p) => p.id === productId);

    if (!product) {
      this.toastService.error('Selecciona un producto válido');
      return;
    }

    if (this.quantity() <= 0) {
      this.toastService.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (!this.reason().trim()) {
      this.toastService.error('Ingresa el motivo del movimiento');
      return;
    }

    const movement: any = {
      productId: product.id,
      productName: product.name,
      quantity: this.quantity(),
      reason: this.reason(),
      createdBy: this.authService.currentUser()?.name || 'Usuario',
      notes: this.notes() || undefined,
    };

    // Datos específicos según el tipo
    if (this.movementType() === 'entrada') {
      movement.supplier = this.supplier() || undefined;
      movement.invoice = this.invoice() || undefined;
      movement.cost = this.cost() || product.cost;
      movement.totalCost = movement.cost * this.quantity();
    }

    let result: InventoryMovement | null = null;

    switch (this.movementType()) {
      case 'entrada':
        result = this.movementService.registerEntrada(movement);
        break;
      case 'ajuste':
        // Para ajustes, la cantidad puede ser negativa
        movement.quantity = this.quantity();
        result = this.movementService.registerAjuste(movement);
        break;
    }

    if (result) {
      this.toastService.success(`Movimiento registrado: ${result.movementNumber}`);
      this.closeDialog();
    }
  }

  /**
   * Resetear formulario
   */
  private resetForm() {
    this.selectedProductId.set('');
    this.quantity.set(1);
    this.reason.set('');
    this.supplier.set('');
    this.invoice.set('');
    this.cost.set(0);
    this.notes.set('');
  }

  /**
   * Cambiar tipo de movimiento
   */
  changeMovementType(type: 'entrada' | 'ajuste') {
    this.movementType.set(type);
  }

  /**
   * Formatear fecha
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get icon for movement type
   */
  getMovementIcon(type: string): string {
    switch (type) {
      case 'entrada':
        return 'arrow_downward';
      case 'salida':
        return 'arrow_upward';
      case 'ajuste':
        return 'tune';
      case 'devolucion':
        return 'undo';
      default:
        return 'swap_horiz';
    }
  }

  /**
   * Get color for movement type
   */
  getMovementColor(type: string): string {
    switch (type) {
      case 'entrada':
        return 'text-emerald-700 dark:text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30';
      case 'salida':
        return 'text-rose-700 dark:text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30';
      case 'ajuste':
        return 'text-sky-700 dark:text-sky-600 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30';
      default:
        return 'text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700';
    }
  }
}
