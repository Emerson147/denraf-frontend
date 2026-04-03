/**
 * 📤 Script de Migración: Base64 → Cloudinary
 * 
 * Este script migra imágenes guardadas como base64 en Supabase a Cloudinary.
 * Las imágenes base64 son esas que empiezan con "data:image/..." y tienen miles de caracteres.
 * 
 * EJECUTAR:
 * npm run migrate-base64-images
 */

import { createClient } from '@supabase/supabase-js';
import { cloudinaryConfig } from '../src/environments/cloudinary.config.ts';
import { environment } from '../src/environments/environment.ts';

// Configuración
const BATCH_SIZE = 5; // Procesar 5 imágenes a la vez (base64 es pesado)
const DELAY_BETWEEN_BATCHES = 3000; // 3 segundos entre lotes

interface Product {
  id: string;
  name: string;
  image: string | null;
}

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

/**
 * Verificar que la imagen es base64
 */
function isBase64Image(image: string | null): boolean {
  if (!image) return false;
  return image.startsWith('data:image/') || image.length > 1000;
}

/**
 * Convertir base64 a File
 */
function base64ToFile(base64: string, filename: string): File {
  // Extraer el tipo de imagen
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
  
  if (!matches) {
    // Si no tiene el prefijo data:image, asumir que es base64 puro
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new File([array], filename, { type: 'image/jpeg' });
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  
  // Convertir base64 a binary
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new File([array], filename, { type: mimeType });
}

/**
 * Subir imagen a Cloudinary
 */
async function uploadToCloudinary(base64Image: string, publicId: string): Promise<string> {
  try {
    // Convertir base64 a File
    const file = base64ToFile(base64Image, `${publicId}.jpg`);
    
    console.log(`  📦 Tamaño: ${(file.size / 1024).toFixed(2)} KB`);

    // Subir a Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', cloudinaryConfig.folder);
    formData.append('public_id', publicId);

    const response = await fetch(cloudinaryConfig.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

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
async function processBatch(products: Product[], batchNumber: number, totalBatches: number) {
  console.log(`\n📦 Lote ${batchNumber}/${totalBatches}`);
  console.log('═══════════════════════════════════════');

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Saltar si no tiene imagen
      if (!product.image) {
        console.log(`⏭️  ${product.name} - Sin imagen`);
        skipped++;
        continue;
      }

      // Saltar si ya es de Cloudinary
      if (product.image.includes('cloudinary.com')) {
        console.log(`⏭️  ${product.name} - Ya en Cloudinary`);
        skipped++;
        continue;
      }

      // Saltar si no es base64
      if (!isBase64Image(product.image)) {
        console.log(`⏭️  ${product.name} - No es base64 (URL externa)`);
        skipped++;
        continue;
      }

      console.log(`\n📤 ${product.name}`);
      console.log(`  🔍 Detectado: Imagen base64 (${product.image.length} caracteres)`);

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

      console.log(`  ✅ Migrado: ${cloudinaryUrl.substring(0, 60)}...`);
      migrated++;

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      errors++;
    }
  }

  return { migrated, skipped, errors };
}

/**
 * Función principal
 */
async function migrateBase64Images() {
  console.log('\n🚀 MIGRACIÓN DE IMÁGENES BASE64 → CLOUDINARY\n');
  console.log('═══════════════════════════════════════════════\n');

  // Verificar configuración
  if (cloudinaryConfig.cloudName === 'tu-cloud-name') {
    console.error('❌ ERROR: Configura tu Cloud Name en cloudinary.config.ts');
    process.exit(1);
  }

  console.log(`✅ Cloud Name: ${cloudinaryConfig.cloudName}`);
  console.log(`✅ Upload Preset: ${cloudinaryConfig.uploadPreset}`);
  console.log(`✅ Folder: ${cloudinaryConfig.folder}\n`);

  try {
    // 1. Obtener IDs de productos (sin imágenes para evitar timeout)
    console.log('📦 Obteniendo lista de productos...');
    
    const { data: productIds, error: idsError } = await supabase
      .from('productos')
      .select('id, name')
      .not('image', 'is', null)
      .limit(100); // Procesar primeros 100

    if (idsError) throw idsError;

    if (!productIds || productIds.length === 0) {
      console.log('⚠️  No se encontraron productos con imágenes');
      return;
    }

    console.log(`✅ ${productIds.length} productos encontrados\n`);
    console.log('📊 Procesando productos uno por uno...\n');

    // 2. Procesar cada producto individualmente
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < productIds.length; i++) {
      const productInfo = productIds[i];
      
      try {
        console.log(`\n[${i + 1}/${productIds.length}] 📤 ${productInfo.name}`);
        
        // Obtener solo este producto con su imagen
        const { data: product, error: productError } = await supabase
          .from('productos')
          .select('id, name, image')
          .eq('id', productInfo.id)
          .single();

        if (productError || !product) {
          console.log(`  ❌ Error obteniendo producto`);
          totalErrors++;
          continue;
        }

        // Verificar si tiene imagen base64
        if (!product.image) {
          console.log(`  ⏭️  Sin imagen`);
          totalSkipped++;
          continue;
        }

        if (product.image.includes('cloudinary.com')) {
          console.log(`  ⏭️  Ya en Cloudinary`);
          totalSkipped++;
          continue;
        }

        if (!isBase64Image(product.image)) {
          console.log(`  ⏭️  No es base64 (${product.image.substring(0, 50)}...)`);
          totalSkipped++;
          continue;
        }

        console.log(`  🔍 Base64 detectado (${product.image.length} caracteres)`);

        // Subir a Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(
          product.image,
          `producto-${product.id}`
        );

        // Actualizar en Supabase
        const { error: updateError } = await supabase
          .from('productos')
          .update({ image: cloudinaryUrl })
          .eq('id', product.id);

        if (updateError) throw updateError;

        console.log(`  ✅ Migrado: ${cloudinaryUrl.substring(0, 60)}...`);
        totalMigrated++;

        // Pequeña pausa entre productos
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
        totalErrors++;
      }
    }

    // 3. Resumen
    console.log('\n\n═══════════════════════════════════════════════');
    console.log('🎉 MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`📊 Total procesados: ${productIds.length}`);
    console.log(`✅ Migrados: ${totalMigrated}`);
    console.log(`⏭️  Saltados: ${totalSkipped}`);
    console.log(`❌ Errores: ${totalErrors}\n`);

    if (totalMigrated > 0) {
      console.log('✅ Las imágenes ahora se sirven desde Cloudinary CDN');
      console.log('✅ Las URLs fueron actualizadas en Supabase');
      console.log('✅ Base de datos ahora tiene URLs cortas en vez de base64\n');
      
      const avgBase64Size = 100000;
      const spaceSaved = (totalMigrated * avgBase64Size) / (1024 * 1024);
      console.log(`💾 Espacio ahorrado en DB: ~${spaceSaved.toFixed(2)} MB\n`);
    }

    if (productIds.length === 100) {
      console.log('⚠️  NOTA: Solo se procesaron los primeros 100 productos.');
      console.log('⚠️  Ejecuta el script nuevamente para migrar más.\n');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR FATAL:', error.message);
    process.exit(1);
  }
}

// Ejecutar
migrateBase64Images()
  .then(() => {
    console.log('✅ Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
