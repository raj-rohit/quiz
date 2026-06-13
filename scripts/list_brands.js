const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const url = env['EXPO_PUBLIC_SUPABASE_URL'] || 'https://mbvxulohggcyvuqceupr.supabase.co';
const anonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQFE5bVliH_0FZqFCrfqAIw1oA7cRRgk-';

console.log('Using URL:', url);
console.log('Using Anon Key (prefix):', anonKey.substring(0, 20) + '...');

async function listBrands() {
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase
    .from('quiz_brands')
    .select('*')
    .order('brand_name', { ascending: true });

  if (error) {
    console.error('Error fetching with .env key:', error);
    
    // Try fallback key from supabase.ts
    const fallbackKey = 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQ';
    console.log('Trying fallback key:', fallbackKey);
    const supabaseFallback = createClient(url, fallbackKey);
    const { data: fallbackData, error: fallbackError } = await supabaseFallback
      .from('quiz_brands')
      .select('*')
      .order('brand_name', { ascending: true });
      
    if (fallbackError) {
      console.error('Fallback key also failed:', fallbackError);
    } else {
      console.log('Success with fallback key!');
      console.log(JSON.stringify(fallbackData, null, 2));
    }
  } else {
    console.log('Success with .env key!');
    console.log(JSON.stringify(data, null, 2));
  }
}

listBrands();
