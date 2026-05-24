import { supabase } from '../lib/supabase';

// In dev, use Vite proxy (/api → localhost:3001) when VITE_API_URL is unset or "proxy"
const configured = import.meta.env.VITE_API_URL?.trim();
const API_BASE =
  import.meta.env.DEV &&
  (!configured || configured === 'proxy')
    ? ''
    : (configured ?? '');

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let session;
  try {
    const { data } = await supabase.auth.getSession();
    session = data;
  } catch {}

  const token = session?.session?.access_token;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. Start the backend: cd backend && npm run dev'
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof err.error === 'string'
        ? err.error
        : err.error?.formErrors?.[0] ??
          err.error?.fieldErrors ??
          res.statusText;
    const text =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (
      res.type === 'error' ||
      text === 'Failed to fetch' ||
      text.toLowerCase().includes('failed to fetch')
    ) {
      throw new Error(
        'Cannot reach the API server. Start the backend: cd backend && npm run dev'
      );
    }
    throw new Error(text);
  }

  return res.json() as Promise<T>;
}
