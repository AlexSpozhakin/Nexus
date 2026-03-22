import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI, commentsAPI, teamsAPI } from '../services/api';
import { useStore } from '../store/store';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AssigneeSelector from '../components/AssigneeSelector';
import AssigneeAvatars from '../components/AssigneeAvatars';
import AttachmentSection from '../components/AttachmentSection';
import LabelManager from '../components/LabelManager';
import TimeTracker from '../components/TimeTracker';

import { formatDeadline, formatCompletedDate } from '../utils/dateFormatter';
import { useTranslation, type TranslationKey } from '../i18n/translations';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownPreview from '../components/MarkdownPreview';

// ─── Activity Log Panel (collapsible, right sidebar) ──────────────────────────
function ActivityLogPanel({ activity, lang, t }: {
  activity: any[];
  lang: string;
  t: (k: TranslationKey) => string;
}) {
  const [open, setOpen] = useState(false);

  // Translate raw DB values to localized labels
  const translateValue = (type: string, value: string): string => {
    if (!value) return value;
    if (type === 'status_changed') {
      const map: Record<string, TranslationKey> = {
        todo: 'todo', in_progress: 'inProgress', done: 'done', cancelled: 'cancelled',
      };
      return map[value] ? t(map[value]) : value;
    }
    if (type === 'priority_changed') {
      const map: Record<string, TranslationKey> = {
        low: 'low', medium: 'medium', high: 'high',
      };
      return map[value] ? t(map[value]) : value;
    }
    return value;
  };

  const icons: Record<string, string> = {
    status_changed: '🔄', priority_changed: '⚡', title_changed: '✏️',
    due_date_changed: '📅', comment_added: '💬', comment_deleted: '🗑️',
    assignee_added: '👤', assignee_removed: '👤', attachment_added: '📎',
  };

  const labelMap = (type: string): string => {
    const map: Record<string, TranslationKey> = {
      status_changed: 'activityStatusChanged',
      priority_changed: 'activityPriorityChanged',
      title_changed: 'activityTitleChanged',
      due_date_changed: 'activityDueDateChanged',
      comment_added: 'activityCommentAdded',
      comment_deleted: 'activityCommentDeleted',
      assignee_added: 'activityAssigneeAdded',
      assignee_removed: 'activityAssigneeRemoved',
      attachment_added: 'activityAttachmentAdded',
    };
    return map[type] ? t(map[type]) : type;
  };

  return (
    <div className="border-b border-gray-700/50 pb-3 mb-1">
      {/* Header — кликабелен для раскрытия */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-1 group"
      >
        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors flex-1 text-left">
          {t('activityLog')}
        </span>
        {activity.length > 0 && (
          <span className="text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {activity.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-all duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-xs">{t('activityNoActivity')}</p>
          </div>
        ) : (
          <div className="space-y-0 max-h-72 overflow-y-auto dark-scrollbar rounded-lg bg-gray-900/30 divide-y divide-gray-700/30">
            {activity.map((log: any, i: number) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-700/20 transition-colors"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-sm">
                  {log.user_name ? log.user_name.slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-200">{log.user_name || t('activitySomeone')}</span>
                    <span className="text-[11px] text-gray-500">
                      {icons[log.action_type] || '•'} {labelMap(log.action_type)}
                    </span>
                  </div>
                  {/* old → new values */}
                  {log.old_value && log.new_value && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium max-w-[90px] truncate">
                        {translateValue(log.action_type, log.old_value)}
                      </span>
                      <span className="text-gray-600 text-[10px]">→</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-medium max-w-[90px] truncate">
                        {translateValue(log.action_type, log.new_value)}
                      </span>
                    </div>
                  )}
                  {log.new_value && !log.old_value && log.action_type === 'comment_added' && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate italic">"{log.new_value}"</p>
                  )}
                </div>
                <span className="text-[9px] text-gray-600 flex-shrink-0 mt-0.5 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString(lang === 'ru' ? 'ru' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  role: 'owner' | 'assignee' | 'watcher';
  assigned_at: string;
  user_name?: string;
  user_email?: string;
}

interface Label {
  id: string;
  team_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id?: string;
  assignees?: TaskAssignee[];
  labels?: Label[];
  due_date?: string;
  completed_at?: string;
  created_at: string;
  parent_task_id?: string;
  subtasks?: Task[];
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  username: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: string;
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout, currentTeam } = useStore();
  const { t, lang } = useTranslation();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  // Блокируем скролл body когда модал открыт
  useEffect(() => {
    if (showSubtaskModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSubtaskModal]);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignees: [] as { user_id: string; role: 'owner' | 'assignee' | 'watcher' }[],
    due_date: ''
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [taskLabels, setTaskLabels] = useState<Label[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  // Inline editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [taskRes, commentsRes, subtasksRes] = await Promise.all([
        tasksAPI.getById(id!),
        commentsAPI.getByTask(id!),
        tasksAPI.getSubtasks(id!).catch(() => ({ data: [] })),
      ]);
      setTask(taskRes.data);
      setTaskLabels(taskRes.data?.labels || []);
      setComments(commentsRes.data || []);
      setSubtasks(subtasksRes.data || []);

      // Загружаем activity log
      tasksAPI.getActivity(id!).then(r => setActivity(r.data.activity || [])).catch(() => {});

      // Если это подзадача — загружаем родительскую задачу для breadcrumb
      if (taskRes.data?.parent_task_id) {
        try {
          const parentRes = await tasksAPI.getById(taskRes.data.parent_task_id);
          setParentTask(parentRes.data);
        } catch { /* не критично */ }
      } else {
        setParentTask(null);
      }

      // Загружаем членов команды для выбора исполнителя
      if (taskRes.data?.team_id) {
        try {
          const membersRes = await teamsAPI.getMembers(taskRes.data.team_id);
          console.log('📋 Team members response:', membersRes.data);
          setTeamMembers(membersRes.data || []);

          // Определяем роль текущего пользователя
          const currentMember = membersRes.data.find((m: TeamMember) => m.user_id === user?.id);
          if (currentMember) {
            setCurrentUserRole(currentMember.role);
          }
        } catch (err) {
          console.error('Failed to load team members:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load task:', err);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  // Автообновление при получении уведомлений (например, новые комментарии)
  useEffect(() => {
    if (!id) return;

    let isUpdating = false;

    const handleDataUpdate = () => {
      if (isUpdating) return;
      isUpdating = true;
      console.log('🔄 TaskDetail: Updating task data due to data-update event');
      loadData().finally(() => {
        setTimeout(() => {
          isUpdating = false;
        }, 500);
      });
    };

    window.addEventListener('data-update', handleDataUpdate);
    return () => window.removeEventListener('data-update', handleDataUpdate);
  }, [id, loadData]);

  // Таймер для обновления статуса "просрочено" (WebSocket отправит data-update моментально, это только резервный механизм)
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000); // Обновляем каждые 30 секунд как резервный механизм (основное обновление через WebSocket)

    return () => clearInterval(interval);
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await commentsAPI.create(id!, { content: newComment });
      setNewComment('');
      loadData();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await tasksAPI.update(id!, { status: newStatus });
      loadData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: string) => {
    try {
      await tasksAPI.update(subtaskId, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Failed to update subtask status:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 handleAddSubtask called');
    console.log('newSubtask:', newSubtask);
    console.log('task:', task);

    if (!newSubtask.title.trim() || !task) {
      console.log('❌ Validation failed: title or task missing');
      return;
    }

    try {
      // Конвертируем datetime-local в формат ISO для API
      let dueDate = undefined;
      if (newSubtask.due_date) {
        const date = new Date(newSubtask.due_date);
        dueDate = date.toISOString();
      }

      const requestData = {
        title: newSubtask.title,
        description: newSubtask.description,
        priority: newSubtask.priority,
        assignees: newSubtask.assignees,
        due_date: dueDate,
        parent_task_id: id,
      };

      console.log('📤 Sending request:', requestData);
      const response = await tasksAPI.create(task.team_id, requestData);
      console.log('✅ Response:', response);

      setNewSubtask({
        title: '',
        description: '',
        priority: 'medium',
        assignees: [],
        due_date: ''
      });
      setShowSubtaskModal(false);
      loadData();
    } catch (err) {
      console.error('❌ Failed to add subtask:', err);
      alert('Failed to create subtask: ' + (err as any)?.response?.data?.error || (err as any)?.message);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await tasksAPI.delete(id!);
      navigate(-1);
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task: ' + (err as any)?.response?.data?.error || (err as any)?.message);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!window.confirm('Are you sure you want to delete this subtask?')) {
      return;
    }

    try {
      await tasksAPI.delete(subtaskId);
      loadData();
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      alert('Failed to delete subtask: ' + (err as any)?.response?.data?.error || (err as any)?.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsAPI.delete(id!, commentId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingContent.trim()) return;
    try {
      await commentsAPI.update(id!, commentId, { content: editingContent });
      setEditingCommentId(null);
      setEditingContent('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update comment');
    }
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveTitle = async (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === task?.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await tasksAPI.update(id!, { title: trimmed });
      setTask(prev => prev ? { ...prev, title: trimmed } : prev);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update title');
    } finally {
      setEditingTitle(false);
    }
  };

  const handleSaveDesc = async () => {
    const trimmed = descDraft.trim();
    if (trimmed === (task?.description || '').trim()) {
      setEditingDesc(false);
      return;
    }
    try {
      await tasksAPI.update(id!, { description: trimmed });
      setTask(prev => prev ? { ...prev, description: trimmed } : prev);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update description');
    } finally {
      setEditingDesc(false);
    }
  };

  const handleSaveDueDate = async () => {
    try {
      const isoDate = dueDateDraft ? new Date(dueDateDraft).toISOString() : undefined;
      await tasksAPI.update(id!, { due_date: isoDate });
      setTask(prev => prev ? { ...prev, due_date: isoDate } : prev);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update due date');
    } finally {
      setEditingDueDate(false);
    }
  };

  // Может ли текущий пользователь удалить чужой комментарий
  const canDeleteComment = (commentAuthorId: string, commentAuthorRole?: string): boolean => {
    if (commentAuthorId === user?.id) return true; // свой всегда
    if (currentUserRole === 'owner') return true; // owner — всё
    if (currentUserRole === 'admin' && commentAuthorRole === 'member') return true; // admin удаляет member
    return false;
  };

  const getCommentAuthorRole = (authorId: string): string => {
    return teamMembers.find(m => m.user_id === authorId)?.role || 'member';
  };

  const canDelete = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border border-red-500/30';
      case 'high':   return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
      case 'low':    return 'text-green-400 bg-green-500/10 border border-green-500/30';
      default:       return 'text-gray-400 bg-gray-700/60 border border-gray-600/40';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high':   return 'bg-orange-400';
      case 'medium': return 'bg-amber-400';
      case 'low':    return 'bg-green-400';
      default:       return 'bg-gray-500';
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('loading')}</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('error')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        breadcrumbs={[
          ...(currentTeam ? [{ label: currentTeam.name, path: `/team/${currentTeam.id}` }] : []),
          ...(parentTask ? [{ label: parentTask.title, path: `/task/${parentTask.id}` }] : []),
          { label: task?.title || '…' },
        ]}
        actions={
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-all btn-modern hover-lift font-medium text-sm"
          >
            <span className="hidden sm:inline">{t('logout')}</span>
            <span className="sm:hidden">←</span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-8 page-enter">
        <div className="flex flex-wrap gap-6 items-start">
        {/* ── Левая колонка: подзадачи + комментарии ── */}
        <div className="flex-1 min-w-0" style={{ minWidth: 'min(100%, 480px)' }}>

        {/* Task Details */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          {/* Title row */}
          {editingTitle ? (
            <div key="title-edit" className="mb-3 animate-edit-in">
              <input
                autoFocus
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle(titleDraft);
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="w-full bg-gray-700/50 text-white text-2xl font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50 focus:border-indigo-500/50"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSaveTitle(titleDraft)}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium transition-all btn-modern hover-lift shadow-md"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="px-4 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg text-sm font-medium transition-all btn-modern hover-lift border border-gray-600/50"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div
              key="title-view"
              className="group flex items-center gap-2 mb-3 animate-edit-in"
            >
              <h1 className="text-2xl font-bold text-white">{task.title}</h1>
              <button
                onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
                className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-gray-700/50 flex-shrink-0"
                title="Edit title"
                type="button"
              >
                <svg
                  className="w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                </svg>
              </button>
            </div>
          )}
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`} />
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            <StatusBadge
              status={subtasks.length > 0
                ? subtasks.some(st => st.status === 'in_progress' || st.status === 'done')
                  ? 'in_progress'
                  : 'todo'
                : task.status as 'todo' | 'in_progress' | 'done'}
              onChange={(newStatus) => handleStatusChange(newStatus)}
              disabled={subtasks.length > 0}
              disabledTitle="Статус управляется подзадачами"
            />
            {canDelete && (
              <button
                onClick={handleDeleteTask}
                className="ml-auto px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                title="Delete task (Admin/Owner only)"
              >
                {t('deleteTask')}
              </button>
            )}
          </div>

          {editingDesc ? (
            <div key="desc-edit" className="mb-4 animate-edit-in">
              <MarkdownEditor
                value={descDraft}
                onChange={setDescDraft}
                placeholder={t('description')}
                minHeight="120px"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveDesc}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm transition-all btn-modern hover-lift shadow-md font-medium"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => setEditingDesc(false)}
                  className="px-4 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-sm transition-all btn-modern hover-lift border border-gray-600/50 font-medium"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div
              key="desc-view"
              className="group flex items-start gap-2 mb-4 animate-edit-in"
            >
              <div className="flex-1">
                <MarkdownPreview content={task.description || ''} fallback={t('noDescription')} />
              </div>
              <button
                onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
                className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-gray-700/50 flex-shrink-0 mt-0.5"
                title="Edit description"
                type="button"
              >
                <svg
                  className="w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                </svg>
              </button>
            </div>
          )}

          {/* Assignees Section */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="text-sm text-gray-500 mb-2">{t('assignees')}:</div>
              <AssigneeAvatars assignees={task.assignees} maxDisplay={3} teamSize={teamMembers.length} />
            </div>
          )}

          {/* Labels Section */}
          {task.team_id && (
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="text-sm text-gray-500 mb-2">Метки:</div>
              <LabelManager
                taskId={task.id}
                teamId={task.team_id}
                labels={taskLabels}
                onLabelsChange={setTaskLabels}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="text-gray-400">
              <span className="text-gray-500">{t('by')}:</span> {formatDate(task.created_at)}
            </div>
            {editingDueDate ? (
              <div key="due-edit" className="flex items-center gap-2 animate-edit-in">
                <input
                  autoFocus
                  type="datetime-local"
                  value={dueDateDraft}
                  onChange={(e) => setDueDateDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDueDate();
                    if (e.key === 'Escape') setEditingDueDate(false);
                  }}
                  className="bg-gray-700/50 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50 focus:border-indigo-500/50 text-sm"
                />
                <button
                  onClick={handleSaveDueDate}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all btn-modern hover-lift"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => setEditingDueDate(false)}
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-all btn-modern hover-lift border border-gray-600/50 font-medium"
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <div key="due-view" className="group flex items-center gap-1 animate-edit-in">
                {(() => {
                  if (task.status === 'done') {
                    // Для выполненной задачи — берём completed_at самой задачи или максимальный из подзадач
                    const taskCompleted = task.completed_at;
                    const subtaskCompleted = subtasks.length > 0
                      ? subtasks
                          .filter(s => s.completed_at)
                          .map(s => s.completed_at!)
                          .sort()
                          .at(-1)
                      : undefined;
                    const completedAt = taskCompleted || subtaskCompleted;
                    if (completedAt) {
                      // Если у основной задачи нет due_date — берём наибольший due_date среди подзадач
                      const effectiveDueDate = task.due_date || (subtasks.length > 0
                        ? subtasks
                            .filter(s => s.due_date)
                            .map(s => s.due_date!)
                            .sort()
                            .at(-1)
                        : undefined);
                      const badge = formatCompletedDate(completedAt, effectiveDueDate, lang);
                      return (
                        <span className={`date-badge ${badge.className}`}>
                          <span className="date-badge-icon">{badge.icon}</span>
                          {badge.text}
                        </span>
                      );
                    }
                  }
                  // Для активной задачи — показываем дедлайн (только если есть due_date)
                  if (task.due_date) {
                    const badge = formatDeadline(task.due_date, lang);
                    return (
                      <span className={`date-badge ${badge.className}`}>
                        <span className="date-badge-icon">{badge.icon}</span>
                        {badge.text}
                      </span>
                    );
                  }
                  return <span className="text-gray-500 text-xs">{t('dueDate') || 'Due date'}: —</span>;
                })()}
                <button
                  onClick={() => {
                    // Конвертируем ISO дату в формат datetime-local
                    if (task.due_date) {
                      const d = new Date(task.due_date);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setDueDateDraft(
                        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                      );
                    } else {
                      setDueDateDraft('');
                    }
                    setEditingDueDate(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-all text-gray-500 hover:text-gray-300 p-0.5 rounded"
                  title="Edit due date"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subtasks Section */}
        {!task.parent_task_id && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {t('subtasks')} ({subtasks.length})
                </h2>
                {subtasks.length > 0 && (() => {
                  const completedCount = subtasks.filter(st => st.status === 'done').length;
                  const progress = Math.round((completedCount / subtasks.length) * 100);
                  return (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300 min-w-[80px]">
                        {completedCount}/{subtasks.length} ({progress}%)
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setShowSubtaskModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium flex items-center gap-2 ml-4"
              >
                <span>+</span> {t('addSubtask')}
              </button>
            </div>

          {subtasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('noSubtasks')}</p>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {subtasks.map((subtask) => {
                const isDone = subtask.status === 'done';
                const isOverdue = subtask.due_date && new Date(subtask.due_date).getTime() < currentTime && !isDone;
                const isCompletedLate = isDone && subtask.completed_at && subtask.due_date &&
                                        new Date(subtask.completed_at).getTime() > new Date(subtask.due_date).getTime();

                let cardClass = '';
                if (isOverdue) {
                  cardClass = 'task-bg-red border';
                } else if (isCompletedLate) {
                  cardClass = 'task-bg-orange border';
                } else if (isDone) {
                  cardClass = 'task-bg-green border';
                } else if (subtask.status === 'in_progress') {
                  cardClass = 'task-bg-blue border';
                } else {
                  cardClass = 'task-bg-gray border';
                }

                return (
                  <div
                    key={subtask.id}
                    onClick={() => navigate(`/task/${subtask.id}`)}
                    className={`rounded-xl p-4 cursor-pointer card-hover stagger-item ${cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(subtask.priority)}`} />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-medium truncate">{subtask.title}</h3>
                          {subtask.description && (
                            <p className="text-gray-400 text-sm mt-1">{subtask.description}</p>
                          )}

                          {/* Modern date badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {subtask.due_date && !isDone && (() => {
                              const deadline = formatDeadline(subtask.due_date, lang);
                              return (
                                <span className={`date-badge ${deadline.className}`}>
                                  <span className="date-badge-icon">{deadline.icon}</span>
                                  {deadline.text}
                                </span>
                              );
                            })()}
                            {subtask.completed_at && isDone && (() => {
                              const completed = formatCompletedDate(subtask.completed_at, subtask.due_date, lang);
                              return (
                                <span className={`date-badge ${completed.className}`}>
                                  <span className="date-badge-icon">{completed.icon}</span>
                                  {completed.text}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Assignees */}
                          {subtask.assignees && subtask.assignees.length > 0 && (
                            <div className="mt-2">
                              <AssigneeAvatars assignees={subtask.assignees} maxDisplay={3} teamSize={teamMembers.length} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge
                          status={subtask.status as 'todo' | 'in_progress' | 'done'}
                          onChange={(newStatus) => handleSubtaskStatusChange(subtask.id, newStatus)}
                        />
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubtask(subtask.id);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                            title="Delete subtask (Admin/Owner only)"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {/* Subtask Modal — portal в body, центрирован по текущему viewport */}
        {showSubtaskModal && createPortal(
          <div
            className="animate-fade-in"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowSubtaskModal(false)}
          >
            <div
              className="glass-strong rounded-xl p-6 w-full border border-indigo-500/30 shadow-2xl animate-fade-in-scale"
              style={{ maxWidth: '28rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">{t('createSubtask')}</h2>
              <form onSubmit={handleAddSubtask} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">{t('title')} *</label>
                  <input
                    autoFocus
                    type="text"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                    placeholder="Enter subtask title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">{t('description')}</label>
                  <textarea
                    value={newSubtask.description}
                    onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                    className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none input-modern transition-all border border-gray-600/50"
                    rows={3}
                    placeholder="Enter subtask description"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">{t('priority')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'urgent', label: 'Urgent', dot: 'bg-red-500',    active: 'bg-red-500/15 border-red-500/50 text-red-300',       idle: 'text-gray-400 border-gray-600/50 hover:border-red-500/40 hover:text-red-400',    glow: 'rgba(239,68,68,0.45)' },
                      { value: 'high',   label: 'High',   dot: 'bg-orange-400', active: 'bg-orange-400/15 border-orange-400/50 text-orange-300', idle: 'text-gray-400 border-gray-600/50 hover:border-orange-400/40 hover:text-orange-400', glow: 'rgba(251,146,60,0.45)' },
                      { value: 'medium', label: 'Medium', dot: 'bg-amber-400',  active: 'bg-amber-400/15 border-amber-400/50 text-amber-300',   idle: 'text-gray-400 border-gray-600/50 hover:border-amber-400/40 hover:text-amber-400',  glow: 'rgba(251,191,36,0.45)' },
                      { value: 'low',    label: 'Low',    dot: 'bg-green-400',  active: 'bg-green-400/15 border-green-400/50 text-green-300',   idle: 'text-gray-400 border-gray-600/50 hover:border-green-400/40 hover:text-green-400',  glow: 'rgba(74,222,128,0.45)' },
                    ] as const).map(({ value, label, dot, active, idle, glow }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNewSubtask({ ...newSubtask, priority: value })}
                        className={`priority-btn flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border font-medium text-sm ${newSubtask.priority === value ? `selected ${active}` : `bg-gray-700/30 ${idle}`}`}
                        style={{ '--p-glow': glow } as React.CSSProperties}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">{t('assignees')}</label>
                  <AssigneeSelector
                    teamMembers={teamMembers}
                    selectedAssignees={newSubtask.assignees}
                    onChange={(assignees) => setNewSubtask({ ...newSubtask, assignees })}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">
                    {t('dueDate')}
                    {task.due_date && (
                      <span className="text-xs text-gray-400 ml-2">
                        (max: {new Date(task.due_date).toLocaleString()})
                      </span>
                    )}
                  </label>
                  <input
                    type="datetime-local"
                    value={newSubtask.due_date}
                    max={task.due_date ? (() => {
                      const date = new Date(task.due_date);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                    })() : undefined}
                    onChange={(e) => setNewSubtask({ ...newSubtask, due_date: e.target.value })}
                    className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                  />
                  {task.due_date && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ {t('dueDate')}: max {new Date(task.due_date).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubtaskModal(false);
                      setNewSubtask({ title: '', description: '', priority: 'medium', assignees: [], due_date: '' });
                    }}
                    className="px-6 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-all hover-lift border border-gray-600/50 font-medium"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                  >
                    {t('createSubtask')}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Comments Section */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {t('comments')} ({comments.length})
          </h2>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('writeComment')}
              className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none input-modern transition-all border border-gray-600/50"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium"
              >
                {t('addComment')}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-3 animate-fade-in">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-center py-4">{t('noComments')}</p>
            ) : (
              comments.map((comment) => {
                const isOwn = comment.user_id === user?.id;
                const authorRole = getCommentAuthorRole(comment.user_id);
                const canDel = canDeleteComment(comment.user_id, authorRole);
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="glass rounded-xl p-4 border border-gray-700/50 stagger-item overflow-hidden min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                          {comment.username?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <span className="text-white font-medium text-sm">{comment.username || 'Unknown'}</span>
                          {isOwn && (
                            <span className="ml-2 text-xs text-indigo-400 font-medium">({t('you')})</span>
                          )}
                        </div>
                        {comment.is_edited && (
                          <span className="text-xs text-gray-500 italic">{t('edited')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{formatDate(comment.created_at)}</span>
                        {/* Кнопка Edit — только автор */}
                        {isOwn && !isEditing && (
                          <button
                            onClick={() => handleStartEditComment(comment)}
                            className="px-2.5 py-1 bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 hover:text-white rounded-lg text-xs transition-all hover-lift border border-gray-600/30 font-medium"
                            title="Edit your comment"
                          >
                            {t('edit')}
                          </button>
                        )}
                        {/* Кнопка Delete — автор + owner + admin(только member) */}
                        {canDel && !isEditing && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="px-2.5 py-1 bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs transition-all btn-modern hover-lift shadow-sm hover:shadow-md font-medium"
                            title={isOwn ? 'Delete your comment' : 'Delete comment (moderation)'}
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content — либо текст, либо форма редактирования */}
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none input-modern transition-all border border-indigo-500/50"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={handleCancelEditComment}
                            className="px-4 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-sm transition-all hover-lift border border-gray-600/50 font-medium"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            onClick={() => handleSaveEditComment(comment.id)}
                            disabled={!editingContent.trim()}
                            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-all btn-modern hover-lift shadow-md font-medium"
                          >
                            {t('save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm min-w-0 overflow-hidden">
                        <MarkdownPreview content={comment.content} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        </div>{/* end left column */}

        {/* ── Правая колонка ── */}
        {task && user && (
          <div className="flex-shrink-0 w-full sm:w-80 lg:w-80 xl:w-96">
            <div className="bg-gray-800 rounded-xl p-5 space-y-4">

            {/* Activity Log — сворачиваемый блок в правой колонке */}
            <ActivityLogPanel activity={activity} lang={lang} t={t} />

            {/* Time Tracking */}
              <div className="pb-4 border-b border-gray-700">
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('timeTracking')}
                </div>
                <TimeTracker taskId={task.id} />
              </div>
              <AttachmentSection
                taskId={task.id}
                currentUserId={user.id}
              />
            </div>
          </div>
        )}

        </div>{/* end flex row */}
      </main>
    </div>
  );
}