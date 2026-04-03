import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SalesService } from './core/services/sales.service';
import { SearchService } from './core/services/search.service';
import { UiCommandPaletteComponent } from './shared/ui/ui-command-palette/ui-command-palette.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiCommandPaletteComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('sistema-master');
  private salesService = inject(SalesService);
  searchService = inject(SearchService);

  ngOnInit() {
    // SalesService se inicializa automáticamente con Supabase-first
    // No es necesario cargar manualmente
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent) {
    // Cmd+K (Mac) o Ctrl+K (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchService.toggle();
    }
  }
}
