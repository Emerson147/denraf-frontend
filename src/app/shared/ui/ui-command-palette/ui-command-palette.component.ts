import { Component, HostListener, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchResult, SearchCategory } from '../../../core/services/search.service';

@Component({
  selector: 'app-ui-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-command-palette.component.html',
  styleUrl: './ui-command-palette.component.css'
})
export class UiCommandPaletteComponent {
  searchService = inject(SearchService);
  
  query = signal('');
  hoveredIndex = signal(-1);
  selectedIndex = signal(0);

  categories = [
    { key: 'command' as SearchCategory, label: 'Comandos' },
    { key: 'product' as SearchCategory, label: 'Productos' },
    { key: 'client' as SearchCategory, label: 'Clientes' },
    { key: 'sale' as SearchCategory, label: 'Ventas' }
  ];

  constructor() {
    // Auto-focus input when opened
    effect(() => {
      if (this.searchService.isOpen()) {
        setTimeout(() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          input?.focus();
        }, 100);
      } else {
        // Reset cuando se cierra
        this.query.set('');
        this.searchService.searchQuery.set('');
        this.selectedIndex.set(0);
        this.hoveredIndex.set(-1);
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.searchService.isOpen()) return;

    const results = this.searchService.searchResults();
    const maxIndex = results.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => Math.min(i + 1, maxIndex));
        this.hoveredIndex.set(-1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => Math.max(i - 1, 0));
        this.hoveredIndex.set(-1);
        break;

      case 'Enter':
        event.preventDefault();
        const index = this.hoveredIndex() >= 0 ? this.hoveredIndex() : this.selectedIndex();
        const result = results[index];
        if (result) {
          this.selectResult(result);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.searchService.close();
        break;
    }
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchService.searchQuery.set(value);
    // Reset selection when typing
    this.selectedIndex.set(0);
    this.hoveredIndex.set(-1);
  }

  getResultsByCategory(category: SearchCategory): SearchResult[] {
    return this.searchService.groupedResults()[category] || [];
  }

  getGlobalIndex(result: SearchResult): number {
    const results = this.searchService.searchResults();
    return results.findIndex(r => r.id === result.id);
  }

  isSelected(result: SearchResult): boolean {
    const globalIndex = this.getGlobalIndex(result);
    return this.hoveredIndex() >= 0 
      ? this.hoveredIndex() === globalIndex
      : this.selectedIndex() === globalIndex;
  }

  getResultClass(result: SearchResult, localIndex: number): string {
    const baseClass = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150';
    const selected = this.isSelected(result);
    
    return `${baseClass} ${selected 
      ? 'bg-stone-100 shadow-sm' 
      : 'hover:bg-stone-50'}`;
  }

  getIconClass(category: SearchCategory): string {
    const baseClass = 'w-8 h-8 rounded-lg flex items-center justify-center';
    
    const categoryColors: Record<SearchCategory, string> = {
      command: 'bg-blue-100 text-blue-700',
      product: 'bg-emerald-100 text-emerald-700',
      client: 'bg-purple-100 text-purple-700',
      sale: 'bg-amber-100 text-amber-700',
      navigation: 'bg-stone-100 text-stone-700'
    };

    return `${baseClass} ${categoryColors[category]}`;
  }

  selectResult(result: SearchResult) {
    this.searchService.executeResult(result);
  }

  formatPrice(value: number): string {
    const formatted = new Intl.NumberFormat('es-PE', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value);
    return `$${formatted}`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value);
  }
}
