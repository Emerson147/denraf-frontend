import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryMovementService } from '../../../core/services/inventory-movement.service';
import { ProductService } from '../../../core/services/product.service';
import { BackendAuthService } from '../../../core/services/backend-auth.service';
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
  public movementService = inject(InventoryMovementService);
  private productService = inject(ProductService);
  private authService = inject(BackendAuthService);
  private toastService = inject(ToastService);

  // State
  searchQuery = signal('');
  showNewMovementDialog = signal(false);

  // Formulario de nuevo movimiento
  movementType = signal<'entrada' | 'ajuste'>('entrada');
  selectedProductId = signal<string>('');
  variantQuantities = signal<{ [variantId: string]: number | null }>({}); // Nuevo: Multi-variantes
  quantity = signal<number>(1);
  reason = signal<string>('');
  supplier = signal<string>('');
  invoice = signal<string>('');
  cost = signal<number>(0);
  notes = signal<string>('');

  // Computados de selección
  selectedProduct = computed(() => {
    return this.products().find((p) => p.id === this.selectedProductId());
  });

  productVariants = computed(() => {
    return this.selectedProduct()?.variants || [];
  });

  totalQuantity = computed(() => {
    if (this.productVariants().length > 0) {
      const q = this.variantQuantities();
      let sum = 0;
      for (const key in q) {
        if (q[key]) sum += q[key]!;
      }
      return sum;
    }
    return this.quantity();
  });

  // Data
  products = this.productService.products;
  loading = computed(() => this.movementService.isLoading());

  // Movimientos filtrados locales (solo búsquedas de texto en la vista actual)
  filteredMovements = computed(() => {
    let movements = this.movementService.movements();
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

  // Stats reales extraídas de la lista filtrando por fecha de hoy
  todayEntradas = computed(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.movementService.movements().filter(m => {
      const d = m.createdAt ? new Date(m.createdAt) : new Date(m.date);
      return m.type === 'entrada' && d >= startOfToday;
    }).length;
  });

  todayAjustes = computed(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.movementService.movements().filter(m => {
      const d = m.createdAt ? new Date(m.createdAt) : new Date(m.date);
      return m.type === 'ajuste' && d >= startOfToday;
    }).length;
  });

  ngOnInit() {
    this.movementService.fetchPaginatedMovements(0, this.movementService.pageSize());
  }

  // --- PAGINACIÓN ---
  prevPage() {
    const current = this.movementService.currentPage();
    if (current > 0) {
      this.movementService.fetchPaginatedMovements(current - 1, this.movementService.pageSize(), this.movementService.currentTypeFilter() || undefined);
    }
  }

  nextPage() {
    const current = this.movementService.currentPage();
    if (current < Math.max(0, this.movementService.totalPages() - 1)) {
      this.movementService.fetchPaginatedMovements(current + 1, this.movementService.pageSize(), this.movementService.currentTypeFilter() || undefined);
    }
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.movementService.changePageSize(newSize);
  }

  // --- FILTROS TAB ---
  setTab(tab: 'all' | 'entrada' | 'ajuste') {
    if (tab === 'all') {
      this.movementService.fetchPaginatedMovements(0, this.movementService.pageSize(), undefined);
    } else {
      this.movementService.fetchPaginatedMovements(0, this.movementService.pageSize(), tab);
    }
  }

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
  async submitMovement() {
    const product = this.selectedProduct();

    if (!product) {
      this.toastService.error('Selecciona un producto válido');
      return;
    }

    // Lógica para procesar una o múltiples variantes
    const variants = this.productVariants();
    let movementsToCreate: any[] = [];
    
    if (variants.length > 0) {
      const vQuantities = this.variantQuantities();
      let hasAny = false;
      
      for (const variant of variants) {
        const inputVal = vQuantities[variant.id];
        if (inputVal === undefined || inputVal === null) continue;
        
        let finalQty = inputVal;
        if (this.movementType() === 'ajuste') {
          finalQty = inputVal - variant.stock;
          if (finalQty === 0) continue; // Sin cambios para esta variante
        } else {
          if (inputVal <= 0) continue; // Entrada debe ser mayor a 0
        }
        
        hasAny = true;
        movementsToCreate.push({
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          size: variant.size,
          color: variant.color,
          quantity: finalQty,
        });
      }
      
      if (!hasAny) {
        this.toastService.error('Ingresa una cantidad válida para al menos una variante');
        return;
      }
    } else {
      // Producto sin variantes
      let finalQty = this.quantity();
      if (this.movementType() === 'ajuste') {
        finalQty = this.quantity() - product.stock;
        if (finalQty === 0) {
          this.toastService.error('El nuevo stock físico es igual al actual. No hay ajuste que realizar.');
          return;
        }
        if (this.quantity() < 0) {
          this.toastService.error('El stock físico no puede ser negativo');
          return;
        }
      } else {
        if (this.quantity() <= 0) {
          this.toastService.error('La cantidad recibida debe ser mayor a 0');
          return;
        }
      }
      
      movementsToCreate.push({
        productId: product.id,
        productName: product.name,
        quantity: finalQty,
      });
    }

    if (!this.reason().trim()) {
      this.toastService.error('Ingresa el motivo del movimiento');
      return;
    }

    const baseMovement: any = {
      reason: this.reason(),
      createdBy: this.authService.currentUser()?.nombre || 'Usuario',
      notes: this.notes() || undefined,
    };

    // ====== BATCH STOCK Y COSTO ======
    // Calculamos el estado final del producto para enviar 1 sola actualización al servidor
    // y evitar errores 500 de "ConcurrentModification" o Optimistic Locking
    let productHasChanges = false;
    let updatedProductData: any = {};

    if (this.movementType() === 'entrada') {
      baseMovement.supplier = this.supplier() || undefined;
      baseMovement.invoice = this.invoice() || undefined;
      baseMovement.cost = this.cost() || product.cost;
      
      if (baseMovement.cost !== product.cost && baseMovement.cost > 0) {
        updatedProductData.cost = baseMovement.cost;
        productHasChanges = true;
      }
    }

    // Calcular el nuevo stock de variantes
    if (variants.length > 0) {
      const newVariants = variants.map(v => {
        const inputVal = this.variantQuantities()[v.id];
        if (inputVal === undefined || inputVal === null) return v;
        
        let delta = 0;
        if (this.movementType() === 'ajuste') {
          delta = inputVal - v.stock;
        } else {
          delta = inputVal > 0 ? inputVal : 0;
        }

        if (delta !== 0) {
          productHasChanges = true;
          return { ...v, stock: v.stock + delta };
        }
        return v;
      });
      
      if (productHasChanges) {
        updatedProductData.variants = newVariants;
        // Calcular nuevo stock total sumando variantes
        updatedProductData.stock = newVariants.reduce((sum, v) => sum + v.stock, 0);
      }
    } else {
       // Si no hay variantes, sumamos el stock total
       let delta = 0;
       const finalQty = movementsToCreate[0].quantity;
       if (this.movementType() === 'ajuste') {
         delta = finalQty; // Para ajuste, movementsToCreate ya tiene la diferencia
       } else {
         delta = finalQty;
       }
       if (delta !== 0) {
         productHasChanges = true;
         updatedProductData.stock = product.stock + delta;
       }
    }

    // Guardaremos productHasChanges y updatedProductData para ejecutarlos AL FINAL

    try {
      for (const mov of movementsToCreate) {
        const payload = { ...mov, ...baseMovement };
        
        if (this.movementType() === 'entrada') {
          payload.totalCost = payload.cost * Math.abs(payload.quantity);
          await this.movementService.registerEntrada(payload, true); // true = skipStockUpdate individual
        } else {
          await this.movementService.registerAjuste(payload, true); // true = skipStockUpdate individual
        }
      }

      // Ejecutar UNA sola actualización del producto AL FINAL (Evita conflictos de transacciones en la DB)
      if (productHasChanges) {
        this.productService.updateProduct(product.id, updatedProductData);
      }
      
      this.toastService.success('Movimiento(s) registrado(s) correctamente');
      this.closeDialog();
      
      // Refrescar la tabla para mostrar el nuevo registro
      this.movementService.fetchPaginatedMovements(
        this.movementService.currentPage(),
        this.movementService.pageSize(),
        this.movementService.currentTypeFilter() || undefined
      );
    } catch(e) {
      console.error('Error registering movements:', e);
      this.toastService.error('Ocurrió un error al registrar el movimiento');
    }
  }

  /**
   * Resetear formulario
   */
  private resetForm() {
    this.selectedProductId.set('');
    this.variantQuantities.set({});
    this.quantity.set(1);
    this.reason.set('');
    this.supplier.set('');
    this.invoice.set('');
    this.cost.set(0);
    this.notes.set('');
  }

  /**
   * Evento al cambiar de producto
   */
  onProductChange() {
    this.variantQuantities.set({}); // Resetear variantes al cambiar producto
    const product = this.selectedProduct();
    if (product) {
      this.cost.set(product.cost || 0); // Pre-cargar el costo
    }
  }

  // Set quantity for a specific variant
  setVariantQuantity(variantId: string, qty: number | null) {
    this.variantQuantities.update(prev => ({
      ...prev,
      [variantId]: qty
    }));
  }

  /**
   * Cambiar tipo de movimiento
   */
  changeMovementType(type: 'entrada' | 'ajuste') {
    this.movementType.set(type);
  }

  /**
   * Formatear fecha (Maneja arrays de Spring Boot o strings ISO)
   */
  formatDate(dateInput: any): string {
    if (!dateInput) return 'Sin fecha';

    let parsedDate: Date;
    
    // Si Spring Boot envía un array: [YYYY, MM, DD, HH, mm, ss]
    if (Array.isArray(dateInput)) {
      parsedDate = new Date(
        dateInput[0], 
        dateInput[1] - 1, // Los meses en JS son 0-11
        dateInput[2], 
        dateInput[3] || 0, 
        dateInput[4] || 0, 
        dateInput[5] || 0
      );
    } else {
      parsedDate = new Date(dateInput);
    }

    if (isNaN(parsedDate.getTime())) return 'Fecha Inválida';

    return parsedDate.toLocaleDateString('es-ES', {
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
