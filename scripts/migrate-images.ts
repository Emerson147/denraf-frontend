/**
 * 📤 Script de Migración de Imágenes: Supabase → Cloudinary
 * 
 * Este script migra todas las imágenes de productos desde Supabase Storage a Cloudinary.
 * Las URLs en la base de datos se actualizan automáticamente.
 * 
 * ANTES DE EJECUTAR:
 * 1. Configurar cloudinary.config.ts con tu Cloud Name real
 * 2. Crear upload preset "productos_preset" en Cloudinary Dashboard
 * 3. Tener credenciales de Supabase en environment.ts
 * 
 * EJECUTAR:
 * npm run migrate-images
 * 
 * O manualmente:
 * npx ts-node --esm scripts/migrate-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import { cloudinaryConfig } from '../src/environments/cloudinary.config.ts';
import { environment } from '../src/environments/environment.ts';

// Configuración
const BATCH_SIZE = 10; // Procesar 10 imágenes a la vez
const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes

interface Product {
  id: string;
  name: string;
  image: string | null;
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ productId: string; name: string; error: string }>;
}

/**
 * Cliente de Supabase
 */
const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

/**
 * Verificar configuración antes de empezar
 */
function verifyConfiguration(): boolean {
  console.log('🔍 Verificando configuración...\n');

  if (cloudinaryConfig.cloudName === 'tu-cloud-name') {
    console.error('❌ ERROR: Debes configurar tu Cloud Name en cloudinary.config.ts');
    return false;
  }

  console.log('✅ Cloud Name:', cloudinaryConfig.cloudName);
  console.log('✅ Upload Preset:', cloudinaryConfig.uploadPreset);
  console.log('✅ Folder:', cloudinaryConfig.folder);
  console.log('✅ Supabase URL:', environment.supabaseUrl.substring(0, 30) + '...\n');

  return true;
}

/**
 * Subir imagen a Cloudinary
 */
async function uploadToCloudinary(
  imageUrl: string,
  publicId: string
): Promise<string> {
  try {
    // Descargar imagen de Supabase
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const file = new File([blob], `${publicId}.jpg`, { type: blob.type });

    // Subir a Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', cloudinaryConfig.folder);
    formData.append('public_id', publicId);

    const uploadResponse = await fetch(cloudinaryConfig.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await uploadResponse.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.secure_url;
  } catch (error) {
    throw error;
  }
}

/**
 * Procesar un lote de productos
 */
async function processBatch(products: Product[]): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: products.length,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  for (const product of products) {
    try {
      // Saltar si no tiene imagen
      if (!product.image) {
        console.log(`⏭️  ${product.name} - Sin imagen, saltando`);
        result.skipped++;
        continue;
      }

      // Saltar si ya es de Cloudinary
      if (product.image.includes('cloudinary.com')) {
        console.log(`⏭️  ${product.name} - Ya está en Cloudinary`);
        result.skipped++;
        continue;
      }

      console.log(`📤 Migrando: ${product.name}...`);

      // Subir a Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(
        product.image,
        `producto-${product.id}`
      );

      // Actualizar URL en Supabase
      const { error: updateError } = await supabase
        .from('productos')
        .update({ image: cloudinaryUrl })
        .eq('id', product.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ ${product.name} - Migrado exitosamente`);
      result.migrated++;
    } catch (error: any) {
      console.error(`❌ ${product.name} - Error:`, error.message);
      result.errors++;
      result.errorDetails.push({
        productId: product.id,
        name: product.name,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Función principal de migración
 */
async function migrateImages(): Promise<void> {
  console.log('🚀 INICIANDO MIGRACIÓN DE IMÁGENES\n');
  console.log('═══════════════════════════════════════════\n');

  // Verificar configuración
  if (!verifyConfiguration()) {
    process.exit(1);
  }

  try {
    // 1. Obtener todos los productos
    console.log('📦 Obteniendo productos de Supabase...');
    const { data: products, error } = await supabase
      .from('productos')
      .select('id, name, image')
      .not('image', 'is', null);

    if (error) {
      throw error;
    }

    if (!products || products.length === 0) {
      console.log('⚠️  No se encontraron productos con imágenes');
      return;
    }

    console.log(`✅ ${products.length} productos encontrados\n`);

    // 2. Dividir en lotes
    const batches: Product[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Procesando en ${batches.length} lotes de ${BATCH_SIZE}\n`);

    // 3. Procesar lotes
    const totalResult: MigrationResult = {
      total: products.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    for (let i = 0; i < batches.length; i++) {
      console.log(`\n📦 Lote ${i + 1}/${batches.length}`);
      console.log('───────────────────────────────────────');

      const batchResult = await processBatch(batches[i]);

      totalResult.migrated += batchResult.migrated;
      totalResult.skipped += batchResult.skipped;
      totalResult.errors += batchResult.errors;
      totalResult.errorDetails.push(...batchResult.errorDetails);

      // Esperar entre lotes (evitar rate limiting)
      if (i < batches.length - 1) {
        console.log(`\n⏳ Esperando ${DELAY_BETWEEN_BATCHES / 1000}s antes del siguiente lote...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // 4. Resumen final
    console.log('\n\n═══════════════════════════════════════════');
    console.log('🎉 MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📊 Total de productos: ${totalResult.total}`);
    console.log(`✅ Migrados: ${totalResult.migrated}`);
    console.log(`⏭️  Saltados: ${totalResult.skipped}`);
    console.log(`❌ Errores: ${totalResult.errors}\n`);

    if (totalResult.errors > 0) {
      console.log('❌ ERRORES DETALLADOS:');
      console.log('───────────────────────────────────────');
      totalResult.errorDetails.forEach((err) => {
        console.log(`\n• ${err.name} (ID: ${err.productId})`);
        console.log(`  Error: ${err.error}`);
      });
      console.log('\n');
    }

    if (totalResult.migrated > 0) {
      console.log('✅ Las URLs fueron actualizadas en Supabase');
      console.log('✅ Las imágenes ahora se sirven desde Cloudinary CDN');
      console.log('✅ Tu app ya está usando las nuevas URLs\n');
    }
  } catch (error: any) {
    console.error('\n❌ ERROR FATAL:', error.message);
    process.exit(1);
  }
}

// Ejecutar migración
migrateImages()
  .then(() => {
    console.log('✅ Proceso finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  });
