import { Component, computed, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiAnimatedDialogComponent } from '../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { UiLabelComponent } from '../../shared/ui/ui-label/ui-label.component';
import { UiSkeletonComponent } from '../../shared/ui/ui-skeleton/ui-skeleton.component';
import { UiPageHeaderComponent } from '../../shared/ui/ui-page-header/ui-page-header.component';
import { ClientService } from '../../core/services/client.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, UiInputComponent, UiButtonComponent, UiAnimatedDialogComponent, UiLabelComponent, UiSkeletonComponent, UiPageHeaderComponent],
  templateUrl: './clients-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPageComponent {

  clientService = inject(ClientService);

  // Estado de búsqueda y UI
  searchQuery = signal('');
  isDialogOpen = signal(false);
  editingClient = signal<Client | null>(null);
  confirmDeleteId = signal<string | null>(null);

  // Formulario (señales independientes para rendimiento)
  formName = signal('');
  formPhone = signal('');
  formEmail = signal('');
  formAddress = signal('');
  formSizeTop = signal<'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'>('M');
  formSizeBottom = signal('30');
  formStyle = signal('Casual');
  formNotes = signal('');
  formError = signal('');

  // Flags del servicio
  isLoading = this.clientService.isLoading;
  isSaving = this.clientService.isSaving;

  // KPIs computados desde el servicio
  goldClients = this.clientService.goldClients;
  silverClients = this.clientService.silverClients;
  totalClientValue = this.clientService.totalClientValue;

  // Alias de conveniencia
  isEditing = computed(() => this.editingClient() !== null);
  modalTitle = computed(() => this.isEditing() ? 'Editar Cliente' : 'Nuevo Cliente');

  // Filtro reactivo
  filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const all = this.clientService.clients();
    if (!q) return all;
    return all.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // ============================================
  // ACCIONES DEL FORMULARIO
  // ============================================

  openCreate(): void {
    this.editingClient.set(null);
    this.resetForm();
    this.isDialogOpen.set(true);
  }

  openEdit(client: Client): void {
    this.editingClient.set(client);
    this.formName.set(client.name);
    this.formPhone.set(client.phone);
    this.formEmail.set(client.email ?? '');
    this.formAddress.set(client.address ?? '');
    this.formSizeTop.set(client.sizeTop ?? 'M');
    this.formSizeBottom.set(client.sizeBottom ?? '30');
    this.formStyle.set(client.stylePreference ?? 'Casual');
    this.formNotes.set(client.notes ?? '');
    this.formError.set('');
    this.isDialogOpen.set(true);
  }

  closeDialog(): void {
    this.isDialogOpen.set(false);
    this.editingClient.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.formName.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.formAddress.set('');
    this.formSizeTop.set('M');
    this.formSizeBottom.set('30');
    this.formStyle.set('Casual');
    this.formNotes.set('');
    this.formError.set('');
  }

  // ============================================
  // VALIDAR Y GUARDAR
  // ============================================

  saveClient(): void {
    const name = this.formName().trim();
    const phone = this.formPhone().trim();

    if (!name) {
      this.formError.set('El nombre es requerido');
      return;
    }
    if (!phone) {
      this.formError.set('El teléfono es requerido');
      return;
    }

    this.formError.set('');

    const payload = {
      name,
      phone,
      email: this.formEmail().trim() || undefined,
      address: this.formAddress().trim() || undefined,
      sizeTop: this.formSizeTop(),
      sizeBottom: this.formSizeBottom(),
      stylePreference: this.formStyle(),
      notes: this.formNotes().trim() || undefined,
    };

    const editing = this.editingClient();
    if (editing) {
      this.clientService.updateClient(editing.id, payload);
    } else {
      this.clientService.createClient(payload);
    }

    this.closeDialog();
  }

  // ============================================
  // ELIMINAR
  // ============================================

  confirmDelete(clientId: string): void {
    this.confirmDeleteId.set(clientId);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  executeDelete(): void {
    const id = this.confirmDeleteId();
    if (id) {
      this.clientService.deleteClient(id);
      this.confirmDeleteId.set(null);
    }
  }

  // ============================================
  // HELPERS UI
  // ============================================

  getClientTier(client: Client) {
    const spent = client.totalSpent;
    if (spent > 2000 || client.tier === 'gold') return {
      label: 'GOLD',
      color: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      icon: 'star',
    };
    if (spent > 500 || client.tier === 'silver') return {
      label: 'SILVER',
      color: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700',
      icon: 'workspace_premium',
    };
    return {
      label: 'NUEVO',
      color: 'bg-stone-50 text-stone-600 border border-stone-200 dark:bg-stone-800/40 dark:text-stone-400 dark:border-stone-700',
      icon: 'person',
    };
  }

  formatLastVisit(dateStr?: string): string {
    if (!dateStr) return 'Sin compras';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getWhatsappLink(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/51${cleaned}`;
  }
}