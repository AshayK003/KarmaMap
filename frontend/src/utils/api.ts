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
    throw Object.assign(
      new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)),
      // Carry the status so the retry loop can tell permanent from transient.
      { status: res.status },
    );
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
        // 4xx responses are permanent: retrying other URLs or attempts only
        // amplifies load (up to NxM identical failures). Fail immediately.
        if (typeof e === 'object' && e !== null && 'status' in e) {
          const status = (e as { status: number }).status;
          if (status >= 400 && status < 500) throw e;
        }
        lastErr = e;
      }
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
