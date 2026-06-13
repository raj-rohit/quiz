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

  const jsonFilePath = args.file;

  if (!jsonFilePath) {
    console.log(`
Usage:
  node scripts/batch_add_brands.js --file "./brands.json"

Example JSON file structure (brands.json):
[
  {
    "name": "Coca-Cola",
    "image": "https://unavatar.io/twitter/CocaCola",
    "desc": {
      "en": "The iconic carbonated soft drink.",
      "nl": "De iconische koolzuurhoudende frisdrank."
    },
    "color": "#F40009",
    "pack": "food",
    "obfuscation": "blur"
  }
]
    `);
    process.exit(1);
  }

  const absoluteJsonPath = path.resolve(jsonFilePath);
  if (!fs.existsSync(absoluteJsonPath)) {
    console.error(`Error: JSON file not found at ${absoluteJsonPath}`);
    process.exit(1);
  }

  let brandsArray;
  try {
    const fileContent = fs.readFileSync(absoluteJsonPath, 'utf-8');
    brandsArray = JSON.parse(fileContent);
  } catch (err) {
    console.error('Error parsing JSON file:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(brandsArray) || brandsArray.length === 0) {
    console.error('Error: JSON content must be a non-empty array of brand objects.');
    process.exit(1);
  }

  const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'] || 'https://mbvxulohggcyvuqceupr.supabase.co';
  const supabaseAnonKey = 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQ';
  const accessToken = env['SUPABASE_ACCESS_TOKEN'];

  if (!accessToken) {
    console.error('Error: SUPABASE_ACCESS_TOKEN is missing in the .env file.');
    process.exit(1);
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const sqlStatements = [];
  const baseJsonDir = path.dirname(absoluteJsonPath);

  console.log(`Processing ${brandsArray.length} brands...`);

  for (let i = 0; i < brandsArray.length; i++) {
    const b = brandsArray[i];
    const name = b.name;
    const imageInput = b.image;
    const desc = b.desc || '';
    const color = b.color || '#FFFFFF';
    const pack = b.pack || 'classics';
    const obfuscation = b.obfuscation || 'none';

    if (!name || !imageInput) {
      console.warn(`Warning: Skipping item at index ${i} because 'name' or 'image' is missing.`);
      continue;
    }

    let imageUrlValue = '';
    let fileBuffer;
    let fileExt = '.png';
    let contentType = 'image/png';
    const isUrl = /^https?:\/\//i.test(imageInput);

    if (isUrl) {
      console.log(`[${name}] Downloading remote image from ${imageInput}...`);
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
        console.error(`Error: Failed to download image from URL for brand "${name}":`, err.message);
        process.exit(1);
      }
    } else {
      // Local file path (relative to the JSON file)
      const localFilePath = path.isAbsolute(imageInput) ? imageInput : path.join(baseJsonDir, imageInput);
      if (!fs.existsSync(localFilePath)) {
        console.error(`Error: Local image file for brand "${name}" not found at ${localFilePath}`);
        process.exit(1);
      }

      fileExt = path.extname(localFilePath).toLowerCase();
      contentType = fileExt === '.png' ? 'image/png' : fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
      console.log(`[${name}] Reading local file: ${localFilePath}`);
      fileBuffer = fs.readFileSync(localFilePath);
    }

    const safeBrandName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${safeBrandName}_${Date.now()}_${i}${fileExt}`;

    console.log(`[${name}] Uploading image ${filename} to Supabase storage 'logos' bucket...`);
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('logos')
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`Error: Upload to storage failed for brand "${name}":`, uploadError);
      process.exit(1);
    }

    imageUrlValue = `logos/${filename}`;
    console.log(`[${name}] Uploaded successfully as ${imageUrlValue}`);

    // Build the SQL statement
    const statement = `INSERT INTO public.quiz_brands (brand_name, image_url, description, brand_color, pack_id, obfuscation_type)
VALUES (
  '${name.replace(/'/g, "''")}',
  '${imageUrlValue.replace(/'/g, "''")}',
  '${formatDescriptionSql(desc)}'::jsonb,
  '${color}',
  '${pack}',
  '${obfuscation}'
);`;
    sqlStatements.push(statement);
  }

  if (sqlStatements.length === 0) {
    console.error('No valid brands were processed.');
    process.exit(1);
  }

  // Create consolidated migration SQL file
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const migrationFilename = `${timestamp}_batch_add_brands.sql`;
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFilename);

  const sqlContent = `-- Batch Add ${sqlStatements.length} Brands
${sqlStatements.join('\n\n')}
`;

  console.log(`Creating database migration file: supabase/migrations/${migrationFilename}`);
  fs.writeFileSync(migrationPath, sqlContent, 'utf-8');

  // Push migration using Supabase CLI
  console.log('Pushing consolidated database migration to remote Supabase DB...');
  try {
    execSync('npx supabase db push --yes', {
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken
      },
      stdio: 'inherit'
    });
    console.log(`\nSuccess! Added ${sqlStatements.length} brands to the database and migration pushed successfully!`);
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
