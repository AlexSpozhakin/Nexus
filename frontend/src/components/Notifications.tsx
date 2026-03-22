import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/store';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Загрузка уведомлений из localStorage при смене пользователя
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`notifications_${user.id}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    }
  }, [user?.id]);

  // Сохранение уведомлений в localStorage при изменении
  useEffect(() => {
    if (user?.id && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  // Инициализация звука
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleIQhVY/F+OWJP2/E/PPlk1Vjtf7+8qJiWab7/vKnZleg+/7yqWtXnPn+8qtvV5j3/vKudFeU9f7yrXZYkPP+8qt4WY3x/vKpeleK7/7yp3tXh+3+8qV9WITr/vKjf1mB6f7yoYFZfuf+8p+DWnvl/vKdhlt45P7ym4hcd+L+8pmKXXTg/vKXjF5x3v7ylY5fbtz+8pOQYGva/vKRkmFo2P7yj5RiZdb+8o2WY2LU/vKLmGRfzv7yeJl1Y9T+8pqYYFzS/vKYmmFZ0P7yllxiVs7+8pReY1PM/vKSYGRQyv7ykGJlTcj+8o5kZkrG/vKMZmdHxP7yimhpRML+8ohrakcA');
  }, []);

  // Закрытие панели при клике вне области
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

  // WebSocket подключение
  useEffect(() => {
    if (!user?.id) return;

    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    // ВАЖНО: Закрываем старое соединение при смене пользователя
    if (wsRef.current) {
      console.log('🔌 Closing old WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    const connect = () => {
      if (!isMounted) return;

      // Закрываем предыдущее соединение перед новым
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log(`🔌 Connecting WebSocket for user: ${user.id}`);
      const ws = new WebSocket(`ws://localhost:8080/ws?user_id=${user.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        const data = JSON.parse(event.data);
        console.log('📨 Received notification:', data.type, data.title);

        const notification: Notification = {
          id: Date.now().toString() + Math.random().toString(36),
          type: data.type,
          title: data.title,
          content: data.content,
          read: false,
          created_at: new Date().toISOString(),
        };

        setNotifications(prev => [notification, ...prev]);
        setToasts(prev => [notification, ...prev]);

        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }

        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== notification.id));
        }, 5000);

        // Если пользователя удалили из команды или команду удалили
        if (data.type === 'removed_from_team' && data.data?.action === 'team_removed') {
          // Проверяем, находится ли пользователь на странице команды
          if (window.location.pathname.startsWith('/team/')) {
            // Перенаправляем на dashboard через 2 секунды
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        }

        // Если команду удалили полностью
        if (data.type === 'team_deleted' && data.data?.action === 'team_deleted') {
          // Проверяем, находится ли пользователь на странице команды
          if (window.location.pathname.startsWith('/team/')) {
            // Перенаправляем на dashboard через 2 секунды
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        }

        // ВАЖНО: Обработка real-time обновлений задачи
        if (data.type === 'task_update') {
          const taskId = data.data?.task_id;
          const currentPath = window.location.pathname;
          const isOnTaskPage = currentPath.startsWith('/task/') || currentPath.startsWith('/tasks/');
          const isViewingThisTask = taskId && currentPath.includes(taskId);

          console.log('📋 Task update received:', {
            taskId,
            currentPath,
            isOnTaskPage,
            isViewingThisTask
          });

          // Если пользователь сейчас смотрит на эту задачу - обновляем данные
          if (isViewingThisTask) {
            console.log('✅ Dispatching data-update event for task:', taskId);
            window.dispatchEvent(new CustomEvent('data-update'));
          } else {
            console.log('⏭️ Skipping update - user not viewing this task. Current:', currentPath, 'Need:', taskId);
          }
        } else {
          // Для всех остальных типов уведомлений тоже отправляем data-update
          window.dispatchEvent(new CustomEvent('data-update'));
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id]);

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
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
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
          className="relative p-2 text-gray-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {/* Красный счётчик */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Панель уведомлений */}
        {showPanel && (
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  No notifications yet
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-700 hover:bg-gray-700/50 transition cursor-pointer ${
                      !notification.read ? 'bg-gray-700/30' : ''
                    }`}
                    onClick={() => {
                      setNotifications(prev =>
                        prev.map(n =>
                          n.id === notification.id ? { ...n, read: true } : n
                        )
                      );
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full ${getColor(notification.type)} flex items-center justify-center text-lg`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl w-80 animate-slide-in"
          >
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full ${getColor(toast.type)} flex items-center justify-center text-lg flex-shrink-0`}>
                {getIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{toast.title}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{toast.content}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-white"
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
