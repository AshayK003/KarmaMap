import { supabase } from '../lib/supabase';

const configured = import.meta.env.VITE_API_URL?.trim();
const DIRECT_API = 'http://localhost:3001';

function getBase(): string {
  if (configured && configured !== 'proxy') return configured;
  return '';
}

async function tryFetch(url: string, opts: RequestInit): Promise<Response> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const msg =
      typeof body.error === 'string'
        ? body.error
        : (body.error?.formErrors?.[0] ?? body.error?.fieldErrors ?? res.statusText);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return res;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  const opts: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const base = getBase();
  const urls = base ? [base + path] : [`${DIRECT_API}${path}`, path];

  const delays = [500, 1000, 2000];
  let lastErr: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    for (const url of urls) {
      try {
        const res = await tryFetch(url, opts);
        return res.json() as Promise<T>;
      } catch (e) {
        lastErr = e;
      }
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
