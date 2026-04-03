import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SalesService } from './sales.service';

export type SearchCategory = 'product' | 'client' | 'sale' | 'command' | 'navigation';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  icon: string;
  route?: string;
  action?: () => void;
  metadata?: {
    price?: number;
    stock?: number;
    tier?: string;
    total?: number;
    date?: string;
  };
}

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  action: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Estado
  isOpen = signal(false);
  searchQuery = signal('');

  // Comandos del sistema
  private commands: Command[] = [
    {
      id: 'new-sale',
      title: 'Nueva Venta',
      description: 'Abrir punto de venta para registrar una nueva venta',
      icon: 'add_shopping_cart',
      keywords: ['venta', 'pos', 'nueva', 'vender'],
      action: () => this.router.navigate(['/pos'])
    },
    {
      id: 'inventory',
      title: 'Ver Inventario',
      description: 'Administrar productos y stock',
      icon: 'inventory_2',
      keywords: ['inventario', 'productos', 'stock'],
      action: () => this.router.navigate(['/inventory'])
    },
    {
      id: 'clients',
      title: 'Administrar Clientes',
      description: 'Ver y gestionar clientes',
      icon: 'group',
      keywords: ['clientes', 'usuarios', 'personas'],
      action: () => this.router.navigate(['/clients'])
    },
    {
      id: 'reports',
      title: 'Ver Reportes',
      description: 'Análisis y reportes de ventas',
      icon: 'assessment',
      keywords: ['reportes', 'análisis', 'estadísticas'],
      action: () => this.router.navigate(['/reports'])
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Resumen e inteligencia de negocios',
      icon: 'dashboard',
      keywords: ['inicio', 'home', 'resumen'],
      action: () => this.router.navigate(['/dashboard'])
    }
  ];

  // Índice de productos
  private products = computed(() => {
    const allSales = this.salesService.allSales();
    const productMap = new Map<string, SearchResult>();

    allSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.metadata!.stock! += item.quantity;
        } else {
          productMap.set(item.productId, {
            id: item.productId,
            title: item.productName,
            subtitle: 'Producto',
            category: 'product',
            icon: 'checkroom',
            route: '/inventory',
            metadata: {
              price: item.unitPrice,
              stock: item.quantity
            }
          });
        }
      });
    });

    return Array.from(productMap.values());
  });

  // Índice de clientes
  private clients = computed(() => {
    const allSales = this.salesService.allSales();
    const clientMap = new Map<string, SearchResult>();

    allSales.forEach(sale => {
      if (sale.customer) {
        const existing = clientMap.get(sale.customer.id);
        if (existing) {
          existing.metadata!.total! += sale.total;
        } else {
          clientMap.set(sale.customer.id, {
            id: sale.customer.id,
            title: sale.customer.name,
            subtitle: sale.customer.email || sale.customer.phone || 'Cliente',
            category: 'client',
            icon: 'person',
            route: '/clients',
            metadata: {
              tier: sale.customer.tier || 'Regular',
              total: sale.total
            }
          });
        }
      }
    });

    return Array.from(clientMap.values());
  });

  // Índice de ventas
  private sales = computed(() => {
    const allSales = this.salesService.allSales();
    
    return allSales.slice(0, 50).map(sale => ({
      id: sale.id,
      title: `Venta #${sale.id.slice(0, 8)}`,
      subtitle: sale.customer?.name || 'Cliente sin registro',
      category: 'sale' as SearchCategory,
      icon: 'receipt',
      route: '/pos',
      metadata: {
        total: sale.total,
        date: sale.date.toLocaleDateString('es-PE')
      }
    }));
  });

  // Búsqueda fuzzy simple
  private fuzzyMatch(text: string, query: string): number {
    text = text.toLowerCase();
    query = query.toLowerCase();
    
    if (text.includes(query)) return 10;
    
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score++;
        queryIndex++;
      }
    }
    
    return queryIndex === query.length ? score : 0;
  }

  // Resultados de búsqueda
  searchResults = computed(() => {
    const query = this.searchQuery().trim();
    
    if (!query) {
      // Mostrar comandos recientes cuando no hay query
      return this.commands.slice(0, 5).map(cmd => ({
        id: cmd.id,
        title: cmd.title,
        subtitle: cmd.description,
        category: 'command' as SearchCategory,
        icon: cmd.icon,
        action: cmd.action
      }));
    }

    const results: SearchResult[] = [];

    // Buscar en comandos
    this.commands.forEach(cmd => {
      const titleScore = this.fuzzyMatch(cmd.title, query);
      const keywordScore = Math.max(...cmd.keywords.map(k => this.fuzzyMatch(k, query)));
      
      if (titleScore > 0 || keywordScore > 0) {
        results.push({
          id: cmd.id,
          title: cmd.title,
          subtitle: cmd.description,
          category: 'command',
          icon: cmd.icon,
          action: cmd.action
        });
      }
    });

    // Buscar en productos
    this.products().forEach(product => {
      const score = this.fuzzyMatch(product.title, query) + 
                   this.fuzzyMatch(product.subtitle, query);
      
      if (score > 0) {
        results.push(product);
      }
    });

    // Buscar en clientes
    this.clients().forEach(client => {
      const score = this.fuzzyMatch(client.title, query) + 
                   this.fuzzyMatch(client.subtitle, query);
      
      if (score > 0) {
        results.push(client);
      }
    });

    // Buscar en ventas (por ID o nombre de cliente)
    this.sales().forEach(sale => {
      const score = this.fuzzyMatch(sale.title, query) + 
                   this.fuzzyMatch(sale.subtitle, query);
      
      if (score > 0) {
        results.push(sale);
      }
    });

    return results.slice(0, 20); // Limitar a 20 resultados
  });

  // Resultados agrupados por categoría
  groupedResults = computed(() => {
    const results = this.searchResults();
    const grouped: Record<SearchCategory, SearchResult[]> = {
      command: [],
      product: [],
      client: [],
      sale: [],
      navigation: []
    };

    results.forEach(result => {
      grouped[result.category].push(result);
    });

    return grouped;
  });

  // Métodos públicos
  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  executeResult(result: SearchResult) {
    if (result.action) {
      result.action();
    } else if (result.route) {
      this.router.navigate([result.route]);
    }
    this.close();
  }
}
