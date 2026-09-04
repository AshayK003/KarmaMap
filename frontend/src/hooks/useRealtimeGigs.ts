import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Gig, Notification } from '../types/database';
import { logger } from '../utils/logger';

async function enrichGigProfile(gig: Gig): Promise<Gig> {
  if (gig.profiles?.name) return gig;
  try {
    const { data } = await supabase.from('profiles').select('name').eq('id', gig.ngo_id).single();
    if (data) {
      return { ...gig, profiles: { name: data.name } };
    }
  } catch {
    /* best-effort */
  }
  return gig;
}

const MAX_CACHE = 50;

function cacheProfile(cache: Map<string, string>, key: string, value: string) {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

export function useRealtimeGigs(ngoId?: string) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const profileCache = useRef<Map<string, string>>(new Map());
  // Unique per mount: a second live instance sharing the channel name makes
  // supabase throw on .on() after subscribe, unmounting the whole app.
  const channelName = useRef(`gigs-realtime-${Math.random().toString(36).slice(2)}`).current;

  const fetchGigs = useCallback(async () => {
    try {
      let query = supabase.from('gigs').select('*, profiles:ngo_id(name)');

      if (ngoId) {
        query = query.eq('ngo_id', ngoId);
      } else {
        query = query.eq('status', 'open');
      }

      const { data } = await query.order('created_at', { ascending: false });
      setGigs((data as Gig[]) ?? []);
    } catch (err) {
      logger.error('Failed to fetch gigs:', err);
    }
  }, [ngoId]);

  useEffect(() => {
    fetchGigs();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gigs' },
        async (payload) => {
          const newGig = payload.new as Gig;
          if (profileCache.current.has(newGig.ngo_id)) {
            newGig.profiles = { name: profileCache.current.get(newGig.ngo_id)! };
            setGigs((prev) => [newGig, ...prev]);
          } else {
            setGigs((prev) => [newGig, ...prev]);
            const enriched = await enrichGigProfile(newGig);
            if (enriched.profiles?.name) {
              cacheProfile(profileCache.current, enriched.ngo_id, enriched.profiles.name);
              setGigs((prev) => prev.map((g) => (g.id === enriched.id ? enriched : g)));
            }
          }
        },
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gigs' }, (payload) => {
        const updated = payload.new as Gig;
        setGigs((prev) =>
          prev.map((g) => {
            if (g.id === updated.id) {
              return {
                ...g,
                ...updated,
                location: typeof updated.location === 'object' ? updated.location : g.location,
                profiles: g.profiles ?? updated.profiles,
              };
            }
            return g;
          }),
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gigs' }, (payload) =>
        setGigs((prev) => prev.filter((g) => g.id !== payload.old.id)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGigs]);

  return { gigs, refetch: fetchGigs };
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Unique per mount: the navbar renders one bell on desktop and another in
  // the mobile drawer. Sharing the channel name makes supabase throw on
  // .on() after subscribe, unmounting the whole app (mobile blank screen).
  const channelName = useRef(`notifications-realtime-${Math.random().toString(36).slice(2)}`).current;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data as Notification[]) ?? []);
    } catch (err) {
      logger.error('Failed to fetch notifications:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)),
          ),
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, userId]);

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  const markRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read_status: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_status: true } : n)));
    } catch (err) {
      logger.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('user_id', userId)
        .eq('read_status', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    } catch (err) {
      logger.error('Failed to mark all notifications as read:', err);
    }
  };

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}

export function useRealtimeParticipations(gigId?: string) {
  const [count, setCount] = useState(0);
  // Unique per mount so two views of the same gig never share a channel.
  const channelName = useRef(
    `participations-${gigId ?? 'none'}-${Math.random().toString(36).slice(2)}`,
  ).current;

  useEffect(() => {
    if (!gigId) return;

    // Count active statuses only (pending/cancelled do not occupy a spot).
    const fetchCount = async () => {
      try {
        const { count: c } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('gig_id', gigId)
          .in('status', ['joined', 'checked_in', 'completed']);
        setCount(c ?? 0);
      } catch (err) {
        logger.error('Failed to fetch participation count:', err);
      }
    };

    fetchCount();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participations', filter: `gig_id=eq.${gigId}` },
        // Re-fetch authoritative counts instead of guessing +/- deltas locally;
        // blind increments drifted from reality when rows were inserted as
        // 'pending' or cancelled later.
        fetchCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gigId]);

  return count;
}
