const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mbvxulohggcyvuqceupr.supabase.co';
const supabaseAnonKey = 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQ';

// Minimal .env loader (keeps secrets out of source — see .env).
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m) env[m[1]] = (m[2] || '').replace(/^"(.*)"$/, '$1').trim();
    }
  }
  return env;
}

// A privileged key (SUPABASE_ACCESS_TOKEN in .env) to bypass RLS for Storage.
const serviceKey = process.env.SUPABASE_ACCESS_TOKEN || loadEnv()['SUPABASE_ACCESS_TOKEN'];
if (!serviceKey) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (set it in .env).');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceKey);

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36' } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
};

const brands = [
  { name: 'Albert Heijn', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Albert_Heijn_logo.svg/512px-Albert_Heijn_logo.svg.png' },
  { name: 'Jumbo', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Jumbo_supermarkten_logo.svg/512px-Jumbo_supermarkten_logo.svg.png' },
  { name: 'HEMA', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/HEMA_logo.svg/512px-HEMA_logo.svg.png' }
];

async function run() {
  for (const b of brands) {
    console.log(`Downloading ${b.name}...`);
    const buffer = await downloadImage(b.url);
    const filename = b.name.replace(/ /g, '_').toLowerCase() + '.png';
    
    console.log(`Uploading ${filename} to Supabase...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public_assets')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Upload Error:', uploadError);
      continue;
    }
    
    const { data: publicUrlData } = supabase.storage.from('public_assets').getPublicUrl(filename);
    const finalUrl = publicUrlData.publicUrl;
    
    console.log(`Updating Database for ${b.name} to ${finalUrl}...`);
    await supabase.from('quiz_brands').update({ image_url: finalUrl }).eq('brand_name', b.name);
  }
  console.log('Complete!');
}

run();
