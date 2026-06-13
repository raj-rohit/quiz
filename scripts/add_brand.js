const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Helper to parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      parsed[key] = val;
      i++;
    }
  }
  return parsed;
}

// Helper to parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found.');
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
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
  return env;
}

// Helper to download image
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Failed with status code: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
};

// Helper to format description to JSON string for Postgres JSONB
function formatDescriptionSql(desc) {
  let jsonObj;
  if (typeof desc === 'object' && desc !== null) {
    jsonObj = desc;
  } else {
    jsonObj = { en: desc || '' };
  }
  return JSON.stringify(jsonObj).replace(/'/g, "''");
}

async function main() {
  const args = parseArgs();
  const env = loadEnv();

  const name = args.name;
  const imageInput = args.image;
  const desc = args.desc || '';
  const color = args.color || '#FFFFFF';
  const pack = args.pack || 'classics';
  const obfuscation = args.obfuscation || 'none';

  if (!name || !imageInput) {
    console.log(`
Usage:
  node scripts/add_brand.js --name "Brand Name" --image "local_path_or_url" --desc "Description" --color "#HEXCOLOR" --pack "pack_id" --obfuscation "none"

Arguments:
  --name         (Required) The name of the brand.
  --image        (Required) A local path to an image file (e.g. ./logo.png) OR a public URL (e.g. https://domain.com/logo.png).
  --desc         (Optional) A brief description of the brand.
  --color        (Optional) Hex color associated with the brand (default: #FFFFFF).
  --pack         (Optional) The pack ID to assign this brand to (default: classics).
  --obfuscation  (Optional) The obfuscation technique to use (default: none).
                 Examples: blur, pixelate, crop, rotate, grayscale, blackout, invert
    `);
    process.exit(1);
  }

  const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'] || 'https://mbvxulohggcyvuqceupr.supabase.co';
  const supabaseAnonKey = 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQ';
  const accessToken = env['SUPABASE_ACCESS_TOKEN'];

  if (!accessToken) {
    console.error('Error: SUPABASE_ACCESS_TOKEN is missing in the .env file.');
    process.exit(1);
  }

  let imageUrlValue = '';
  let fileBuffer;
  let fileExt = '.png';
  let contentType = 'image/png';

  const isUrl = /^https?:\/\//i.test(imageInput);

  if (isUrl) {
    console.log(`Downloading remote image from ${imageInput}...`);
    try {
      fileBuffer = await downloadImage(imageInput);
      
      try {
        const parsedUrl = new URL(imageInput);
        const parsedExt = path.extname(parsedUrl.pathname).toLowerCase();
        if (parsedExt && parsedExt.length <= 5) {
          fileExt = parsedExt;
        }
      } catch (e) {}
      
      contentType = fileExt === '.png' ? 'image/png' : fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' : 'image/png';
    } catch (err) {
      console.error('Failed to download image from URL:', err.message);
      process.exit(1);
    }
  } else {
    // Local file path
    const absoluteFilePath = path.resolve(imageInput);
    if (!fs.existsSync(absoluteFilePath)) {
      console.error(`Error: Local image file not found at ${absoluteFilePath}`);
      process.exit(1);
    }

    fileExt = path.extname(absoluteFilePath).toLowerCase();
    contentType = fileExt === '.png' ? 'image/png' : fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    console.log(`Reading local file: ${absoluteFilePath}`);
    fileBuffer = fs.readFileSync(absoluteFilePath);
  }

  // Upload to Supabase Storage
  const safeBrandName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${safeBrandName}_${Date.now()}${fileExt}`;

  console.log(`Uploading ${filename} to Supabase storage 'logos' bucket...`);
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('logos')
    .upload(filename, fileBuffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    console.error('Upload to storage failed:', uploadError);
    process.exit(1);
  }

  imageUrlValue = `logos/${filename}`;
  console.log(`Upload successful! Image saved as: ${imageUrlValue}`);

  // Create migration SQL file
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const migrationFilename = `${timestamp}_add_brand_${safeName}.sql`;
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFilename);

  const sqlContent = `-- Add new brand: ${name}
INSERT INTO public.quiz_brands (brand_name, image_url, description, brand_color, pack_id, obfuscation_type)
VALUES (
  '${name.replace(/'/g, "''")}',
  '${imageUrlValue.replace(/'/g, "''")}',
  '${formatDescriptionSql(desc)}'::jsonb,
  '${color}',
  '${pack}',
  '${obfuscation}'
);
`;

  console.log(`Creating database migration file: supabase/migrations/${migrationFilename}`);
  fs.writeFileSync(migrationPath, sqlContent, 'utf-8');

  // Push migration using Supabase CLI
  console.log('Pushing database migration to remote Supabase DB...');
  try {
    // Execute command with SUPABASE_ACCESS_TOKEN env var
    execSync('npx supabase db push --yes', {
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken
      },
      stdio: 'inherit'
    });
    console.log('\nSuccess! Brand added to the database and migration pushed successfully!');
  } catch (pushError) {
    console.error('\nError: Failed to push migration to the remote database using Supabase CLI.');
    console.error('You can try running the command manually:');
    console.error(`$env:SUPABASE_ACCESS_TOKEN="${accessToken}"; npx supabase db push`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
