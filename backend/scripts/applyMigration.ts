import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'kimtiezntzunhhwszcwt';
const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../supabase/migrations/10_corporate_dashboard.sql',
);

const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
const password = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!password) {
  console.log('SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(0);
}

const REGIONS = ['us-east-1', 'eu-west-1', 'ap-south-1', 'ap-southeast-1'];

interface TryResult {
  ok: boolean;
  label: string;
}

async function tryPooler(region: string): Promise<TryResult> {
  const pool = new pg.Pool({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password,
    max: 1,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false },
  });
  const label = `pooler/${region}`;
  try {
    const client = await pool.connect();
    await client.query(sql);
    client.release();
    console.log(`Migration applied via ${label}`);
    return { ok: true, label };
  } catch (err: any) {
    const m = err.message ?? '';
    if (!m.includes('password') && !m.includes('not found')) {
      console.log(`${label}: ${m.slice(0, 120)}`);
    }
    return { ok: false, label };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function tryDirect(attempt: number): Promise<TryResult> {
  const pool = new pg.Pool({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    max: 1,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false },
    ...(attempt === 2 ? { family: 6 } : {}),
  });
  const label = `direct/${attempt === 2 ? 'ipv6' : 'default'}`;
  try {
    const client = await pool.connect();
    await client.query(sql);
    client.release();
    console.log(`Migration applied via ${label}`);
    return { ok: true, label };
  } catch (err: any) {
    const m = err.message ?? '';
    if (!m.includes('password') && !m.includes('ENOTFOUND')) {
      console.log(`${label}: ${m.slice(0, 120)}`);
    }
    return { ok: false, label };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  if (!password) {
    console.log('SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(0);
  }

  console.log('Attempting to connect and apply migration...');
  const poolers = REGIONS.map((r) => tryPooler(r));
  const directs = [1, 2].map((a) => tryDirect(a));
  const results = await Promise.all([...poolers, ...directs]);
  const winner = results.find((r) => r.ok);

  if (winner) {
    console.log('Migration applied successfully via', winner.label);
    process.exit(0);
  }

  console.log('\nCould not connect. Tables must be created manually.');
  console.log(`1. Go to https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log('2. Paste & run:');
  console.log(`   type ${MIGRATION_PATH}`);
  process.exit(1);
}

main();
