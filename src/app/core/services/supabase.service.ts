/**
 * 🔌 Supabase Client Service
 *
 * Cliente único de Supabase para toda la aplicación.
 * Proporciona acceso a la base de datos PostgreSQL en la nube.
 *
 * IMPORTANTE: Reemplaza las credenciales en environment.ts
 * con las de tu proyecto de Supabase.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Crear cliente único (singleton) con configuración de timeout
export const supabase: SupabaseClient = createClient(
  environment.supabaseUrl,
  environment.supabaseKey,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'denraf-pos-app',
      },
    },
    // ⚡ Aumentar timeout para consultas pesadas (30 segundos)
    // Esto ayuda con consultas grandes de productos
  }
);

/**
 * Helper para verificar si hay conexión con Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('productos').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
