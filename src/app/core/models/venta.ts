export interface VentaItemRequest {
  productId: string; // UUID
  varianteId?: string; // UUID (opcional)
  quantity: number;
}

export interface VentaRequest {
  userId?: string; // UUID
  vendedorId?: string; // UUID
  customerId?: string; // UUID (opcional)
  items: VentaItemRequest[];
  discount?: number;
  tax?: number;
  paymentMethod: string;
  notes?: string;
  createdBy?: string;
}

export interface VentaResponse {
  id: string; // UUID
  saleNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  // Existen más propiedades retornadas, pero estas son las esenciales del VentaResponse
}
