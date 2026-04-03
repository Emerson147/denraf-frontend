/**
 * 🖼️ Configuración de Cloudinary para Imágenes de Productos
 * 
 * Cloudinary es un servicio CDN especializado en imágenes que ofrece:
 * - 25 GB de almacenamiento GRATIS (25x más que Supabase)
 * - 25 GB de bandwidth GRATIS por mes
 * - Optimización automática de imágenes
 * - Transformaciones on-the-fly
 * - CDN global para carga ultrarrápida
 * 
 * INSTRUCCIONES:
 * 1. Crear cuenta en https://cloudinary.com (gratis)
 * 2. Obtener credenciales en Settings → API Keys
 * 3. Crear upload preset "productos_preset" en Settings → Upload → Upload presets
 * 4. Reemplazar 'tu-cloud-name' con tu Cloud Name real
 */

export const cloudinaryConfig = {
  // Tu Cloud Name de Cloudinary (ej: "miempresa")
  cloudName: 'dan0pxycd', // ✅ Configurado
  
  // Upload preset para subidas sin firma (configurar en Cloudinary Dashboard)
  uploadPreset: 'productos_preset',
  
  // Carpeta donde se guardarán las imágenes
  folder: 'productos',
  
  // API endpoint para uploads
  get uploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  },
};

/**
 * Transformaciones predefinidas para diferentes usos
 */
export const imageTransformations = {
  // Thumbnail pequeño (200x200) - Para listas/grids
  thumbnail: 'w_200,h_200,c_fill,q_auto,f_auto',
  
  // Card mediana (400x400) - Para tarjetas de producto
  card: 'w_400,h_400,c_fill,q_auto,f_auto',
  
  // Detalle grande (800x800) - Para vista detallada
  detail: 'w_800,h_800,c_fit,q_auto,f_auto',
  
  // Original sin transformación
  original: '',
} as const;

export type ImageSize = keyof typeof imageTransformations;

/**
 * Obtener URL de Cloudinary con transformación
 * 
 * @param publicId ID público de la imagen (ej: "productos/producto-123")
 * @param size Tamaño/transformación deseada
 * @returns URL completa de la imagen optimizada
 * 
 * @example
 * getCloudinaryUrl('productos/producto-123', 'thumbnail')
 * // => "https://res.cloudinary.com/tu-cloud/image/upload/w_200,h_200.../productos/producto-123"
 */
export function getCloudinaryUrl(publicId: string, size: ImageSize = 'card'): string {
  if (!publicId) return '/images/placeholder-product.svg';
  
  const base = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload`;
  const transform = imageTransformations[size];
  
  return transform 
    ? `${base}/${transform}/${publicId}` 
    : `${base}/${publicId}`;
}

/**
 * Verificar si una URL es de Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url?.includes('cloudinary.com') || false;
}

/**
 * Extraer public ID de una URL de Cloudinary
 * 
 * @example
 * extractPublicId('https://res.cloudinary.com/demo/image/upload/v123/productos/item.jpg')
 * // => "productos/item"
 */
export function extractPublicId(cloudinaryUrl: string): string | null {
  const match = cloudinaryUrl.match(/\/v\d+\/(.+)\.(jpg|png|webp|gif)/);
  return match ? match[1] : null;
}
