import { supabaseAdmin } from '../services/supabase.js';

async function main() {
  const { data, error } = await supabaseAdmin.rpc('nearby_gigs', {
    lat: 28.6139,
    lng: 77.209,
    radius_meters: 100000,
  });

  if (error) {
    console.error('nearby_gigs error:', error.message);
    return;
  }

  const gigs = data as any[];
  console.log('Count:', gigs.length);
  for (const g of gigs) {
    console.log(`  ${g.title}: duration=${g.duration} (${typeof g.duration})`);
  }
}

main().catch(console.error);
