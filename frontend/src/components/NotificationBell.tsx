import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeNotifications } from '../hooks/useRealtimeGigs';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useRealtimeNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:shadow-slate-900/50 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <svg className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No notifications yet</p>
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">Match alerts and updates will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                    !n.read_status ? 'bg-emerald-50/40 dark:bg-emerald-900/30' : ''
                  }`}
                  onClick={() => {
                    if (!n.read_status) markRead(n.id);
                  }}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_status ? 'bg-emerald-500' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {n.gig_id && (
                    <Link
                      to={`/gigs/${n.gig_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded-lg bg-slate-100 hover:bg-emerald-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-emerald-700 dark:bg-slate-700 dark:hover:bg-emerald-900/40 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
