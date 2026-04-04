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

        <!-- Ticket Container Zen Bento con fusión de Papel Térmico Elegante -->
        <div class="relative z-10 w-full max-w-[380px] bg-white dark:bg-stone-900 shadow-2xl shadow-stone-900/30 animate-print-in overflow-hidden ticket-shape border border-stone-200 dark:border-stone-800">
            
            <!-- Botón X Elegante para Cancelar -->
            <button 
                (click)="cancel()"
                class="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors shadow-sm no-print"
                aria-label="Cancelar venta"
            >
                <span class="material-icons-outlined text-sm font-bold">close</span>
            </button>

            <!-- Header Glow -->
            <div class="p-6 text-center border-b border-stone-200/50 dark:border-stone-800/50 relative overflow-hidden">
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-stone-500/10 blur-3xl rounded-full"></div>
                <div class="relative z-10">
                  <div class="mx-auto h-12 w-12 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-[1rem] flex items-center justify-center mb-3 text-xl font-serif italic shadow-md">D</div>
                  <h2 class="text-xl font-black text-stone-900 dark:text-stone-100 uppercase tracking-widest">DENFAR</h2>
                  <p class="text-[10px] text-stone-500 font-mono mt-1 tracking-wider">RUC: 20123456789</p>
                  <p class="text-[10px] text-stone-500 font-mono tracking-wider">Jr. La Moda 123, Huancayo</p>
                  <div class="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 dark:bg-stone-800/50 rounded-lg">
                    <span class="text-xs text-stone-900 dark:text-stone-100 font-bold font-mono">#{{ ticketNumber.toString().padStart(6, '0') }}</span>
                    <span class="w-1 h-1 rounded-full bg-stone-300"></span>
                    <span class="text-[10px] text-stone-500 font-medium">{{ date | date:'dd/MM HH:mm' }}</span>
                  </div>
                </div>
            </div>

            <!-- Cliente -->
            @if (clientName !== 'Cliente') {
              <div class="px-6 py-4 border-b border-stone-200/50 dark:border-stone-800/50 bg-stone-50/30 dark:bg-stone-950/30">
                <p class="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Cliente</p>
                <p class="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span class="material-icons-outlined text-[16px] text-stone-400">person</span>
                  {{ clientName }}
                </p>
                @if (clientPhone) {
                  <p class="text-xs text-stone-500 mt-0.5 ml-6">{{ clientPhone }}</p>
                }
              </div>
            }

            <!-- Items -->
            <div class="p-6 font-mono text-sm space-y-4 max-h-[35vh] overflow-y-auto no-scrollbar">
                @for (item of items; track item.product.id) {
                    <div class="flex flex-col gap-1 bg-white/40 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-700/50 p-3 rounded-2xl">
                        <div class="flex justify-between items-start">
                            <div class="flex gap-2 flex-1 items-start">
                                <span class="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 mt-0.5">{{ item.quantity }}x</span>
                                <div class="flex-1">
                                    <span class="text-stone-900 dark:text-stone-100 font-medium text-xs leading-tight block uppercase">{{ item.product.name }}</span>
                                    @if (item.product.category) {
                                        <span class="text-[9px] text-stone-400 tracking-wider">{{ item.product.category }}</span>
                                    }
                                </div>
                            </div>
                            <span class="text-stone-900 dark:text-stone-100 font-bold ml-2">
                                {{ (item.product.price * item.quantity) | number:'1.2-2' }}
                            </span>
                        </div>
                    </div>
                }
            </div>

            <!-- Totales -->
            <div class="px-6 pb-2">
                <div class="border-t border-dashed border-stone-300 dark:border-stone-700 pt-4 space-y-1.5">
                    <div class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium font-sans">
                        <span>Subtotal</span>
                        <span class="font-mono">S/ {{ subtotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-medium font-sans">
                        <span>IGV (18%)</span>
                        <span class="font-mono">S/ {{ tax | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center text-xl font-bold text-stone-900 dark:text-stone-100 pt-3 mt-1 border-t border-stone-200/50 dark:border-stone-800/50">
                        <span class="font-sans">TOTAL</span>
                        <span>S/ {{ total | number:'1.2-2' }}</span>
                    </div>

                    <!-- Método de pago y cambio -->
                    @if (paymentMethod && amountPaid > 0) {
                      <div class="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 mt-4 mb-2 space-y-1.5 font-sans">
                        <div class="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                          <span>Pago vía {{ paymentMethod }}</span>
                          <span class="font-mono font-medium text-stone-900 dark:text-stone-100">S/ {{ amountPaid | number:'1.2-2' }}</span>
                        </div>
                        @if (change > 0) {
                          <div class="flex justify-between text-xs font-bold text-stone-900 dark:text-stone-100 pt-1.5 border-t border-stone-200/50 dark:border-stone-700/50">
                            <span>Vuelto</span>
                            <span class="font-mono">S/ {{ change | number:'1.2-2' }}</span>
                          </div>
                        }
                      </div>
                    }
                </div>
            </div>

            <!-- Acciones Glassmorphism -->
            <div class="p-6 pt-2 flex flex-col gap-2.5 no-print">
                <!-- Compartir/Imprimir Doble -->
                <div class="flex gap-2">
                  <button 
                      (click)="printTicket()"
                      class="flex-1 py-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-black dark:hover:bg-white text-white dark:text-stone-900 font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs"
                  >
                      <span class="material-icons-outlined text-lg">print</span>
                      IMPRIMIR
                  </button>
                  <button 
                      (click)="sendToWhatsApp()"
                      [disabled]="!clientPhone"
                      class="flex-1 py-3.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#1da851] dark:text-[#25D366] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                      <span class="material-icons-outlined text-lg">chat</span>
                      WHATSAPP
                  </button>
                </div>
                
                
                <button 
                    (click)="close()"
                    class="w-full py-3 rounded-xl border-2 border-stone-900 dark:border-stone-100 bg-transparent text-stone-900 dark:text-stone-100 font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-all active:scale-95 text-xs tracking-widest uppercase"
                >
                    Confirmar Venta
                </button>
            </div>

            <!-- Efecto papel cortado elegante reintroducido -->
            <div class="absolute bottom-0 left-0 right-0 h-3 bg-stone-900/5 jagged-edge no-print"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Efecto Papel Cortado (Zig Zag) reconstruido elegante */
    .ticket-shape {
      border-radius: 12px 12px 0 0;
    }
    
    .jagged-edge {
      background: linear-gradient(-45deg, transparent 12px, #ffffff 0) left, 
                  linear-gradient(45deg, transparent 12px, #ffffff 0) left;
      background-size: 12px 12px;
      background-repeat: repeat-x;
      height: 12px;
      bottom: -12px;
      position: absolute;
      width: 100%;
      transform: rotate(180deg);
      filter: drop-shadow(0px -2px 1px rgba(0,0,0,0.05));
    }

    @media (prefers-color-scheme: dark) {
      .jagged-edge {
        background: linear-gradient(-45deg, transparent 12px, #1c1917 0) left, 
                    linear-gradient(45deg, transparent 12px, #1c1917 0) left;
        background-size: 12px 12px;
      }
    }
    .font-mono { 
      font-family: 'Space Mono', 'Courier New', monospace; 
    }

    /* Efecto Papel Cortado (Zig Zag) */
    .ticket-shape {
      border-radius: 16px 16px 0 0;
    }
    
    .jagged-edge {
      background: linear-gradient(-45deg, transparent 16px, #f9fafb 0), 
                  linear-gradient(45deg, transparent 16px, #f9fafb 0);
      background-repeat: repeat-x;
      background-size: 16px 16px;
      background-position: left bottom;
      height: 16px;
      bottom: -16px;
      position: absolute;
      width: 100%;
      transform: rotate(180deg);
    }

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