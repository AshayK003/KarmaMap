import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = 'https://karmamap.onrender.com';
const admin = createClient(URL, SR);
const stamp = Date.now().toString(36);
const email = `km-dbg-${stamp}@example.com`;
const PW = 'KmDbg42test!';
let uid = null;
let gigId = null;

async function withRetry(label, fn, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.log(`${label} attempt ${i} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
  throw new Error(`${label} failed after ${tries}: ${last.message}`);
}

try {
  const created = await withRetry('createUser', async () => {
    const r = await admin.auth.admin.createUser({
      email, password: PW, email_confirm: true, user_metadata: { name: 'Dbg NGO', role: 'ngo' },
    });
    if (r.error) throw new Error(r.error.message);
    return r;
  });
  uid = created.data.user.id;
  await withRetry('upsert', async () => {
    const r = await admin.from('profiles').upsert({ id: uid, name: 'Dbg NGO', role: 'ngo' });
    if (r.error) throw new Error(r.error.message);
  });
  const signed = await withRetry('signIn', async () => {
    const r = await createClient(URL, SR).auth.signInWithPassword({ email, password: PW });
    if (r.error) throw new Error(r.error.message);
    return r;
  });
  const tok = signed.data.session.access_token;
  const res = await withRetry('createGig', async () => {
    const r = await fetch(API + '/api/gigs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({
        title: 'Tree plantation drive',
        description: 'need 5 volunteers for a plantation drive near gomti riverfront. Trees would be provided. Refreshments also available',
        lat: 26.8601, lng: 81.00177, volunteers_needed: 5,
        gig_date: new Date(Date.now() + 864e5).toISOString(),
        required_skills: ['planting', 'gardening', 'logistics', 'distribution', 'cleanup'],
        duration: 3,
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(await r.json().catch(() => ({}))).slice(0, 150)}`);
    return r.json();
  });
  gigId = res.gig.id;
  console.log('PROD create -> 201 gig=' + gigId);
} finally {
  if (gigId) await admin.from('gigs').delete().eq('id', gigId);
  if (uid) {
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }
  console.log('cleanup done');
}
