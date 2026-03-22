import { useEffect, useState, useRef } from 'react';
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

export default function NotificationBell() {
  const { user } = useStore();
  const isLight = useStore(s => s.settings.theme === 'light');
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Загрузка уведомлений из localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`notifications_${user.id}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    }
  }, [user?.id]);

  // Слушаем событие добавления нового уведомления
  useEffect(() => {
    const handleNotificationAdded = (event: CustomEvent) => {
      setNotifications(prev => [event.detail, ...prev]);
    };

    const handleShowToast = (event: CustomEvent) => {
      setToasts(prev => [event.detail, ...prev]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== event.detail.id));
      }, 5000);
    };

    window.addEventListener('notification-added', handleNotificationAdded as EventListener);
    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('notification-added', handleNotificationAdded as EventListener);
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, []);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    if (user?.id && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  // Закрытие панели при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    if (user?.id) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return '📋';
      case 'new_comment': return '💬';
      case 'task_status_changed': return '✅';
      case 'new_team_member': return '👤';
      case 'added_to_team': return '👥';
      case 'removed_from_team': return '🚪';
      case 'team_deleted': return '💥';
      case 'user_left_team': return '👋';
      case 'task_overdue': return '⚠️';
      case 'task_deleted': return '🗑️';
      case 'role_changed': return '🎖️';
      default: return '🔔';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'task_assigned': return 'bg-blue-500';
      case 'new_comment': return 'bg-green-500';
      case 'task_status_changed': return 'bg-purple-500';
      case 'new_team_member': return 'bg-yellow-500';
      case 'added_to_team': return 'bg-orange-500';
      case 'removed_from_team': return 'bg-red-600';
      case 'team_deleted': return 'bg-red-700';
      case 'user_left_team': return 'bg-orange-400';
      case 'task_overdue': return 'bg-red-500';
      case 'task_deleted': return 'bg-gray-600';
      case 'role_changed': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getTranslatedTitle = (type: string): string => {
    const map: Record<string, Parameters<typeof t>[0]> = {
      task_assigned: 'notifTaskAssigned',
      new_comment: 'notifNewComment',
      task_status_changed: 'notifStatusChanged',
      new_team_member: 'notifNewTeamMember',
      added_to_team: 'notifAddedToTeam',
      removed_from_team: 'notifRemovedFromTeam',
      team_deleted: 'notifTeamDeleted',
      user_left_team: 'notifUserLeftTeam',
      task_overdue: 'notifTaskOverdue',
      task_deleted: 'notifTaskDeleted',
      role_changed: 'notifRoleChanged',
    };
    return map[type] ? t(map[type]) : t('notifications');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t('dateJustNow');
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Колокольчик */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 text-gray-400 hover:text-white transition-all hover-scale"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {/* Красный счётчик */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Панель уведомлений */}
        {showPanel && (
          <div className="absolute right-0 mt-2 w-80 glass-strong rounded-xl shadow-2xl border border-indigo-500/30 z-50 overflow-hidden animate-fade-in-scale" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'border-gray-200' : 'border-gray-700/50'}`}>
              <h3 className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>{t('notifications')}</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-all hover-lift"
                    >
                      {t('notifMarkAllRead')}
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-all hover-lift"
                    >
                      {t('notifClear')}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className="overflow-y-auto dark-scrollbar"
              style={{ maxHeight: 'calc(100vh - 160px)', overscrollBehavior: 'contain' }}
            >
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 animate-fade-in">
                  <div className="text-4xl mb-2">🔔</div>
                  {t('notifNoNotifications')}
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b transition-all cursor-pointer animate-fade-in ${
                    isLight ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-700/50 hover:bg-gray-700/50'
                  } ${!notification.read ? 'bg-indigo-500/10' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => {
                      setNotifications(prev =>
                        prev.map(n =>
                          n.id === notification.id ? { ...n, read: true } : n
                        )
                      );
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full ${getColor(notification.type)} flex items-center justify-center text-lg shadow-md hover-scale transition-all`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
                            {getTranslatedTitle(notification.type)}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                          {notification.content}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast уведомления */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-3" style={{ maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="glass-strong border border-indigo-500/30 rounded-xl p-4 shadow-2xl w-80 animate-slide-in-right hover-lift"
          >
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full ${getColor(toast.type)} flex items-center justify-center text-lg flex-shrink-0 shadow-md`}>
                {getIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${isLight ? 'text-gray-800' : 'text-white'}`}>{getTranslatedTitle(toast.type)}</p>
                <p className={`text-xs mt-1 line-clamp-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{toast.content}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-white transition-all hover-scale text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CSS для анимации */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
