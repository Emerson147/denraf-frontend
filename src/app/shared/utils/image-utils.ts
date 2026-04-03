/**
 * 🖼️ Utilidad para manejo de imágenes con fallback
 * 
 * Soluciona problemas cuando Supabase Storage excede límites del plan gratuito
 */

/**
 * Obtener URL de imagen con fallback a placeholder local
 */
export function getProductImageUrl(imageUrl: string | null | undefined): string {
  // Si no hay URL, usar placeholder local
  if (!imageUrl || imageUrl.trim() === '') {
    return '/images/placeholder-product.svg';
  }

  // Si es una URL completa de Supabase, mantenerla (puede fallar si excede límite)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Si es una ruta relativa, asumir que es de Supabase Storage
  // Esto fallará si el plan gratuito está excedido
  return imageUrl;
}

/**
 * Evento de error en imagen - cambiar a placeholder
 */
export function handleImageError(event: Event | string): void {
  if (typeof event === 'string') return;
  
  const img = event.target as HTMLImageElement;
  if (img && !img.src.includes('placeholder-product.svg')) {
    console.warn('⚠️ Error cargando imagen, usando placeholder:', img.src);
    img.src = '/images/placeholder-product.svg';
  }
}

/**
 * Configuración de lazy loading para imágenes
 */
export function setupLazyImage(img: HTMLImageElement): void {
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    if (!img.src.includes('placeholder-product.svg')) {
      console.warn('⚠️ Error cargando imagen, usando placeholder:', img.src);
      img.src = '/images/placeholder-product.svg';
    }
  });
}

/**
 * Verificar si una URL de imagen es accesible
 */
export async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generar avatar con iniciales (alternativa visual a imágenes)
 */
export function generateInitialsAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];
  
  const color = colors[name.length % colors.length];

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="100" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="middle">
        ${initials}
      </text>
    </svg>
  `)}`;
}
