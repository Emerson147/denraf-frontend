/**
 * 📊 Análisis de Uso de Supabase
 * 
 * Este script muestra cuánto espacio estás usando en Supabase
 * y compara el ahorro logrado al mover imágenes a Cloudinary.
 * 
 * EJECUTAR:
 * npm run analyze-storage
 */

import { createClient } from '@supabase/supabase-js';
import { environment } from '../src/environments/environment.ts';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

/**
 * Analizar uso de base de datos
 */
async function analyzeStorage() {
  console.log('\n📊 ANÁLISIS DE USO DE SUPABASE\n');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // 1. Contar productos
    const { count: productCount, error: countError } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`📦 Total de productos: ${productCount || 0}\n`);

    // 2. Analizar productos con imágenes
    const { data: products, error: productsError } = await supabase
      .from('productos')
      .select('id, name, image')
      .limit(100);

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      console.log('⚠️  No hay productos para analizar');
      return;
    }

    // 3. Clasificar imágenes
    let cloudinaryImages = 0;
    let base64Images = 0;
    let noImages = 0;
    let otherImages = 0;
    let totalBase64Size = 0;

    products.forEach(p => {
      if (!p.image) {
        noImages++;
      } else if (p.image.includes('cloudinary.com')) {
        cloudinaryImages++;
      } else if (p.image.startsWith('data:image/') || p.image.length > 1000) {
        base64Images++;
        totalBase64Size += p.image.length;
      } else {
        otherImages++;
      }
    });

    console.log('🖼️  ESTADO DE IMÁGENES:');
    console.log('───────────────────────────────────────────');
    console.log(`✅ En Cloudinary:     ${cloudinaryImages} productos`);
    console.log(`⚠️  Base64 (pesado):   ${base64Images} productos`);
    console.log(`📦 URLs externas:     ${otherImages} productos`);
    console.log(`❌ Sin imagen:        ${noImages} productos\n`);

    // 4. Calcular tamaños
    const avgProductSize = 2000; // ~2 KB por producto (datos sin imagen)
    const avgCloudinaryUrlSize = 150; // ~150 bytes por URL de Cloudinary
    const avgBase64Size = totalBase64Size / (base64Images || 1);

    const currentDataSize = 
      (productCount || 0) * avgProductSize + 
      cloudinaryImages * avgCloudinaryUrlSize +
      totalBase64Size;

    const optimizedDataSize = 
      (productCount || 0) * avgProductSize + 
      (cloudinaryImages + base64Images) * avgCloudinaryUrlSize;

    console.log('💾 TAMAÑO DE DATOS:');
    console.log('───────────────────────────────────────────');
    console.log(`Tamaño actual:        ${(currentDataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Tamaño optimizado:    ${(optimizedDataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Ahorro potencial:     ${((currentDataSize - optimizedDataSize) / 1024 / 1024).toFixed(2)} MB\n`);

    if (base64Images > 0) {
      console.log(`⚠️  Tienes ${base64Images} productos con imágenes base64 pesadas`);
      console.log(`⚠️  Tamaño promedio base64: ${(avgBase64Size / 1024).toFixed(2)} KB`);
      console.log(`⚠️  Ejecuta: npm run migrate-base64-images\n`);
    }

    // 5. Proyección de capacidad
    const supabaseFreeLimit = 500 * 1024 * 1024; // 500 MB
    const usagePercentage = (currentDataSize / supabaseFreeLimit) * 100;
    const maxProductsEstimate = Math.floor(
      supabaseFreeLimit / (avgProductSize + avgCloudinaryUrlSize)
    );

    console.log('📈 CAPACIDAD:');
    console.log('───────────────────────────────────────────');
    console.log(`Límite Supabase Free: 500 MB`);
    console.log(`Uso estimado:         ${usagePercentage.toFixed(2)}%`);
    console.log(`Productos máximos:    ~${maxProductsEstimate.toLocaleString()} productos`);
    console.log(`Tu capacidad actual:  ${productCount}/${maxProductsEstimate}\n`);

    // 6. Análisis de ventas (opcional)
    let salesDataSize = 0;
    try {
      const { count: salesCount } = await supabase
        .from('ventas')
        .select('*', { count: 'exact', head: true });

      const avgSaleSize = 3000; // ~3 KB por venta (con items)
      salesDataSize = (salesCount || 0) * avgSaleSize;

      console.log('💰 VENTAS:');
      console.log('───────────────────────────────────────────');
      console.log(`Total ventas:         ${salesCount || 0}`);
      console.log(`Tamaño estimado:      ${(salesDataSize / 1024 / 1024).toFixed(2)} MB\n`);

    } catch (error) {
      console.log('ℹ️  No se pudo obtener datos de ventas\n');
    }

    // 7. Total combinado (siempre se ejecuta)
    const totalSize = currentDataSize + salesDataSize;
    const totalUsage = (totalSize / supabaseFreeLimit) * 100;

    console.log('📊 RESUMEN TOTAL:');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total usado:          ${(totalSize / 1024 / 1024).toFixed(2)} MB / 500 MB`);
    console.log(`Uso total:            ${totalUsage.toFixed(2)}%`);
    console.log(`Espacio disponible:   ${((supabaseFreeLimit - totalSize) / 1024 / 1024).toFixed(2)} MB\n`);

    if (totalUsage < 50) {
      console.log('✅ Estado: EXCELENTE - Mucho espacio disponible');
    } else if (totalUsage < 80) {
      console.log('⚠️  Estado: BUENO - Monitorear crecimiento');
    } else {
      console.log('🔴 Estado: CRÍTICO - Considera Supabase Pro');
    }

    console.log('\n═══════════════════════════════════════════════\n');

    // 8. Recomendaciones
    console.log('💡 RECOMENDACIONES:\n');
    
    if (base64Images > 0) {
      console.log('1. ⚠️  Migra imágenes base64 a Cloudinary:');
      console.log('   npm run migrate-base64-images\n');
    }

    if (cloudinaryImages > 0) {
      console.log(`2. ✅ ${cloudinaryImages} productos ya usan Cloudinary (correcto)\n`);
    }

    if (totalUsage < 20) {
      console.log('3. 🚀 Puedes crecer tranquilamente hasta 3000-5000 productos\n');
    }

    console.log('4. 📊 Monitorea uso en:');
    console.log('   https://supabase.com/dashboard/project/[tu-proyecto]/settings/usage\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Ejecutar análisis
analyzeStorage()
  .then(() => {
    console.log('✅ Análisis completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  });
