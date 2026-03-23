import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/store';
import { useTranslation } from '../i18n/translations';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  task_assigned:      { icon: '📋', accent: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/25' },
  new_comment:        { icon: '💬', accent: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/25' },
  task_status_changed:{ icon: '✅', accent: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25' },
  new_team_member:    { icon: '👤', accent: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
  added_to_team:      { icon: '👥', accent: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/25' },
  removed_from_team:  { icon: '🚪', accent: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/25' },
  team_deleted:       { icon: '💥', accent: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/25' },
  user_left_team:     { icon: '👋', accent: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  task_overdue:       { icon: '⏰', accent: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/25' },
  task_deleted:       { icon: '🗑️', accent: 'text-gray-400',   bg: 'bg-gray-500/15 border-gray-500/25' },
  role_changed:       { icon: '🎖️', accent: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/25' },
  deadline_alert:     { icon: '⚠️', accent: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
};

const DEFAULT_CONFIG = { icon: '🔔', accent: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/25' };

export default function NotificationBell() {
  const { user } = useStore();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`notifications_${user.id}`);
      if (saved) setNotifications(JSON.parse(saved));
    }
  }, [user?.id]);

  // Listen for new notifications and toasts
  useEffect(() => {
    const handleAdded = (e: CustomEvent) => {
      setNotifications(prev => [e.detail, ...prev]);
    };
    const handleToast = (e: CustomEvent) => {
      setToasts(prev => [e.detail, ...prev]);
      setTimeout(() => {
        setToasts(prev => prev.filter(n => n.id !== e.detail.id));
      }, 5000);
    };
    window.addEventListener('notification-added', handleAdded as EventListener);
    window.addEventListener('show-toast', handleToast as EventListener);
    return () => {
      window.removeEventListener('notification-added', handleAdded as EventListener);
      window.removeEventListener('show-toast', handleToast as EventListener);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (user?.id) {
      if (notifications.length > 0) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
      } else {
        localStorage.removeItem(`notifications_${user.id}`);
      }
    }
  }, [notifications, user?.id]);

  // Close on outside click
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('dateJustNow');
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.floor(m / 60)}h`;
    return new Date(dateString).toLocaleDateString();
  };

  const getTranslatedTitle = (type: string) => {
    const map: Record<string, Parameters<typeof t>[0]> = {
      task_assigned:       'notifTaskAssigned',
      new_comment:         'notifNewComment',
      task_status_changed: 'notifStatusChanged',
      new_team_member:     'notifNewTeamMember',
      added_to_team:       'notifAddedToTeam',
      removed_from_team:   'notifRemovedFromTeam',
      team_deleted:        'notifTeamDeleted',
      user_left_team:      'notifUserLeftTeam',
      task_overdue:        'notifTaskOverdue',
      task_deleted:        'notifTaskDeleted',
      role_changed:        'notifRoleChanged',
    };
    return map[type] ? t(map[type]) : t('notifications');
  };

  const cfg = (type: string) => TYPE_CONFIG[type] ?? DEFAULT_CONFIG;

  // Calculate panel position from bell button
  const getPanelStyle = (): React.CSSProperties => {
    if (!bellRef.current) return { top: 64, right: 16 };
    const rect = bellRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    };
  };

  return (
    <>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setShowPanel(v => !v)}
        className="relative p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold px-0.5 shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel — portal */}
      {showPanel && createPortal(
        <div ref={panelRef} style={getPanelStyle()} className="w-[340px] sm:w-96">
          {/* Glass card */}
          <div
            className="rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(17, 24, 39, 0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
              animation: 'notif-panel-in 0.2s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <h3 className="text-white font-semibold text-sm">{t('notifications')}</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-xs px-2.5 py-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    >
                      {t('notifMarkAllRead')}
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs px-2.5 py-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      {t('notifClear')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              {notifications.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-center px-6"
                  style={{ animation: 'notif-item-in 0.2s ease' }}>
                  <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-2xl">
                    🔔
                  </div>
                  <p className="text-gray-400 text-sm">{t('notifNoNotifications')}</p>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((n, i) => {
                    const c = cfg(n.type);
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`mx-2 my-1 rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.01] ${
                          !n.read ? c.bg : 'bg-gray-800/40 border-gray-700/30 hover:border-gray-600/50'
                        }`}
                        style={{ animation: `notif-item-in 0.2s ease ${i * 30}ms both` }}
                      >
                        <div className="flex gap-3">
                          <div className="text-xl leading-none mt-0.5 flex-shrink-0">{c.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-semibold ${c.accent} truncate`}>
                                {getTranslatedTitle(n.type)}
                              </span>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                              )}
                              <span className="text-gray-600 text-xs ml-auto flex-shrink-0">
                                {formatTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                              {n.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes notif-panel-in {
              from { opacity: 0; transform: translateY(-8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes notif-item-in {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          `}</style>
        </div>,
        document.body
      )}

      {/* Toast notifications */}
      {createPortal(
        <div className="fixed top-16 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast, i) => {
            const c = cfg(toast.type);
            return (
              <div
                key={toast.id}
                className="pointer-events-auto w-80 rounded-2xl border border-gray-700/60 overflow-hidden"
                style={{
                  background: 'rgba(17, 24, 39, 0.97)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  animation: 'toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                {/* Accent top bar */}
                <div className={`h-0.5 w-full ${c.accent.replace('text-', 'bg-').replace('-400', '-500')}`} />
                <div className="p-4 flex gap-3">
                  <div className="text-xl flex-shrink-0 mt-0.5">{c.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${c.accent}`}>{getTranslatedTitle(toast.type)}</p>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{toast.content}</p>
                  </div>
                  <button
                    onClick={() => setToasts(prev => prev.filter(n => n.id !== toast.id))}
                    className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(100%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  );
}
