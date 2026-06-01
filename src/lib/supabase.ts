import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mbvxulohggcyvuqceupr.supabase.co';
const supabaseAnonKey = 'sb_publishable_-budVI4KlGDsUnt5U_D78g_wRHxT0OQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
