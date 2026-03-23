import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
}

// Компонент для управления WebSocket и toast-уведомлениями (без UI колокольчика)
export default function NotificationManager() {
  const { user } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Инициализация звука
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleIQhVY/F+OWJP2/E/PPlk1Vjtf7+8qJiWab7/vKnZleg+/7yqWtXnPn+8qtvV5j3/vKudFeU9f7yrXZYkPP+8qt4WY3x/vKpeleK7/7yp3tXh+3+8qV9WITr/vKjf1mB6f7yoYFZfuf+8p+DWnvl/vKdhlt45P7ym4hcd+L+8pmKXXTg/vKXjF5x3v7ylY5fbtz+8pOQYGva/vKRkmFo2P7yj5RiZdb+8o2WY2LU/vKLmGRfzv7yeJl1Y9T+8pqYYFzS/vKYmmFZ0P7yllxiVs7+8pReY1PM/vKSYGRQyv7ykGJlTcj+8o5kZkrG/vKMZmdHxP7yimhpRML+8ohrakcA');
  }, []);

  // WebSocket подключение
  useEffect(() => {
    if (!user?.id) return;

    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    if (wsRef.current) {
      console.log('🔌 Closing old WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    const connect = () => {
      if (!isMounted) return;

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log(`🔌 Connecting WebSocket for user: ${user.id}`);
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const wsUrl = backendUrl.replace(/^https?/, backendUrl.startsWith('https') ? 'wss' : 'ws');
      const ws = new WebSocket(`${wsUrl}/ws?user_id=${user.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        const data = JSON.parse(event.data);
        console.log('📨 Received notification:', data.type, data.title);

        // Список служебных типов уведомлений, которые НЕ должны сохраняться
        const technicalNotificationTypes = ['data-update', 'task_update', 'team_update'];

        const notification: Notification = {
          id: Date.now().toString() + Math.random().toString(36),
          type: data.type,
          title: data.title,
          content: data.content,
          read: false,
          created_at: new Date().toISOString(),
        };

        // Сохраняем только информационные уведомления (не технические)
        if (!technicalNotificationTypes.includes(data.type)) {
          // Сохраняем уведомление в localStorage
          const saved = localStorage.getItem(`notifications_${user.id}`);
          const existing = saved ? JSON.parse(saved) : [];
          localStorage.setItem(`notifications_${user.id}`, JSON.stringify([notification, ...existing]));

          // Отправляем событие для обновления счетчика
          window.dispatchEvent(new CustomEvent('notification-added', { detail: notification }));

          // Показываем toast
          window.dispatchEvent(new CustomEvent('show-toast', { detail: notification }));

          // Воспроизводим звук только для информационных уведомлений
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }

        // Если пользователя удалили из команды или команду удалили
        if (data.type === 'removed_from_team' && data.data?.action === 'team_removed') {
          if (window.location.pathname.startsWith('/team/')) {
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        }

        if (data.type === 'team_deleted' && data.data?.action === 'team_deleted') {
          if (window.location.pathname.startsWith('/team/')) {
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

          if (isViewingThisTask) {
            console.log('✅ Dispatching data-update event for task:', taskId);
            window.dispatchEvent(new CustomEvent('data-update'));
          } else {
            console.log('⏭️ Skipping update - user not viewing this task. Current:', currentPath, 'Need:', taskId);
          }
        } else {
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

  return null; // Этот компонент не рендерит UI
}
