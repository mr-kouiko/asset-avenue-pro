/**
 * Batch Translation Script — translates all approved products into
 * the 4 non-English languages (fr, es, de, pt) using LibreTranslate (free).
 *
 * Usage: node scripts/batch-translate-products.js [lang1 lang2 ...]
 * Default: all four languages
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdgfpophpoqugtuvfxqx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8';
const supabase = createClient(supabaseUrl, supabaseKey);

const ALL_LANGS = ['fr', 'es', 'de', 'pt'];

async function translateFree(text, targetLang) {
  if (!text || !text.trim()) return text;
  // Try LibreTranslate, fallback to MyMemory
  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'en', target: targetLang, format: 'text' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.translatedText) return data.translatedText;
    }
  } catch {}
  // MyMemory fallback
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data?.responseData?.translatedText || text;
    }
  } catch {}
  return text;
}

async function translateTags(tags, lang) {
  if (!Array.isArray(tags) || !tags.length) return [];
  const out = [];
  for (const t of tags) {
    out.push(await translateFree(t, lang));
    await new Promise(r => setTimeout(r, 200));
  }
  return out;
}

async function batchTranslate(language) {
  console.log(`\n🌍 Translating to ${language}...`);
  const { data: products, error } = await supabase
    .from('content_submissions')
    .select('id, title, description, tags')
    .eq('status', 'approved');
  if (error) { console.error(error); return; }

  let done = 0, skipped = 0, failed = 0;
  for (const p of products) {
    try {
      const { data: existing } = await supabase
        .from('product_translations')
        .select('id')
        .eq('product_id', p.id)
        .eq('language', language)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const title = await translateFree(p.title, language);
      const description = p.description ? await translateFree(p.description, language) : '';
      const tags = await translateTags(p.tags, language);

      const { error: insErr } = await supabase.from('product_translations').insert({
        product_id: p.id, language, title, description, tags,
      });
      if (insErr) { failed++; console.error('insert', insErr.message); }
      else { done++; console.log(`  ✅ [${language}] ${p.title} → ${title}`); }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      failed++;
      console.error('err', e.message);
    }
  }
  console.log(`📊 ${language}: ${done} translated, ${skipped} skipped, ${failed} failed`);
}

const langs = process.argv.slice(2).filter(l => ALL_LANGS.includes(l));
const targets = langs.length ? langs : ALL_LANGS;
console.log(`🎯 Target languages: ${targets.join(', ')}`);
(async () => {
  for (const l of targets) await batchTranslate(l);
  console.log('\n✨ All done');
  process.exit(0);
})();
