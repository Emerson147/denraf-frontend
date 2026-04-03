import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiBadgeComponent } from '../../shared/ui/ui-badge/ui-badge.component';
import { UiAnimatedDialogComponent } from '../../shared/ui/ui-animated-dialog/ui-animated-dialog.component';
import { UiLabelComponent } from '../../shared/ui/ui-label/ui-label.component';

// 1. MODELO DE CLIENTE "FASHION"
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;       // Foto o iniciales
  totalSpent: number;   // LTV (Lifetime Value)
  lastVisit: string;
  preferences: {        // Datos clave para ropa
    sizeTop: 'S'|'M'|'L'|'XL';
    sizeBottom: '28'|'30'|'32'|'34';
    style: string;      // Ej: Urbano, Formal
  };
}

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, UiInputComponent, UiButtonComponent, UiAnimatedDialogComponent, UiLabelComponent],
  templateUrl: './clients-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // 🚀 Optimización de Change Detection
})
export class ClientsPageComponent {
  
  searchQuery = signal('');
  isDialogOpen = signal(false);
  
  // 2. BASE DE DATOS DE CLIENTES
  clients = signal<Client[]>([
    { 
      id: 'C-001', name: 'Sofia Vergara', email: 'sofia@hollywood.com', phone: '999-888-777', 
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      totalSpent: 4500.00, lastVisit: '21 Nov 2025',
      preferences: { sizeTop: 'M', sizeBottom: '30', style: 'Elegante' }
    },
    { 
      id: 'C-002', name: 'Emerson Test', email: 'emerson@dev.com', phone: '987-654-321', 
      avatar: '', // Sin foto, usaremos iniciales
      totalSpent: 120.50, lastVisit: 'Hoy',
      preferences: { sizeTop: 'L', sizeBottom: '32', style: 'Casual' }
    },
    { 
      id: 'C-003', name: 'Maria Pía', email: 'mapia@tv.com', phone: '999-111-222', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
      totalSpent: 850.00, lastVisit: '15 Oct 2025',
      preferences: { sizeTop: 'S', sizeBottom: '28', style: 'Urbano' }
    },
  ]);

  // 3. FILTRO
  filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.clients().filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  });

  // KPIs computados
  goldClients = computed(() => {
    return this.clients().filter(c => c.totalSpent > 2000).length;
  });

  silverClients = computed(() => {
    return this.clients().filter(c => c.totalSpent > 500 && c.totalSpent <= 2000).length;
  });

  totalClientValue = computed(() => {
    return this.clients().reduce((sum, c) => sum + c.totalSpent, 0);
  });

  // 4. LÓGICA VIP (Calculada al vuelo)
  getClientTier(spent: number) {
    if (spent > 2000) return { 
      label: 'GOLD', 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      borderColor: 'border-yellow-300',
      icon: 'star'
    };
    if (spent > 500) return { 
      label: 'SILVER', 
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      borderColor: 'border-slate-300',
      icon: 'workspace_premium'
    };
    return { 
      label: 'NUEVO', 
      color: 'bg-stone-50 text-stone-600 border-stone-200',
      borderColor: 'border-stone-300',
      icon: 'person'
    };
  }

  // ACCIONES
  openNewClient() { this.isDialogOpen.set(true); }
  
  saveClient(name: string, phone: string) {
    // Lógica de guardado (similar a las anteriores)
    this.isDialogOpen.set(false);
  }
}