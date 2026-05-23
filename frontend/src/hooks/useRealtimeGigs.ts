import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Gig } from '../types/database';

export function useRealtimeGigs(ngoId?: string) {
  const [gigs, setGigs] = useState<Gig[]>([]);

  const fetchGigs = useCallback(async () => {
    let query = supabase.from('gigs').select('*, profiles:ngo_id(name)');

    if (ngoId) {
      query = query.eq('ngo_id', ngoId);
    } else {
      query = query.eq('status', 'open');
    }

    const { data } = await query.order('created_at', { ascending: false });
    setGigs((data as Gig[]) ?? []);
  }, [ngoId]);

  useEffect(() => {
    fetchGigs();

    const channel = supabase
      .channel('gigs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gigs' },
        () => fetchGigs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGigs]);

  return { gigs, refetch: fetchGigs };
}

export function useRealtimeParticipations(gigId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!gigId) return;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from('participations')
        .select('*', { count: 'exact', head: true })
        .eq('gig_id', gigId)
        .in('status', ['joined', 'checked_in', 'completed']);
      setCount(c ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`participations-${gigId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participations', filter: `gig_id=eq.${gigId}` },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gigId]);

  return count;
}
