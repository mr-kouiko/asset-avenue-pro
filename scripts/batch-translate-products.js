/**
 * Batch Translation Script
 * Translates all existing products using LibreTranslate (free) and stores results in product_translations table
 * 
 * Usage: node scripts/batch-translate-products.js [language]
 * Example: node scripts/batch-translate-products.js fr
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdgfpophpoqugtuvfxqx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function translateFree(text, targetLang) {
  if (!text || text.trim() === '') return text;

  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        q: text, 
        source: 'auto', 
        target: targetLang, 
        format: 'text' 
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Translation API error: ${res.status}`);
    }
    
    const data = await res.json();
    return data.translatedText || text;
  } catch (error) {
    console.warn('Translation failed:', error.message);
    return text;
  }
}

async function batchTranslateProducts(language = 'fr') {
  console.log(`🚀 Starting batch translation to ${language}...`);

  // Fetch all approved products
  const { data: products, error } = await supabase
    .from('content_submissions')
    .select('id, title, description, tags')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`📦 Found ${products.length} products to translate`);

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Check if translation already exists
      const { data: existing } = await supabase
        .from('product_translations')
        .select('id')
        .eq('product_id', product.id)
        .eq('language', language)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  Skipped: ${product.title} (already translated)`);
        skipped++;
        continue;
      }

      // Translate title and description
      console.log(`🔄 Translating: ${product.title}...`);
      const translatedTitle = await translateFree(product.title, language);
      const translatedDescription = product.description
        ? await translateFree(product.description, language)
        : '';

      // Store in database
      const { error: insertError } = await supabase
        .from('product_translations')
        .insert({
          product_id: product.id,
          language,
          title: translatedTitle,
          description: translatedDescription,
          tags: product.tags || [],
        });

      if (insertError) {
        console.error(`❌ Failed to store translation for ${product.title}:`, insertError);
        failed++;
      } else {
        console.log(`✅ Translated: ${product.title} → ${translatedTitle}`);
        translated++;
      }

      // Delay to avoid rate limiting (500ms between requests)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error processing ${product.title}:`, error.message);
      failed++;
    }
  }

  console.log('\n📊 Translation Summary:');
  console.log(`✅ Translated: ${translated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${products.length}`);
}

// Get target language from command line arguments (default: 'fr')
const targetLanguage = process.argv[2] || 'fr';

console.log(`🌍 Target language: ${targetLanguage}`);
batchTranslateProducts(targetLanguage).then(() => {
  console.log('✨ All done!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
