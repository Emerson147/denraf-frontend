import { Injectable, signal, computed, inject } from '@angular/core';
import { Client } from '../models';
import { ApiService } from './api.service';
import { ErrorHandlerService } from './error-handler.service';
import { ToastService } from './toast.service';

/**
 * 🚀 ClientService - API REST Architecture
 *
 * Estrategia:
 * 1. API Rest como fuente de verdad (Spring Boot)
 * 2. Actualizaciones optimistas en el cliente
 * 3. Rollback automático en caso de error
 */
@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private api = inject(ApiService);
  private errorHandler = inject(ErrorHandlerService);
  private toast = inject(ToastService);

  // ✅ Fuente única de verdad
  private clientsSignal = signal<Client[]>([]);

  // 🔄 Estado de carga
  isLoading = signal(true);
  isSaving = signal(false);

  // 🎯 Control de inicialización única
  private initialized = false;

  constructor() {
    if (!this.initialized) {
      this.initialized = true;
      this.loadClients();
    }
  }

  // ✅ API pública
  readonly clients = this.clientsSignal.asReadonly();

  // Computed útiles
  totalClients = computed(() => this.clientsSignal().length);

  goldClients = computed(() =>
    this.clientsSignal().filter(c => c.tier === 'gold' || c.totalSpent > 2000).length
  );

  silverClients = computed(() =>
    this.clientsSignal().filter(
      c => c.tier === 'silver' || (c.totalSpent > 500 && c.totalSpent <= 2000)
    ).length
  );

  totalClientValue = computed(() =>
    this.clientsSignal().reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  );

  /**
   * Cargar clientes desde la API
   */
  private loadClients(): void {
    this.isLoading.set(true);
    this.api.get<any>('clientes?size=5000&sortDir=desc').subscribe({
      next: (response) => {
        // El backend puede devolver paginado o array directo
        const clients: Client[] = response && response.content
          ? response.content
          : (Array.isArray(response) ? response : []);

        // Calcular tier desde totalSpent si no viene del backend
        const mapped = clients.map((c: any) => this.mapToClient(c));
        this.clientsSignal.set(mapped);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error cargando clientes:', err);
        this.isLoading.set(false);
        // No mostramos error al usuario en carga inicial silenciosa
      },
    });
  }

  /**
   * 🔄 Forzar recarga desde el servidor
   */
  forceSync(): void {
    this.loadClients();
  }

  /**
   * Obtener cliente por ID
   */
  getClientById(id: string): Client | undefined {
    return this.clientsSignal().find(c => c.id === id);
  }

  /**
   * Buscar clientes por nombre o teléfono
   */
  searchClients(query: string): Client[] {
    const q = query.toLowerCase();
    return this.clientsSignal().filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }

  /**
   * ➕ Crear nuevo cliente
   * Mantenido por compatibilidad histórica con lógica fire-and-forget
   */
  createClient(
    data: Omit<Client, 'id' | 'totalSpent' | 'totalPurchases' | 'tier' | 'createdAt' | 'updatedAt'>
  ): void {
    this.createClientAsync(data).catch(() => {});
  }

  /**
   * ➕ Crear nuevo cliente - ASINCRONO
   * Devuelve la Promesa con el Cliente Real de DB (con UUID válido)
   */
  createClientAsync(
    data: Omit<Client, 'id' | 'totalSpent' | 'totalPurchases' | 'tier' | 'createdAt' | 'updatedAt'>
  ): Promise<Client> {
    return new Promise((resolve, reject) => {
      this.isSaving.set(true);

      // Objeto optimista local
      const optimisticClient: Client = {
        ...data,
        id: `temp-${Date.now()}`,
        totalSpent: 0,
        totalPurchases: 0,
        tier: 'nuevo',
        createdAt: new Date().toISOString(),
      };

      // Actualizar UI inmediatamente
      this.clientsSignal.update(list => [...list, optimisticClient]);

      this.api.post<any>('clientes', this.mapToRequest(data)).subscribe({
        next: (saved) => {
          const real = this.mapToClient(saved);
          this.clientsSignal.update(list =>
            list.map(c => (c.id === optimisticClient.id ? real : c))
          );
          this.isSaving.set(false);
          this.toast.success(`✅ Cliente "${real.name}" registrado correctamente`);
          resolve(real);
        },
        error: (err) => {
          console.error('❌ Error creando cliente:', err);
          // Rollback: quitar el optimista
          this.clientsSignal.update(list =>
            list.filter(c => c.id !== optimisticClient.id)
          );
          this.isSaving.set(false);
          this.errorHandler.handleError(
            new Error('No se pudo guardar el cliente en el servidor.'),
            'Creación de cliente',
            'high'
          );
          reject(err);
        },
      });
    });
  }

  /**
   * ✏️ Actualizar cliente existente
   */
  updateClient(id: string, data: Partial<Omit<Client, 'id'>>): void {
    const original = this.clientsSignal().find(c => c.id === id);
    if (!original) return;

    this.isSaving.set(true);

    // Actualizar optimistamente
    const updated: Client = { ...original, ...data, updatedAt: new Date().toISOString() };
    this.clientsSignal.update(list =>
      list.map(c => (c.id === id ? updated : c))
    );

    this.api.put<any>(`clientes/${id}`, this.mapToRequest({ ...original, ...data })).subscribe({
      next: (saved) => {
        const real = this.mapToClient(saved);
        this.clientsSignal.update(list =>
          list.map(c => (c.id === id ? real : c))
        );
        this.isSaving.set(false);
        this.toast.success(`✅ Cliente "${real.name}" actualizado`);
      },
      error: (err) => {
        console.error('❌ Error actualizando cliente:', err);
        // Rollback
        this.clientsSignal.update(list =>
          list.map(c => (c.id === id ? original : c))
        );
        this.isSaving.set(false);
        this.errorHandler.handleError(
          new Error('No se pudo actualizar el cliente. Los cambios fueron revertidos.'),
          'Actualización de cliente',
          'high'
        );
      },
    });
  }

  /**
   * 🗑️ Eliminar cliente
   */
  deleteClient(id: string): void {
    const original = this.clientsSignal().find(c => c.id === id);
    if (!original) return;

    // Quitar de la UI inmediatamente (optimista)
    this.clientsSignal.update(list => list.filter(c => c.id !== id));

    this.api.delete<any>(`clientes/${id}`).subscribe({
      next: () => {
        this.toast.success(`🗑️ Cliente "${original.name}" eliminado`);
      },
      error: (err) => {
        console.error('❌ Error eliminando cliente:', err);
        // Rollback: restaurar cliente
        this.clientsSignal.update(list => [...list, original].sort((a, b) =>
          a.name.localeCompare(b.name)
        ));
        this.errorHandler.handleError(
          new Error('No se pudo eliminar el cliente.'),
          'Eliminación de cliente',
          'high'
        );
      },
    });
  }

  // ============================================
  // ACTUALIZACIÓN OPTIMISTA (TIEMPO REAL UX)
  // ============================================

  /**
   * ⚡ Actualiza las estadísticas del cliente al vuelo sin esperar recargas HTTP.
   * Evita problemas de Race-Condition con la DB luego de una factura.
   */
  updateClientLtvLocally(id: string, purchaseAmount: number): void {
    this.clientsSignal.update(list => 
      list.map(c => {
        if (c.id === id) {
          const newTotalSpent = (c.totalSpent || 0) + purchaseAmount;
          return {
            ...c,
            totalSpent: newTotalSpent,
            totalPurchases: (c.totalPurchases || 0) + 1,
            lastPurchaseDate: new Date().toISOString(),
            tier: this.calculateTier(newTotalSpent)
          };
        }
        return c;
      })
    );
  }

  // ============================================
  // MAPPERS
  // ============================================

  /**
   * Adaptar respuesta del backend al modelo frontend
   */
  private mapToClient(raw: any): Client {
    // 🚀 ATENCIÓN: El Backend (Java) devuelve el dinero gastado en la propiedad "totalPurchases"
    // Mientras que el Frontend maneja el dinero en "totalSpent". Ajustamos el desfase de DTO aquí.
    const totalSpent = raw.totalSpent ?? raw.totalPurchases ?? raw.total_purchases ?? 0;
    
    return {
      id: String(raw.id),
      name: raw.name ?? raw.nombre ?? '',
      phone: raw.phone ?? raw.telefono ?? '',
      email: raw.email ?? undefined,
      address: raw.address ?? raw.direccion ?? undefined,
      sizeTop: raw.sizeTop ?? raw.size_top ?? undefined,
      sizeBottom: raw.sizeBottom ?? raw.size_bottom ?? undefined,
      stylePreference: raw.stylePreference ?? raw.style_preference ?? undefined,
      notes: raw.notes ?? raw.notas ?? undefined,
      totalSpent,
      totalPurchases: raw.totalPurchasesCount ?? 0, // Si algún día Java envía cantidad, lo tomará de aquí
      lastPurchaseDate: raw.lastPurchaseDate ?? raw.last_purchase_date ?? undefined,
      tier: this.calculateTier(totalSpent),
      createdAt: raw.createdAt ?? raw.created_at ?? undefined,
      updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    };
  }

  /**
   * Adaptar modelo frontend a request para el backend
   */
  private mapToRequest(data: Partial<Client>): Record<string, any> {
    return {
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      sizeTop: data.sizeTop ?? null,
      sizeBottom: data.sizeBottom ?? null,
      stylePreference: data.stylePreference ?? null,
      notes: data.notes ?? null,
    };
  }

  /**
   * Calcular tier según totalSpent
   */
  private calculateTier(totalSpent: number): 'nuevo' | 'silver' | 'gold' {
    if (totalSpent > 2000) return 'gold';
    if (totalSpent > 500) return 'silver';
    return 'nuevo';
  }
}
