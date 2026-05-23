import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigOk = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey !== 'your-anon-key'
);

if (!supabaseConfigOk) {
  console.error(
    '[KarmaMap] Missing Supabase config. Copy frontend/.env.example to frontend/.env, ' +
      'add your Project URL and publishable/anon key, then restart npm run dev.'
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Create frontend/.env from .env.example and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
