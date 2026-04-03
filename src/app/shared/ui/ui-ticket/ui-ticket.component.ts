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
        
        <!-- Backdrop suave y zen -->
        <div 
          class="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-all duration-300" 
          (click)="close()"
        ></div>

        <!-- Toast de éxito -->
        @if (showSuccess) {
          <div class="fixed top-6 right-6 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 text-sm font-medium flex items-center gap-2 z-70">
            <span class="material-icons-outlined text-lg">check_circle</span>
            {{ successMessage }}
          </div>
        }

        <!-- Ticket Container -->
        <div class="relative z-10 w-full max-w-sm bg-white shadow-2xl animate-print-in overflow-hidden ticket-shape">
            
            <!-- Header -->
            <div class="p-8 pb-4 text-center border-b-2 border-dashed border-stone-200">
                <div class="mx-auto h-14 w-14 bg-stone-900 text-white rounded-full flex items-center justify-center mb-3 text-2xl font-serif italic shadow-md">D</div>
                <h2 class="text-xl font-bold text-stone-900 uppercase tracking-widest">DENFAR</h2>
                <p class="text-xs text-stone-500 font-mono mt-1">RUC: 20123456789</p>
                <p class="text-xs text-stone-500 font-mono">Jr. La Moda 123, Huancayo</p>
                <p class="text-xs text-stone-400 font-mono mt-2">{{ date | date:'dd/MM/yyyy HH:mm' }}</p>
                <p class="text-xs text-stone-600 font-bold font-mono mt-1">Ticket #{{ ticketNumber.toString().padStart(6, '0') }}</p>
            </div>

            <!-- Cliente -->
            @if (clientName !== 'Cliente') {
              <div class="px-8 pt-4 pb-2 border-b border-stone-100">
                <p class="text-xs text-stone-400 uppercase tracking-wide">Cliente</p>
                <p class="text-sm font-bold text-stone-900 font-mono">{{ clientName }}</p>
                @if (clientPhone) {
                  <p class="text-xs text-stone-500 font-mono">{{ clientPhone }}</p>
                }
              </div>
            }

            <!-- Items -->
            <div class="p-8 py-6 font-mono text-sm space-y-3">
                
                @for (item of items; track item.product.id) {
                    <div class="space-y-1">
                        <div class="flex justify-between items-start">
                            <div class="flex gap-2 flex-1">
                                <span class="font-bold text-stone-900">{{ item.quantity }}x</span>
                                <div class="flex-1">
                                    <span class="text-stone-700 uppercase text-xs leading-tight block">{{ item.product.name }}</span>
                                    @if (item.product.category) {
                                        <span class="text-[10px] text-stone-400">{{ item.product.category }}</span>
                                    }
                                </div>
                            </div>
                            <span class="text-stone-900 font-bold whitespace-nowrap ml-2">
                                {{ (item.product.price * item.quantity) | number:'1.2-2' }}
                            </span>
                        </div>
                        <div class="flex justify-between text-[10px] text-stone-400 ml-6">
                            <span>S/ {{ item.product.price | number:'1.2-2' }} c/u</span>
                        </div>
                    </div>
                }

                <!-- Totales -->
                <div class="border-t-2 border-dashed border-stone-200 my-4 pt-4 space-y-1">
                    <div class="flex justify-between text-xs text-stone-600">
                        <span>Subtotal</span>
                        <span>S/ {{ subtotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-xs text-stone-600">
                        <span>IGV (18%)</span>
                        <span>S/ {{ tax | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                        <span>TOTAL</span>
                        <span>S/ {{ total | number:'1.2-2' }}</span>
                    </div>

                    <!-- Método de pago y cambio -->
                    @if (paymentMethod && amountPaid > 0) {
                      <div class="mt-3 pt-3 border-t border-stone-200 space-y-1 text-xs">
                        <div class="flex justify-between text-stone-600">
                          <span>Método de pago</span>
                          <span class="font-bold">{{ paymentMethod }}</span>
                        </div>
                        <div class="flex justify-between text-stone-600">
                          <span>Recibido</span>
                          <span>S/ {{ amountPaid | number:'1.2-2' }}</span>
                        </div>
                        @if (change > 0) {
                          <div class="flex justify-between text-stone-900 font-bold">
                            <span>Cambio</span>
                            <span>S/ {{ change | number:'1.2-2' }}</span>
                          </div>
                        }
                      </div>
                    }

                    <p class="text-[10px] text-stone-400 mt-3 text-center uppercase tracking-wide">
                        Gracias por tu preferencia
                    </p>
                </div>
            </div>

            <!-- Código QR (opcional) -->
            @if (qrCode) {
              <div class="px-8 pb-4 flex flex-col items-center border-t border-stone-100 pt-4">
                <p class="text-[10px] text-stone-400 uppercase mb-2">Verifica tu ticket</p>
                <img [src]="qrCode" class="w-20 h-20 border border-stone-200 rounded-lg" alt="Código QR">
              </div>
            }

            <!-- Botones de acción -->
            <div class="bg-stone-50 p-6 flex flex-col gap-3 no-print">
                
                <!-- Imprimir -->
                <button 
                    (click)="printTicket()"
                    class="w-full py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    aria-label="Imprimir ticket"
                >
                    <span class="material-icons-outlined">print</span>
                    Imprimir Ticket
                </button>

                <!-- WhatsApp -->
                <button 
                    (click)="sendToWhatsApp()"
                    [disabled]="!clientPhone"
                    class="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    [attr.aria-label]="clientPhone ? 'Enviar ticket por WhatsApp' : 'Ingrese número de teléfono del cliente'"
                >
                    <span class="material-icons-outlined">chat</span>
                    {{ clientPhone ? 'Enviar al Cliente' : 'Sin número de teléfono' }}
                </button>

                <!-- Cerrar -->
                <button 
                    (click)="close()"
                    class="w-full py-3 rounded-xl border-2 border-stone-200 text-stone-600 font-bold hover:bg-stone-100 transition-colors active:scale-95"
                    aria-label="Cerrar ticket y comenzar nueva venta"
                >
                    Cerrar / Nueva Venta
                </button>
            </div>

            <!-- Efecto papel cortado -->
            <div class="absolute bottom-0 left-0 right-0 h-4 bg-stone-900/5 jagged-edge"></div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* Fuente Monoespaciada para efecto Ticket */
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
  
  @Output() closeTicket = new EventEmitter<void>();
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
      this.close();
    }
  }

  close() {
    this.isOpen = false;
    this.closeTicket.emit();
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