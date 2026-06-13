const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const supabase = createClient(
  'https://mbvxulohggcyvuqceupr.supabase.co', 
  'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQFE5bVliH_0FZqFCrfqAIw1oA7cRRgk-'
);

async function upload() {
  const tmp = os.tmpdir();
  
  const files = [
    { name: 'albert_heijn.png', file: 'ah.png' },
    { name: 'jumbo.png', file: 'jumbo.png' },
    { name: 'hema.png', file: 'hema.png' }
  ];

  for(const f of files) {
    const buffer = fs.readFileSync(path.join(tmp, f.file));
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(f.name, buffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) console.error(`Error uploading ${f.name}:`, error);
    else console.log(`Successfully uploaded ${f.name}`);
  }
}

upload();
