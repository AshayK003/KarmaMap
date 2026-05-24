import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Gig, Notification } from '../types/database';

export function useRealtimeGigs(ngoId?: string) {
  const [gigs, setGigs] = useState<Gig[]>([]);

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
      console.error('Failed to fetch gigs:', err);
    }
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

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      console.error('Failed to fetch notifications:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
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
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await supabase.from('notifications').update({ read_status: true }).eq('user_id', userId).eq('read_status', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}

export function useRealtimeParticipations(gigId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!gigId) return;

    const fetchCount = async () => {
      try {
        const { count: c } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('gig_id', gigId)
          .in('status', ['joined', 'checked_in', 'completed']);
        setCount(c ?? 0);
      } catch (err) {
        console.error('Failed to fetch participation count:', err);
      }
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
