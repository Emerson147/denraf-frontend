import { Component, signal, ChangeDetectionStrategy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiInputComponent } from '../../shared/ui/ui-input/ui-input.component';
import { UiButtonComponent } from '../../shared/ui/ui-button/ui-button.component';
import { UiLabelComponent } from '../../shared/ui/ui-label/ui-label.component';
import { ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsService, BusinessConfig } from '../../core/services/settings.service';

type SettingsTab = 'business' | 'pos' | 'appearance' | 'modules' | 'payments' | 'currency';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, UiInputComponent, UiButtonComponent, UiLabelComponent],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  themeService = inject(ThemeService);
  toast = inject(ToastService);
  settingsService = inject(SettingsService);

  activeTab = signal<SettingsTab>('business');
  isSaving = signal(false);

  tabs: TabConfig[] = [
    { id: 'business',   label: 'Empresa',        icon: 'store' },
    { id: 'pos',        label: 'POS & Impresión', icon: 'point_of_sale' },
    { id: 'payments',   label: 'Pagos QR',        icon: 'qr_code_scanner', badge: 'Yape/Plin' },
    { id: 'currency',   label: 'Multi-Moneda',    icon: 'currency_exchange' },
    { id: 'modules',    label: 'Módulos',         icon: 'toggle_on' },
    { id: 'appearance', label: 'Apariencia',      icon: 'palette' },
  ];

  posToggles = [
    { field: 'autoPrint',         label: 'Impresión Automática',   description: 'Imprimir ticket apenas se confirme la venta' },
    { field: 'lowStockAlerts',    label: 'Alertas de Stock Bajo',  description: 'Notificar cuando un producto baje del umbral configurado' },
    { field: 'emailNotifications',label: 'Notificaciones Email',   description: 'Enviar resumen diario de ventas al correo del negocio' },
    { field: 'allowNegativeStock',label: 'Permitir Stock Negativo', description: 'Permite vender aunque el stock esté en 0 (riesgo: descuadre de inventario)' },
  ];

  moduleToggles = [
    { field: 'moduleSizes',      label: 'Tallas (S, M, L, XL...)',      icon: 'straighten',     description: 'Campo de tallas en el formulario de productos' },
    { field: 'moduleColors',     label: 'Colores',                       icon: 'palette',        description: 'Campo de variantes de color por producto' },
    { field: 'moduleBrand',      label: 'Marca del Producto',            icon: 'label',          description: 'Campo de marca/fabricante en cada producto' },
    { field: 'moduleExpiration', label: 'Fecha de Vencimiento',          icon: 'event_busy',     description: 'Para Farmacias o negocios de alimentos' },
    { field: 'moduleSerial',     label: 'Número de Serie / IMEI',        icon: 'barcode_reader', description: 'Para tiendas de Electrónica o Celulares' },
    { field: 'moduleWarranty',   label: 'Garantía',                      icon: 'verified',       description: 'Para productos con garantía del fabricante' },
  ];

  // Formulario local copia del servidor
  form = signal<BusinessConfig>({
    businessName: '', ruc: '', address: '', phone: '',
    currency: 'PEN', taxPercent: 18,
    ticketFooterMessage: '', logoUrl: '',
    ticketPrinter: '', autoPrint: false,
    emailNotifications: false, lowStockAlerts: true,
    lowStockThreshold: 5, allowNegativeStock: false,
    exchangeRateUSD: 3.75, exchangeRateEUR: 4.10,
    yapeQrUrl: '', plinQrUrl: '',
    yapePhone: '', plinPhone: '',
    moduleSizes: true, moduleColors: true, moduleBrand: true,
    moduleExpiration: false, moduleSerial: false, moduleWarranty: false,
  });

  constructor() {
    effect(() => {
      const config = this.settingsService.config();
      if (config) this.form.set({ ...config });
    });
  }

  toggleField(field: keyof BusinessConfig) {
    const current = this.form()[field];
    if (typeof current === 'boolean') {
      this.form.update(f => ({ ...f, [field]: !current }));
    }
  }

  getFormBool(field: keyof BusinessConfig): boolean {
    return !!this.form()[field];
  }

  setCurrency(val: 'PEN' | 'USD') {
    this.form.update(f => ({ ...f, currency: val }));
  }

  saveSettings() {
    this.isSaving.set(true);
    this.settingsService.updateConfig(this.form()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('✓ Ajustes guardados en la Base de Datos');
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Error al guardar. Revisa la conexión al servidor.');
      }
    });
  }
}
