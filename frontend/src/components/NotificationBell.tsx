import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
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
        className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Notifications</span>
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
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Match alerts and updates will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !n.read_status ? 'bg-emerald-50/40' : ''
                  }`}
                  onClick={() => {
                    if (!n.read_status) markRead(n.id);
                  }}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_status ? 'bg-emerald-500' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {n.gig_id && (
                    <Link
                      to={`/gigs/${n.gig_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded-lg bg-slate-100 hover:bg-emerald-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-emerald-700 transition-colors"
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
