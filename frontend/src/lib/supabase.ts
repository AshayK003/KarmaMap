import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigOk = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey !== 'your-anon-key',
);

if (!supabaseConfigOk) {
  console.error(
    '[KarmaMap] Missing Supabase config. Copy frontend/.env.example to frontend/.env, ' +
      'add your Project URL and publishable/anon key, then restart npm run dev.',
  );
}

const noop = () => ({ data: null, error: new Error('Supabase not configured') });
const noopChain = () => ({ data: null, error: new Error('Supabase not configured') });
const selectChain = () => ({
  eq: () => ({ single: noopChain, in: noop, not: noop, maybeSingle: noopChain }),
  in: noop,
  order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
});

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({
        auth: {
          getSession: noop,
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        rpc: noop,
        from: () => ({
          select: selectChain,
          insert: () => ({ select: () => ({ single: noopChain }) }),
          update: () => ({ eq: () => noop }),
        }),
        channel: () => ({ on: () => ({ subscribe: () => {}, unsubscribe: () => {} }) }),
        storage: {
          from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
        },
        removeChannel: () => {},
      } as unknown as ReturnType<typeof createClient>);
