import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import { SettingsService } from '../../../core/services/settings.service';
import { inject } from '@angular/core';

export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    category?: string;
  };
  quantity: number;
  variant?: {
    id: string;
    size: string;
    color: string;
  };
}

@Component({
  selector: 'app-ui-ticket',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-60 flex items-center justify-center p-4"
        tabindex="0"
        (keydown.escape)="close()"
      >
        <!-- Backdrop Glassmorphism Bento -->
        <div
          class="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-500"
          (click)="close()"
        ></div>

        <!-- Toast de éxito -->
        @if (showSuccess) {
          <div
            class="fixed top-6 right-6 bg-emerald-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-2 text-sm font-bold flex items-center gap-2 z-70 border border-emerald-400"
          >
            <span class="material-symbols-outlined text-lg">check_circle</span>
            {{ successMessage }}
          </div>
        }

        <!-- Ranura de impresora (Falsa) -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-2 bg-black/40 rounded-b-xl blur-[2px] z-20"></div>

        <!-- Ticket Container Clean Modern POS -->
        <div
          class="relative z-10 w-full max-w-[380px] max-h-[95vh] flex flex-col bg-white dark:bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-printer-slide overflow-hidden rounded-3xl"
        >
          <!-- Efecto de textura sutil de papel de fondo -->
          <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none shrink-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\'/%3E%3C/svg%3E');"></div>

          <!-- Botón X Elegante para Cancelar -->
          <button
            (click)="cancel()"
            class="absolute top-6 right-5 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors shadow-sm no-print"
            aria-label="Cancelar venta"
          >
            <span class="material-symbols-outlined text-sm font-bold">close</span>
          </button>

          <!-- Header Limpio -->
          <div
            class="p-8 pb-6 text-center relative shrink-0"
          >
            <div
              class="mx-auto h-12 w-12 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[1rem] flex items-center justify-center mb-3 text-2xl font-bold shadow-sm"
            >
              D
            </div>
            <h2 class="text-xl font-bold text-stone-900 dark:text-white uppercase tracking-widest">
              {{ settingsService.config()?.businessName || 'DENFAR' }}
            </h2>
            <p class="text-xs text-stone-500 mt-1">RUC: {{ settingsService.config()?.ruc || '20123456789' }}</p>
            <p class="text-xs text-stone-500">{{ settingsService.config()?.address || 'Jr. La Moda 123, Huancayo' }}</p>
            <div
              class="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-stone-900 rounded-lg"
            >
              <span class="text-xs text-stone-900 dark:text-white font-bold"
                >#{{ ticketNumber.toString().padStart(6, '0') }}</span
              >
              <span class="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600"></span>
              <span class="text-[10px] font-bold text-stone-500">{{
                date | date: 'dd/MM HH:mm'
              }}</span>
            </div>
          </div>

          <!-- Cliente -->
          @if (clientName !== 'Cliente') {
            <div
              class="px-8 py-4 border-t border-b border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/30 shrink-0"
            >
              <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                Cliente
              </p>
              <p class="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-stone-400">person</span>
                {{ clientName }}
              </p>
              @if (clientPhone) {
                <p class="text-xs text-stone-500 mt-0.5 ml-6">{{ clientPhone }}</p>
              }
            </div>
          } @else {
            <div class="mx-8 border-t border-dashed border-stone-200 dark:border-stone-800 shrink-0"></div>
          }

          <!-- Items (Este es el que hace scroll) -->
          <div class="px-8 py-4 text-sm space-y-3 flex-1 overflow-y-auto no-scrollbar min-h-0 relative">
            @for (item of items; track item.product.id) {
              <div
                class="flex justify-between items-start py-2 border-b border-dashed border-stone-100 dark:border-stone-800/80 last:border-0"
              >
                <div class="flex gap-3 flex-1 items-start">
                  <span
                    class="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-md px-1.5 py-0.5 text-xs font-bold shrink-0"
                    >{{ item.quantity }}x</span
                  >
                  <div class="flex-1">
                    <span
                      class="text-stone-900 dark:text-stone-100 font-bold text-xs leading-tight block"
                      >{{ item.product.name }}</span
                    >
                    @if (item.variant) {
                      <div class="flex items-center gap-1.5 mt-1 mb-0.5">
                        <span class="inline-flex px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900">{{ item.variant.size }}</span>
                        <span class="inline-flex px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">{{ item.variant.color }}</span>
                      </div>
                    } @else if (item.product.category) {
                      <span class="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mt-0.5">{{
                        item.product.category
                      }}</span>
                    }
                  </div>
                </div>
                <span class="text-stone-900 dark:text-white font-bold ml-2">
                  {{ item.product.price * item.quantity | number: '1.2-2' }}
                </span>
              </div>
            }
          </div>

          <!-- Totales -->
          <div class="px-8 pb-4 relative shrink-0">
            <div class="border-t-2 border-dashed border-stone-300 dark:border-stone-700 pt-4 space-y-2">
              <div
                class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium"
              >
                <span>Subtotal neto</span>
                <span>S/ {{ subtotal | number: '1.2-2' }}</span>
              </div>
              <div
                class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium"
              >
                <span>IGV ({{ settingsService.config()?.taxPercent || 18 }}%)</span>
                <span>S/ {{ tax | number: '1.2-2' }}</span>
              </div>
              <div
                class="flex justify-between items-center text-xl font-black text-stone-900 dark:text-white pt-2"
              >
                <span>TOTAL</span>
                <span>S/ {{ total | number: '1.2-2' }}</span>
              </div>

              <!-- Método de pago y cambio -->
              @if (paymentMethod) {
                <div class="bg-stone-50 dark:bg-stone-900 rounded-xl p-4 mt-4 space-y-3 border border-stone-100 dark:border-stone-800">
                  <div
                    class="flex justify-between items-center text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider"
                  >
                    <span>Método de Pago</span>
                    <div 
                      class="px-2.5 py-1 rounded-md text-[10px] font-black text-white flex items-center gap-1 shadow-sm"
                      [ngClass]="{
                        'bg-emerald-500 shadow-emerald-500/20': paymentMethod === 'Efectivo',
                        'bg-[#742384] shadow-[#742384]/20': paymentMethod === 'Yape' || paymentMethod === 'Plin',
                        'bg-stone-900 dark:bg-stone-100 dark:text-stone-900 shadow-stone-900/20': paymentMethod === 'Tarjeta'
                      }"
                    >
                      <span class="material-symbols-outlined text-[14px]">
                        {{ paymentMethod === 'Efectivo' ? 'payments' : paymentMethod === 'Tarjeta' ? 'credit_card' : 'qr_code_scanner' }}
                      </span>
                      {{ paymentMethod }}
                    </div>
                  </div>
                  
                  @if (amountPaid > 0) {
                    <div class="flex justify-between text-xs font-bold text-stone-500 dark:text-stone-400 mt-2">
                      <span>Monto Entregado</span>
                      <span class="text-stone-900 dark:text-white">S/ {{ amountPaid | number: '1.2-2' }}</span>
                    </div>
                  }
                  
                  @if (change > 0) {
                    <div
                      class="flex justify-between text-sm font-bold text-stone-900 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-700"
                    >
                      <span>VUELTO</span>
                      <span class="text-emerald-600 dark:text-emerald-400"
                        >S/ {{ change | number: '1.2-2' }}</span
                      >
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Código QR y Mensaje de Despedida -->
            <div class="pt-6 pb-2 text-center flex flex-col items-center justify-center">
              @if (qrCode) {
                <div class="bg-white p-2 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm inline-block mb-3">
                  <img [src]="qrCode" alt="Código QR" class="w-20 h-20" />
                </div>
              }
              <p class="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                ¡Gracias por su preferencia!
              </p>
            </div>
          </div>

          <!-- Acciones -->
          <div
            class="px-8 pb-8 pt-4 flex flex-col gap-2 no-print relative bg-stone-50/50 dark:bg-stone-900/30 shrink-0"
          >
            <!-- Sombra superior para separar el papel real de la zona de botones -->
            <div class="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-stone-200/40 dark:from-stone-900/80 to-transparent pointer-events-none"></div>
            
            <div class="flex gap-2">
              <button
                (click)="printTicket()"
                class="flex-1 py-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
              >
                <span class="material-symbols-outlined text-lg">print</span>
                IMPRIMIR
              </button>
              <button
                (click)="sendToWhatsApp()"
                [disabled]="!clientPhone"
                class="flex-1 py-3.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1da851] dark:text-[#25D366] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
              >
                <span class="material-symbols-outlined text-lg">chat</span>
                WHATSAPP
              </button>
            </div>

            <button
              (click)="close()"
              class="w-full mt-2 py-4 rounded-xl font-bold transition-all active:scale-95 text-sm tracking-widest uppercase shadow-xl flex items-center justify-center gap-2"
              [ngClass]="{
                'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20': paymentMethod === 'Efectivo',
                'bg-[#742384] text-white hover:bg-[#5c1b69] shadow-[#742384]/20': paymentMethod === 'Yape' || paymentMethod === 'Plin',
                'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 shadow-stone-900/20': !paymentMethod || paymentMethod === 'Tarjeta'
              }"
            >
              <span class="material-symbols-outlined text-[18px]">done_all</span>
              Confirmar Venta
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* Animación de "Impresión de Ticket" */
      @keyframes printerSlide {
        0% {
          opacity: 0;
          transform: translateY(-80px);
          clip-path: inset(100% 0 0 0);
        }
        30% {
          opacity: 1;
        }
        100% {
          opacity: 1;
          transform: translateY(0);
          clip-path: inset(0 0 0 0);
        }
      }

      .animate-printer-slide {
        animation: printerSlide 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }

      /* Animación de slide-in para toast */
      @keyframes slideInFromTop {
        0% {
          opacity: 0;
          transform: translateY(-20px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-in {
        animation: slideInFromTop 0.3s ease-out;
      }

      /* Estilos de impresión */
      @media print {
        /* Ocultar todo */
        body * {
          visibility: hidden;
        }

        /* Mostrar solo el ticket */
        .ticket-shape,
        .ticket-shape * {
          visibility: visible;
        }

        .ticket-shape {
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm; /* Ancho estándar de impresora térmica */
          box-shadow: none;
          border-radius: 0;
        }

        /* Ocultar elementos innecesarios */
        .no-print,
        .no-print * {
          display: none !important;
        }

        /* Ocultar backdrop */
        .bg-stone-900\/40,
        .fixed.inset-0.bg-stone-900\/40 {
          display: none !important;
        }

        /* Ajustar márgenes para impresión */
        @page {
          margin: 0;
          size: 80mm auto;
        }

        /* Asegurar que el texto sea negro puro */
        .text-stone-900,
        .text-stone-700,
        .text-stone-600 {
          color: #000 !important;
        }
      }
    `,
  ],
})
export class UiTicketComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() items: CartItem[] = [];
  @Input() total = 0;
  @Input() clientName = 'Cliente';
  @Input() clientPhone = '';
  @Input() ticketNumber = 1;
  @Input() paymentMethod = '';
  @Input() amountPaid = 0;

  @Output() closeTicket = new EventEmitter<void>(); // Se usa para confirmar
  @Output() cancelTicket = new EventEmitter<void>(); // Se usa para abortar la venta (la X)
  @Output() ticketPrinted = new EventEmitter<void>();
  @Output() ticketSent = new EventEmitter<void>();

  settingsService = inject(SettingsService);

  date = new Date();
  showSuccess = false;
  successMessage = '';
  qrCode = '';

  // Calculados
  get taxRate(): number {
    return (this.settingsService.config()?.taxPercent || 18) / 100;
  }

  get subtotal(): number {
    return this.total / (1 + this.taxRate);
  }

  get tax(): number {
    return this.total - this.subtotal;
  }

  get change(): number {
    return this.amountPaid - this.total;
  }

  ngOnInit() {
    // Inicialización
  }

  ngOnChanges(changes: SimpleChanges) {
    // Generar QR cuando se abre el ticket
    if (changes['isOpen'] && this.isOpen) {
      this.generateQRCode();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isOpen) {
      this.cancel();
    }
  }

  close() {
    // CONFIRMAR VENTA
    this.isOpen = false;
    this.closeTicket.emit();
  }

  cancel() {
    // ABORTAR VENTA (BOTÓN X)
    this.isOpen = false;
    this.cancelTicket.emit();
  }

  printTicket() {
    // Esperar un momento para que Angular actualice la vista
    setTimeout(() => {
      window.print();
      this.ticketPrinted.emit();
      this.showSuccessToast('Ticket enviado a imprimir');
    }, 100);
  }

  sendToWhatsApp() {
    if (!this.clientPhone) {
      this.showSuccessToast('Por favor ingrese el número del cliente', false);
      return;
    }

    const businessName = this.settingsService.config()?.businessName || 'DENFAR';
    const address = this.settingsService.config()?.address || 'Jr. La Moda 123, Huancayo';
    const taxPercent = this.settingsService.config()?.taxPercent || 18;

    // Construir mensaje formateado
    let message = `¡Hola *${this.clientName}*! 🧥✨\n\n`;
    message += `Gracias por tu compra en *${businessName}*\n\n`;
    message += `📋 *Ticket #${this.ticketNumber.toString().padStart(6, '0')}*\n`;
    message += `📅 ${this.date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}\n\n`;

    message += `*Detalle de tu pedido:*\n`;
    message += `━━━━━━━━━━━━━━━\n`;

    this.items.forEach((item) => {
      const itemTotal = (item.product.price * item.quantity).toFixed(2);
      message += `• ${item.quantity}x ${item.product.name}\n`;
      message += `  S/ ${item.product.price.toFixed(2)} c/u = S/ ${itemTotal}\n`;
    });

    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `Subtotal: S/ ${this.subtotal.toFixed(2)}\n`;
    message += `IGV (${taxPercent}%): S/ ${this.tax.toFixed(2)}\n`;
    message += `💰 *TOTAL: S/ ${this.total.toFixed(2)}*\n\n`;

    if (this.paymentMethod && this.amountPaid > 0) {
      message += `Método de pago: ${this.paymentMethod}\n`;
      message += `Recibido: S/ ${this.amountPaid.toFixed(2)}\n`;
      if (this.change > 0) {
        message += `Cambio: S/ ${this.change.toFixed(2)}\n\n`;
      }
    }

    message += `¡Esperamos verte pronto! 🙏\n`;
    message += `_${address}_`;

    // Limpiar el número de teléfono (solo dígitos)
    const cleanPhone = this.clientPhone.replace(/\D/g, '');

    // Construir URL de WhatsApp
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    // Abrir en nueva pestaña
    window.open(url, '_blank');

    // Emitir evento y mostrar confirmación
    this.ticketSent.emit();
    this.showSuccessToast('Mensaje enviado a WhatsApp');
  }

  private showSuccessToast(message: string, isSuccess = true) {
    this.successMessage = message;
    this.showSuccess = true;

    setTimeout(() => {
      this.showSuccess = false;
    }, 2500);
  }

  // Método para generar código QR
  async generateQRCode() {
    try {
      // QR simple y corto para fácil escaneo
      const ticketId = this.ticketNumber.toString().padStart(6, '0');
      const businessName = this.settingsService.config()?.businessName || 'DENFAR';

      // Contenido mínimo = QR más simple y escaneable
      const qrContent = `${businessName} #${ticketId}\nTotal: S/${this.total.toFixed(2)}\n${this.items.length} items`;

      this.qrCode = await QRCode.toDataURL(qrContent, {
        width: 150,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Error generando QR:', error);
    }
  }
}
