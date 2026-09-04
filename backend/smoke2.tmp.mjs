import dotenv from 'dotenv';
dotenv.config();
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = 'http://localhost:3001';
const STATE = 'C:/Users/Ashay/_temp/km-loop-state.json';
const PW = 'Km$SmokeLoop42';
if (!URL || !SR) throw new Error('Missing SUPABASE_URL / SERVICE_ROLE_KEY');

const admin = createClient(URL, SR);
const phase = process.argv[2] || 'setup';
const fail = (m) => { throw new Error(m); };

const api = async (method, path, token, body) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const findUser = async (email) => {
  const { data } = await admin.auth.admin.listUsers();
  return (data?.users || []).find((u) => u.email === email) ?? null;
};
const signIn = async (email) => {
  const { data, error } = await createClient(URL, SR).auth.signInWithPassword({ email, password: PW });
  if (error) fail('signIn ' + email + ': ' + error.message);
  return data.session.access_token;
};

if (phase === 'setup') {
  const stamp = Date.now().toString(36);
  const ngoEmail = `km-loop-ngo-${stamp}@example.com`;
  const volEmail = `km-loop-vol-${stamp}@example.com`;
  const st = { ngoEmail, volEmail, ngoUid: null, volUid: null, gigId: null, partId: null };
  for (const [email, role] of [[ngoEmail, 'ngo'], [volEmail, 'volunteer']]) {
    const old = await findUser(email);
    if (old) { await admin.from('profiles').delete().eq('id', old.id); await admin.auth.admin.deleteUser(old.id); }
    const { data, error } = await admin.auth.admin.createUser({
      email, password: PW, email_confirm: true, user_metadata: { name: 'Loop Test', role },
    });
    if (error) fail('createUser ' + email + ': ' + error.message);
    await admin.from('profiles').upsert({ id: data.user.id, name: 'Loop Test', role });
    if (role === 'ngo') st.ngoUid = data.user.id; else st.volUid = data.user.id;
  }
  const ngoTok = await signIn(ngoEmail);
  const volTok = await signIn(volEmail);
  const { status: cs, json: cj } = await api('POST', '/api/gigs', ngoTok, {
    title: 'Loop Verification Drive', description: 'End-to-end live loop test gig. Deleted immediately after.',
    lat: 28.6139, lng: 77.209, volunteers_needed: 3,
    gig_date: new Date(Date.now() + 864e5).toISOString(), required_skills: ['cleaning'],
  });
  if (cs !== 201) fail('createGig ' + cs + ' ' + JSON.stringify(cj));
  st.gigId = cj.gig.id;
  const { status: js, json: jj } = await api('POST', `/api/participations/join/${st.gigId}`, volTok);
  if (![200, 201].includes(js)) fail('join ' + js + ' ' + JSON.stringify(jj));
  st.partId = jj.participation?.id ?? jj.id;
  fs.writeFileSync(STATE, JSON.stringify(st));
  console.log('SETUP OK gig=' + st.gigId + ' part=' + st.partId);
} else if (phase === 'finish') {
  const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const volTok = await signIn(st.volEmail);
  const { status: ps, json: pj } = await api('PATCH', `/api/participations/${st.partId}/complete`, volTok, { hours: 2 });
  if (ps !== 200) fail('complete ' + ps + ' ' + JSON.stringify(pj));
  if (pj.karma_earned !== 20) fail('karma mismatch ' + JSON.stringify(pj));
  const { data: prof } = await admin.from('profiles').select('karma_points').eq('id', st.volUid).single();
  await new Promise((r) => setTimeout(r, 6000));
  const { data: notifs } = await admin.from('notifications').select('id').eq('user_id', st.volUid);
  console.log(`LOOP PASS karma_earned=20 profile_karma=${prof?.karma_points} notifications=${notifs?.length ?? 0}`);
  await admin.from('notifications').delete().eq('user_id', st.volUid);
  await admin.from('participations').delete().eq('id', st.partId);
  await admin.from('gigs').delete().eq('id', st.gigId);
  for (const uid of [st.ngoUid, st.volUid]) {
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }
  const { data: residue } = await admin.from('profiles').select('id').in('id', [st.ngoUid, st.volUid]);
  fs.unlinkSync(STATE);
  console.log(`CLEANUP residue_profiles=${residue?.length ?? 0}`);
} else {
  fail('unknown phase');
}
