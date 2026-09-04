import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = 'http://localhost:3001';
const admin = createClient(URL, SR);
const stamp = Date.now().toString(36);
const email = `km-trans-${stamp}@example.com`;
const PW = 'Km$TransLoop42';
let uid = null;
let gigId = null;

const api = async (method, path, token, body) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

try {
  const { data: u, error: uErr } = await admin.auth.admin.createUser({
    email, password: PW, email_confirm: true, user_metadata: { name: 'Trans NGO', role: 'ngo' },
  });
  if (uErr) throw new Error('createUser: ' + uErr.message);
  uid = u.user.id;
  await admin.from('profiles').upsert({ id: uid, name: 'Trans NGO', role: 'ngo' });
  const { data: s, error: sErr } = await createClient(URL, SR).auth.signInWithPassword({ email, password: PW });
  if (sErr) throw new Error('signIn: ' + sErr.message);
  const tok = s.session.access_token;

  const { status: cs, json: cj } = await api('POST', '/api/gigs', tok, {
    title: 'Transition test gig', description: 'Temporary transition verification gig.',
    lat: 28.6, lng: 77.2, volunteers_needed: 2,
    gig_date: new Date(Date.now() + 864e5).toISOString(), required_skills: [],
  });
  if (cs !== 201) throw new Error('create ' + cs + ' ' + JSON.stringify(cj));
  gigId = cj.gig.id;

  const t = async (to, want) => {
    const r = await api('PATCH', `/api/gigs/${gigId}/status`, tok, { status: to });
    const ok = r.status === want ? 'ok' : 'MISMATCH';
    console.log(`${ok} -> ${to}: ${r.status} ${JSON.stringify(r.json.gig?.status ?? r.json.error)}`);
    if (r.status !== want) throw new Error(`expected ${want} got ${r.status}`);
  };
  await t('in_progress', 200);
  await t('open', 409);
  await t('completed', 200);
  await t('open', 409);

  // DB trigger: direct illegal write as the NGO user must fail
  const anon = (await import('@supabase/supabase-js')).createClient(URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6aXZ6cG1sb216ZmljcmFpdXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njc0ODAsImV4cCI6MjEwNDA0MzQ4MH0.oIcV5G1ARkWXAdnp5cwU0xCgiVN5b9uGrDewBrqyi_c');
  await anon.auth.signInWithPassword({ email, password: PW });
  const { error: directErr } = await anon.from('gigs').update({ status: 'open' }).eq('id', gigId);
  console.log((directErr ? 'ok' : 'MISMATCH') + ' direct completed->open blocked: ' + (directErr?.message ?? 'NOT BLOCKED'));
  if (!directErr) throw new Error('trigger did not block illegal direct write');
  console.log('TRANSITIONS PASS');
} finally {
  if (gigId) await admin.from('gigs').delete().eq('id', gigId);
  if (uid) {
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }
  console.log('cleanup done');
}
