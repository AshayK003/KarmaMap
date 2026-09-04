// CI migration-chain check: applies every file in supabase/migrations in
// sorted order against ephemeral Postgres+PostGIS and verifies the key RPCs
// exist afterwards. Catches syntax errors, bad ordering, and missing DROPs
// (the exact failure modes migrations 02 and 16 hit on first-time apply).
// Realtime, Auth, and Storage are stubbed: this checks schema, not behavior.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

const PREAMBLE = `
CREATE SCHEMA IF NOT EXISTS extensions;
-- The postgis/postgis image pre-installs into public (postgis is
-- non-relocatable, so drop + recreate to match the Supabase layout).
DROP EXTENSION IF EXISTS postgis CASCADE;
CREATE EXTENSION postgis WITH SCHEMA extensions;
-- Supabase includes extensions in the default search_path; match that so
-- bare GEOGRAPHY references in table definitions resolve.
SET search_path TO public, extensions;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE IF NOT EXISTS storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
CREATE PUBLICATION supabase_realtime;
`;

const EXPECTED_FUNCTIONS = [
  'join_gig',
  'complete_participation',
  'award_karma',
  'get_ngo_analytics',
  'get_public_stats',
  'insert_gig',
  'nearby_gigs',
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(PREAMBLE);

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
console.log(`Applying ${files.length} migration files...`);
for (const file of files) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  try {
    await client.query(sql);
    console.log(`  ok ${file}`);
  } catch (err) {
    console.error(`  FAIL ${file}: ${err.message.split('\n')[0]}`);
    await client.end();
    process.exit(1);
  }
}

const { rows } = await client.query(
  `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY ($1)`,
  [EXPECTED_FUNCTIONS],
);
const found = new Set(rows.map((r) => r.proname));
const missing = EXPECTED_FUNCTIONS.filter((f) => !found.has(f));
await client.end();
if (missing.length > 0) {
  console.error(`Missing RPCs after migration chain: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`MIGRATION CHAIN OK (${files.length} files, ${found.size} RPCs present)`);
