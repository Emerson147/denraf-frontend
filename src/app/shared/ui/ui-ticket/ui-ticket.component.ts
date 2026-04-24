import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';

export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    category?: string;
  };
  quantity: number;
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
          <div class="fixed top-6 right-6 bg-emerald-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-2 text-sm font-bold flex items-center gap-2 z-70 border border-emerald-400">
            <span class="material-icons-outlined text-lg">check_circle</span>
            {{ successMessage }}
          </div>
        }

        <!-- Ticket Container Clean Modern POS -->
        <div class="relative z-10 w-full max-w-[380px] bg-white dark:bg-[#111111] shadow-2xl animate-print-in overflow-hidden rounded-3xl border border-stone-200 dark:border-stone-800">
            
            <!-- Botón X Elegante para Cancelar -->
            <button 
                (click)="cancel()"
                class="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors shadow-sm no-print"
                aria-label="Cancelar venta"
            >
                <span class="material-icons-outlined text-sm font-bold">close</span>
            </button>

            <!-- Header Limpio -->
            <div class="p-8 pb-6 text-center border-b border-stone-100 dark:border-stone-800 relative">
                <div class="mx-auto h-12 w-12 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[1rem] flex items-center justify-center mb-3 text-2xl font-bold shadow-sm">D</div>
                <h2 class="text-xl font-bold text-stone-900 dark:text-white uppercase tracking-widest">DENFAR</h2>
                <p class="text-xs text-stone-500 mt-1">RUC: 20123456789</p>
                <p class="text-xs text-stone-500">Jr. La Moda 123, Huancayo</p>
                <div class="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-stone-900 rounded-lg">
                  <span class="text-xs text-stone-900 dark:text-white font-bold">#{{ ticketNumber.toString().padStart(6, '0') }}</span>
                  <span class="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600"></span>
                  <span class="text-[10px] font-bold text-stone-500">{{ date | date:'dd/MM HH:mm' }}</span>
                </div>
            </div>

            <!-- Cliente -->
            @if (clientName !== 'Cliente') {
              <div class="px-8 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Cliente</p>
                <p class="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <span class="material-icons-outlined text-[16px] text-stone-400">person</span>
                  {{ clientName }}
                </p>
                @if (clientPhone) {
                  <p class="text-xs text-stone-500 mt-0.5 ml-6">{{ clientPhone }}</p>
                }
              </div>
            }

            <!-- Items -->
            <div class="p-8 py-4 text-sm space-y-3 max-h-[35vh] overflow-y-auto no-scrollbar">
                @for (item of items; track item.product.id) {
                    <div class="flex justify-between items-start py-2 border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                        <div class="flex gap-3 flex-1 items-start">
                            <span class="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-md px-1.5 py-0.5 text-xs font-bold shrink-0">{{ item.quantity }}x</span>
                            <div class="flex-1">
                                <span class="text-stone-900 dark:text-stone-100 font-bold text-xs leading-tight block">{{ item.product.name }}</span>
                                @if (item.product.category) {
                                    <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{{ item.product.category }}</span>
                                }
                            </div>
                        </div>
                        <span class="text-stone-900 dark:text-white font-bold ml-2">
                            {{ (item.product.price * item.quantity) | number:'1.2-2' }}
                        </span>
                    </div>
                }
            </div>

            <!-- Totales -->
            <div class="px-8 pb-4">
                <div class="border-t-2 border-stone-900 dark:border-white pt-4 space-y-2">
                    <div class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
                        <span>Subtotal neto</span>
                        <span>S/ {{ subtotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
                        <span>IGV (18%)</span>
                        <span>S/ {{ tax | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center text-xl font-black text-stone-900 dark:text-white pt-2">
                        <span>TOTAL</span>
                        <span>S/ {{ total | number:'1.2-2' }}</span>
                    </div>

                    <!-- Método de pago y cambio -->
                    @if (paymentMethod && amountPaid > 0) {
                      <div class="bg-stone-50 dark:bg-stone-900 rounded-xl p-4 mt-4 space-y-2">
                        <div class="flex justify-between text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                          <span>Pago vía {{ paymentMethod }}</span>
                          <span class="text-stone-900 dark:text-white">S/ {{ amountPaid | number:'1.2-2' }}</span>
                        </div>
                        @if (change > 0) {
                          <div class="flex justify-between text-sm font-bold text-stone-900 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-700">
                            <span>VUELTO</span>
                            <span class="text-emerald-600 dark:text-emerald-400">S/ {{ change | number:'1.2-2' }}</span>
                          </div>
                        }
                      </div>
                    }
                </div>
            </div>

            <!-- Acciones -->
            <div class="p-8 pt-0 flex flex-col gap-2 no-print border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-[#111111]">
                <div class="flex gap-2 mt-4">
                  <button 
                      (click)="printTicket()"
                      class="flex-1 py-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                  >
                      <span class="material-icons-outlined text-lg">print</span>
                      IMPRIMIR
                  </button>
                  <button 
                      (click)="sendToWhatsApp()"
                      [disabled]="!clientPhone"
                      class="flex-1 py-3.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1da851] dark:text-[#25D366] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                      <span class="material-icons-outlined text-lg">chat</span>
                      WHATSAPP
                  </button>
                </div>
                
                <button 
                    (click)="close()"
                    class="w-full mt-2 py-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold hover:opacity-90 transition-all active:scale-95 text-sm tracking-widest uppercase shadow-xl shadow-stone-900/20"
                >
                    Confirmar Venta
                </button>
            </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Animación de "Impresión" */
    @keyframes printIn {
      0% { 
        opacity: 0; 
        transform: translateY(-50px) scale(0.95); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    .animate-print-in {
      animation: printIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
      .ticket-shape, .ticket-shape * {
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
      .no-print, .no-print * {
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
  `]
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

  date = new Date();
  showSuccess = false;
  successMessage = '';
  qrCode = '';

  // Calculados
  get subtotal(): number {
    return this.total / 1.18;
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

  close() { // CONFIRMAR VENTA
    this.isOpen = false;
    this.closeTicket.emit();
  }

  cancel() { // ABORTAR VENTA (BOTÓN X)
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

    // Construir mensaje formateado
    let message = `¡Hola *${this.clientName}*! 🧥✨\n\n`;
    message += `Gracias por tu compra en *DENFAR*\n\n`;
    message += `📋 *Ticket #${this.ticketNumber.toString().padStart(6, '0')}*\n`;
    message += `📅 ${this.date.toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    
    message += `*Detalle de tu pedido:*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    
    this.items.forEach(item => {
      const itemTotal = (item.product.price * item.quantity).toFixed(2);
      message += `• ${item.quantity}x ${item.product.name}\n`;
      message += `  S/ ${item.product.price.toFixed(2)} c/u = S/ ${itemTotal}\n`;
    });

    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `Subtotal: S/ ${this.subtotal.toFixed(2)}\n`;
    message += `IGV (18%): S/ ${this.tax.toFixed(2)}\n`;
    message += `💰 *TOTAL: S/ ${this.total.toFixed(2)}*\n\n`;

    if (this.paymentMethod && this.amountPaid > 0) {
      message += `Método de pago: ${this.paymentMethod}\n`;
      message += `Recibido: S/ ${this.amountPaid.toFixed(2)}\n`;
      if (this.change > 0) {
        message += `Cambio: S/ ${this.change.toFixed(2)}\n\n`;
      }
    }

    message += `¡Esperamos verte pronto! 🙏\n`;
    message += `_Jr. La Moda 123, Huancayo_`;

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
      
      // Contenido mínimo = QR más simple y escaneable
      const qrContent = `DENFAR #${ticketId}\nTotal: S/${this.total.toFixed(2)}\n${this.items.length} items`;
      
      this.qrCode = await QRCode.toDataURL(qrContent, {
        width: 150,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generando QR:', error);
    }
  }
}