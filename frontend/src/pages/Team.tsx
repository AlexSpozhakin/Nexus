import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsAPI, tasksAPI, notesAPI, labelsAPI } from '../services/api';
import { useStore } from '../store/store';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import AssigneeSelector from '../components/AssigneeSelector';
import AssigneeAvatars from '../components/AssigneeAvatars';
import RoleBadge from '../components/RoleBadge';
import AttachmentSection from '../components/AttachmentSection';
import TeamAnalytics from '../components/TeamAnalytics';
import LabelBadge from '../components/LabelBadge';
import OnlineIndicator from '../components/OnlineIndicator';
import { formatDeadline, formatCompletedDate } from '../utils/dateFormatter';
import { useTranslation } from '../i18n/translations';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownPreview from '../components/MarkdownPreview';
import MilestoneCard from '../components/MilestoneCard';

interface Member {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  username: string;
  email: string;
}

export default function Team() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, currentTeam, setCurrentTeam, tasks, setTasks, notes, setNotes } = useStore();
  const { t, lang } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'members' | 'documents' | 'analytics'>('tasks');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [teamLabels, setTeamLabels] = useState<any[]>([]);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [editingLabel, setEditingLabel] = useState<any | null>(null);
  const [labelForm, setLabelForm] = useState({ name: '', color: '#6366f1' });
  const [labelLoading, setLabelLoading] = useState(false);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskAssignees, setTaskAssignees] = useState<{ user_id: string; role: 'owner' | 'assignee' | 'watcher' }[]>([]);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskLabelIds, setTaskLabelIds] = useState<string[]>([]);
  
  // View mode (list / kanban)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Header team menu (3-dot dropdown)
  const [showTeamMenu, setShowTeamMenu] = useState(false);

  // Note form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteShared, setNoteShared] = useState(true);

  // Note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteShared, setEditingNoteShared] = useState(true);

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const loadTeamData = async () => {
    try {
      const [teamRes, tasksRes, notesRes, membersRes, labelsRes] = await Promise.all([
        teamsAPI.getById(id!),
        tasksAPI.getByTeam(id!),
        notesAPI.getByTeam(id!),
        teamsAPI.getMembers(id!),
        labelsAPI.getByTeam(id!).catch(() => ({ data: [] })),
      ]);
      setTeamLabels(labelsRes.data || []);
      setCurrentTeam(teamRes.data);
      setNotes(notesRes.data || []);
      setMembers(membersRes.data || []);

      console.log(`🔍 Loading subtasks for ${tasksRes.data?.length || 0} tasks...`);

      // Загружаем подзадачи для каждой задачи
      const tasksWithSubtasks = await Promise.all(
        (tasksRes.data || []).map(async (task: any) => {
          try {
            console.log(`🔄 Fetching subtasks for task ID: ${task.id}, Title: "${task.title}"`);
            const subtasksRes = await tasksAPI.getSubtasks(task.id);
            console.log(`📊 Task "${task.title}" (ID: ${task.id}) has ${subtasksRes.data?.length || 0} subtasks:`, subtasksRes.data);
            return { ...task, subtasks: subtasksRes.data || [] };
          } catch (error) {
            console.error(`❌ Failed to load subtasks for task "${task.title}" (ID: ${task.id}):`, error);
            return { ...task, subtasks: [] };
          }
        })
      );
      console.log('✅ All tasks with subtasks loaded:', tasksWithSubtasks);
      setTasks(tasksWithSubtasks);

      // Определяем роль текущего пользователя
      const currentMember = membersRes.data.find((m: Member) => m.user_id === user?.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка данных команды
  useEffect(() => {
    if (id) loadTeamData();
  }, [id]);

  // Автообновление при получении уведомлений
  useEffect(() => {
    let isUpdating = false;

    const handleDataUpdate = () => {
      if (isUpdating || !id) return;
      isUpdating = true;
      loadTeamData().finally(() => {
        setTimeout(() => {
          isUpdating = false;
        }, 1000);
      });
    };

    window.addEventListener('data-update', handleDataUpdate);
    return () => window.removeEventListener('data-update', handleDataUpdate);
  }, [id]);

  // Таймер для обновления статуса "просрочено" каждую минуту
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Обновляем каждую минуту

    return () => clearInterval(interval);
  }, []);

  // Загрузка и периодическое обновление онлайн-статусов участников
  useEffect(() => {
    if (!id || activeTab !== 'members') return;

    const fetchOnlineStatus = () => {
      teamsAPI.getOnlineStatus(id).then(r => {
        setOnlineUserIds(r.data.online_user_ids ?? []);
      }).catch(() => {});
    };

    fetchOnlineStatus();
    const interval = setInterval(fetchOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, [id, activeTab]);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.username || 'Unknown';
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Конвертируем локальное время в ISO 8601 с московской таймзоной
      let formattedDueDate: string | undefined = undefined;
      if (taskDueDate) {
        // Берём введённое время и добавляем московское смещение +03:00
        formattedDueDate = taskDueDate + ':00+03:00';
      }

      const res = await tasksAPI.create(id!, {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        assignees: taskAssignees,
        due_date: formattedDueDate,
      });
      // Назначаем выбранные метки
      if (taskLabelIds.length > 0 && res.data?.id) {
        await Promise.all(taskLabelIds.map(labelId => labelsAPI.addToTask(res.data.id, labelId)));
      }
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('medium');
      setTaskAssignees([]);
      setTaskDueDate('');
      setTaskLabelIds([]);
      setShowTaskForm(false);
      loadTeamData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await notesAPI.create(id!, {
        title: noteTitle,
        content: noteContent,
        is_shared: noteShared,
      });
      setNoteTitle('');
      setNoteContent('');
      setNoteShared(true);
      setShowNoteForm(false);
      loadTeamData();
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamsAPI.addMember(id!, { email: memberEmail, role: memberRole });
      setMemberEmail('');
      setMemberRole('member');
      setShowMemberForm(false);
      loadTeamData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      await teamsAPI.removeMember(id!, userId);
      loadTeamData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    try {
      await teamsAPI.updateMemberRole(id!, userId, newRole);
      loadTeamData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  // Может ли текущий пользователь удалить участника с данной ролью
  const canRemoveMember = (targetRole: string, targetUserId: string): boolean => {
    // Нельзя удалить owner
    if (targetRole === 'owner') return false;
    // Себя может удалить любой (кроме owner — у него кнопка Delete Team)
    if (targetUserId === user?.id) return currentUserRole !== 'owner';
    // Admin может удалить только member
    if (currentUserRole === 'admin') return targetRole === 'member';
    // Owner может удалить всех кроме себя
    if (currentUserRole === 'owner') return true;
    return false;
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      loadTeamData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      loadTeamData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesAPI.delete(noteId);
      loadTeamData();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title);
    setEditingNoteContent(note.content);
    setEditingNoteShared(note.is_shared);
  };

  const handleSaveNote = async () => {
    if (!editingNoteId) return;
    try {
      await notesAPI.update(editingNoteId, {
        title: editingNoteTitle,
        content: editingNoteContent,
        is_shared: editingNoteShared,
      });
      loadTeamData();
      setEditingNoteId(null);
      setEditingNoteTitle('');
      setEditingNoteContent('');
      setEditingNoteShared(true);
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteTitle('');
    setEditingNoteContent('');
    setEditingNoteShared(true);
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone!')) return;
    try {
      await teamsAPI.delete(id!);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete team');
    }
  };

  // ── Label CRUD ──────────────────────────────────────────
  const LABEL_COLORS = [
    '#6366f1','#ec4899','#ef4444','#f59e0b',
    '#10b981','#06b6d4','#8b5cf6','#f97316',
    '#84cc16','#14b8a6','#3b82f6','#a855f7',
  ];

  const handleCreateLabel = async () => {
    if (!labelForm.name.trim() || labelLoading) return;
    setLabelLoading(true);
    try {
      const res = await labelsAPI.create(id!, { name: labelForm.name.trim(), color: labelForm.color });
      setTeamLabels(prev => [...prev, res.data]);
      setLabelForm({ name: '', color: '#6366f1' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка создания метки');
    } finally {
      setLabelLoading(false);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel || !labelForm.name.trim() || labelLoading) return;
    setLabelLoading(true);
    try {
      const res = await labelsAPI.update(editingLabel.id, { name: labelForm.name.trim(), color: labelForm.color });
      setTeamLabels(prev => prev.map(l => l.id === editingLabel.id ? res.data : l));
      setEditingLabel(null);
      setLabelForm({ name: '', color: '#6366f1' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка обновления метки');
    } finally {
      setLabelLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Удалить метку? Она будет снята со всех задач.')) return;
    try {
      await labelsAPI.delete(labelId);
      setTeamLabels(prev => prev.filter(l => l.id !== labelId));
      if (labelFilter === labelId) setLabelFilter(null);
    } catch {}
  };

  const startEditLabel = (label: any) => {
    setEditingLabel(label);
    setLabelForm({ name: label.name, color: label.color });
  };
  // ────────────────────────────────────────────────────────

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
      await teamsAPI.removeMember(id!, user!.id);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave team');
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border border-red-500/30';
      case 'high':   return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
      case 'low':    return 'text-green-400 bg-green-500/10 border border-green-500/30';
      default:       return 'text-gray-400 bg-gray-700/60 border border-gray-600/40';
    }
  };



  // Фильтрация по поиску
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLabel = !labelFilter || (task.labels && task.labels.some((l: any) => l.id === labelFilter));
    return matchesSearch && matchesLabel;
  });

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        breadcrumbs={[{ label: currentTeam?.name || '…', path: undefined }]}
        actions={
          currentTeam?.owner_id === user?.id ? (
            <div className="relative">
              <button
                onClick={() => setShowTeamMenu(prev => !prev)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700/60 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all border border-gray-600/50"
                title="Team options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {showTeamMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTeamMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <button
                      onClick={() => { setShowTeamMenu(false); handleDeleteTeam(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t('deleteTeam')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowTeamMenu(prev => !prev)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700/60 hover:bg-gray-600/70 text-gray-300 hover:text-white transition-all border border-gray-600/50"
                title="Team options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {showTeamMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTeamMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <button
                      onClick={() => { setShowTeamMenu(false); handleLeaveTeam(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-orange-400 hover:bg-orange-500/10 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t('leaveTeam')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8 page-enter">
        <MilestoneCard teamId={id!} onUpdate={loadTeamData} />
        {/* Tabs */}
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <div className="flex gap-2 sm:gap-3 sm:flex-wrap pb-1">
            {([
              { key: 'tasks',     label: `${t('tasks')} (${filteredTasks.length})` },
              { key: 'notes',     label: `${t('notes')} (${filteredNotes.length})` },
              { key: 'members',   label: `${t('members')} (${members.length})` },
              { key: 'documents', label: `📎 ${t('teamDocuments')}` },
              { key: 'analytics', label: `📊 ${t('analytics')}` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold transition-all hover-lift text-xs sm:text-base whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {(activeTab === 'tasks' || activeTab === 'notes') && (
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`🔍 ${activeTab === 'tasks' ? t('searchTasks') : t('searchNotes')}`}
              className="w-full bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-700/50 input-modern transition-all"
            />
          </div>
        )}

        {/* Label filter + управление — только для вкладки tasks */}
        {activeTab === 'tasks' && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {teamLabels.length > 0 && (
              <button
                onClick={() => setLabelFilter(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all hover-lift border ${
                  !labelFilter
                    ? 'bg-gray-600 text-white border-gray-500'
                    : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:border-gray-500'
                }`}
              >
                Все
              </button>
            )}
            {teamLabels.map((label: any) => (
              <button
                key={label.id}
                onClick={() => setLabelFilter(labelFilter === label.id ? null : label.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover-lift border ${
                  labelFilter === label.id ? 'opacity-100 shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={labelFilter === label.id ? {
                  backgroundColor: label.color + '33',
                  color: label.color,
                  borderColor: label.color + '66',
                } : {
                  backgroundColor: label.color + '11',
                  color: label.color,
                  borderColor: label.color + '33',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            ))}
            {/* Кнопка управления метками */}
            <button
              onClick={() => setShowLabelManager(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-gray-700/50 transition-all hover-lift"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a0 0 0 014-4z" />
              </svg>
              Метки
            </button>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-xl font-semibold text-white">{t('tasks')}</h2>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Toggle List / Kanban */}
                <div className="flex gap-1 bg-gray-700/40 rounded-xl p-1 border border-gray-600/30">
                  <button
                    onClick={() => setViewMode('list')}
                    title={t('listView')}
                    className={`p-2 rounded-lg transition-all btn-modern hover-lift ${viewMode === 'list' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    title={t('kanbanView')}
                    className={`p-2 rounded-lg transition-all btn-modern hover-lift ${viewMode === 'kanban' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 sm:px-6 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium text-sm sm:text-base text-center"
                >
                  {t('newTask')}
                </button>
              </div>
            </div>

            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="mb-6 p-6 glass rounded-xl animate-fade-in-scale border border-indigo-500/20">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={t('title')}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                  required
                />
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder={t('description')}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50 dark-scrollbar"
                  rows={3}
                />
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {([
                      { value: 'urgent', label: 'Urgent', dot: 'bg-red-500',    active: 'bg-red-500/15 border-red-500/50 text-red-300',         idle: 'text-gray-400 border-gray-600/50 hover:border-red-500/40 hover:text-red-400' },
                      { value: 'high',   label: 'High',   dot: 'bg-orange-400', active: 'bg-orange-400/15 border-orange-400/50 text-orange-300', idle: 'text-gray-400 border-gray-600/50 hover:border-orange-400/40 hover:text-orange-400' },
                      { value: 'medium', label: 'Medium', dot: 'bg-amber-400',  active: 'bg-amber-400/15 border-amber-400/50 text-amber-300',   idle: 'text-gray-400 border-gray-600/50 hover:border-amber-400/40 hover:text-amber-400' },
                      { value: 'low',    label: 'Low',    dot: 'bg-green-400',  active: 'bg-green-400/15 border-green-400/50 text-green-300',   idle: 'text-gray-400 border-gray-600/50 hover:border-green-400/40 hover:text-green-400' },
                    ] as const).map(({ value, label, dot, active, idle }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTaskPriority(value)}
                        className={`priority-btn flex items-center justify-center gap-2 px-3 py-2 rounded-xl border font-medium text-sm ${taskPriority === value ? `selected ${active}` : `bg-gray-700/30 ${idle}`}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-2">{t('assignees')}</label>
                  <AssigneeSelector
                    teamMembers={members.map(m => ({ user_id: m.user_id, username: m.username, email: m.email, role: m.role }))}
                    selectedAssignees={taskAssignees}
                    onChange={setTaskAssignees}
                  />
                </div>

                {/* Выбор меток при создании задачи */}
                {teamLabels.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-gray-300 mb-2 text-sm">Метки</label>
                    <div className="flex flex-wrap gap-2">
                      {teamLabels.map((label: any) => {
                        const selected = taskLabelIds.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => setTaskLabelIds(prev =>
                              selected ? prev.filter(id => id !== label.id) : [...prev, label.id]
                            )}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover-lift border ${selected ? 'shadow-md' : 'opacity-60 hover:opacity-100'}`}
                            style={selected ? {
                              backgroundColor: label.color + '33',
                              color: label.color,
                              borderColor: label.color + '88',
                            } : {
                              backgroundColor: label.color + '11',
                              color: label.color,
                              borderColor: label.color + '33',
                            }}
                          >
                            {selected && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                  >
                    {t('createTask')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-6 py-2.5 rounded-lg transition-all hover-lift border border-gray-600/50 font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* ── List / Kanban view ─────────────────────────────────────────── */}
            <div key={viewMode}>
            {viewMode === 'kanban' ? (
              /* ── KANBAN ── */
              filteredTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t('noTasks')}</p>
              ) : (
                <div className="overflow-x-auto -mx-2 px-2 pb-2 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              <div className="grid grid-cols-3 gap-4 min-w-[600px] sm:min-w-0">
                  {(['todo', 'in_progress', 'done'] as const).map((colStatus) => {
                    const colTasks = filteredTasks.filter(t => t.status === colStatus);
                    const colLabel = colStatus === 'todo' ? t('kanbanTodo') : colStatus === 'in_progress' ? t('kanbanInProgress') : t('kanbanDone');
                    const colColor = colStatus === 'todo' ? 'bg-gray-400' : colStatus === 'in_progress' ? 'bg-blue-400' : 'bg-green-400';
                    return (
                      <div
                        key={colStatus}
                        className={`kanban-col rounded-xl p-3 border border-gray-700/50 ${dragOverCol === colStatus ? 'kanban-col-over' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(colStatus); }}
                        onDragLeave={() => setDragOverCol(null)}
                        onDrop={() => {
                          if (draggingTaskId && draggingTaskId !== colStatus) {
                            handleUpdateTaskStatus(draggingTaskId, colStatus);
                          }
                          setDraggingTaskId(null);
                          setDragOverCol(null);
                        }}
                      >
                        {/* Заголовок колонки */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className={`w-2 h-2 rounded-full ${colColor}`} />
                          <span className="text-gray-300 font-semibold text-sm">{colLabel}</span>
                          <span className="ml-auto text-gray-500 text-xs bg-gray-700/50 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                        </div>

                        {/* Карточки */}
                        <div className="space-y-2">
                          {colTasks.map((task, idx) => {
                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                            let cardClass = '';
                            if (hasSubtasks && task.subtasks) {
                              const hasOverdueSubtasks = task.subtasks.some((st: any) =>
                                st.due_date && new Date(st.due_date).getTime() < currentTime && st.status !== 'done'
                              );
                              const allDone = task.subtasks.every((st: any) => st.status === 'done');
                              const anyCompletedLate = task.subtasks.some((st: any) =>
                                st.status === 'done' && st.completed_at && st.due_date &&
                                new Date(st.completed_at).getTime() > new Date(st.due_date).getTime()
                              );
                              const anyActive = task.subtasks.some((st: any) => st.status === 'in_progress' || st.status === 'done');
                              if (hasOverdueSubtasks) cardClass = 'task-bg-red border';
                              else if (allDone && anyCompletedLate) cardClass = 'task-bg-orange border';
                              else if (allDone) cardClass = 'task-bg-green border';
                              else if (anyActive) cardClass = 'task-bg-blue border';
                              else cardClass = 'task-bg-gray border';
                            } else {
                              const isOverdue = task.due_date && new Date(task.due_date).getTime() < currentTime && task.status !== 'done';
                              const isDone = task.status === 'done';
                              const isCompletedLate = isDone && task.completed_at && task.due_date &&
                                new Date(task.completed_at).getTime() > new Date(task.due_date).getTime();
                              if (isOverdue) cardClass = 'task-bg-red border';
                              else if (isCompletedLate) cardClass = 'task-bg-orange border';
                              else if (isDone) cardClass = 'task-bg-green border';
                              else if (task.status === 'in_progress') cardClass = 'task-bg-blue border';
                              else cardClass = 'task-bg-gray border';
                            }

                            return (
                              <div
                                key={task.id}
                                draggable={!hasSubtasks}
                                onDragStart={() => setDraggingTaskId(task.id)}
                                onDragEnd={() => { setDraggingTaskId(null); setDragOverCol(null); }}
                                className={`p-3 rounded-xl cursor-pointer card-hover stagger-item ${cardClass} ${draggingTaskId === task.id ? 'kanban-card-dragging' : ''}`}
                                style={{ animationDelay: `${idx * 40}ms` }}
                                onClick={() => navigate(`/task/${task.id}`)}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <span className={`inline-flex items-center justify-center gap-1 w-16 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getPriorityBadge(task.priority)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`} />
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </span>
                                  <h3 className="text-white font-medium text-sm leading-snug">{task.title}</h3>
                                </div>

                                {/* Date badge */}
                                {task.status === 'done' ? (() => {
                                  const subtasks: any[] = task.subtasks || [];
                                  const completedAt = task.completed_at || subtasks.filter((s: any) => s.completed_at).map((s: any) => s.completed_at as string).sort().at(-1);
                                  if (!completedAt) return null;
                                  const effectiveDueDate = task.due_date || subtasks.filter((s: any) => s.due_date).map((s: any) => s.due_date as string).sort().at(-1);
                                  const completed = formatCompletedDate(completedAt, effectiveDueDate, lang);
                                  return <span className={`date-badge ${completed.className}`}><span className="date-badge-icon">{completed.icon}</span>{completed.text}</span>;
                                })() : task.due_date && (() => {
                                  const deadline = formatDeadline(task.due_date, lang);
                                  return <span className={`date-badge ${deadline.className}`}><span className="date-badge-icon">{deadline.icon}</span>{deadline.text}</span>;
                                })()}

                                {/* Labels */}
                                {task.labels && task.labels.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {task.labels.slice(0, 3).map((label: any) => (
                                      <LabelBadge key={label.id} label={label} size="xs" />
                                    ))}
                                    {task.labels.length > 3 && (
                                      <span className="text-[10px] text-gray-500">+{task.labels.length - 3}</span>
                                    )}
                                  </div>
                                )}

                                {/* Assignees + subtask progress */}
                                <div className="flex items-center justify-between mt-2">
                                  <AssigneeAvatars assignees={task.assignees || []} maxDisplay={3} teamSize={members.length} />
                                  {task.subtasks && task.subtasks.length > 0 && (() => {
                                    const completedCount = task.subtasks.filter((st: any) => st.status === 'done').length;
                                    return (
                                      <span className="text-xs text-gray-400">{completedCount}/{task.subtasks.length}</span>
                                    );
                                  })()}
                                </div>

                                {/* Subtask progress bar */}
                                {task.subtasks && task.subtasks.length > 0 && (() => {
                                  const completedCount = task.subtasks.filter((st: any) => st.status === 'done').length;
                                  return (
                                    <div className="mt-2 bg-gray-600 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${(completedCount / task.subtasks.length) * 100}%` }} />
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )
            ) : (
              /* ── LIST ── */
              <div key={`list-${labelFilter ?? 'all'}`} className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">{t('noTasks')}</p>
                ) : (
                  filteredTasks.map((task) => {
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

                    let cardClass = '';
                    let isOverdue = false;
                    let isDone = false;
                    let isCompletedLate = false;

                    if (hasSubtasks && task.subtasks) {
                      const hasOverdueSubtasks = task.subtasks.some((st: any) =>
                        st.due_date && new Date(st.due_date).getTime() < currentTime && st.status !== 'done'
                      );
                      const allDone = task.subtasks.every((st: any) => st.status === 'done');
                      const anyCompletedLate = task.subtasks.some((st: any) =>
                        st.status === 'done' && st.completed_at && st.due_date &&
                        new Date(st.completed_at).getTime() > new Date(st.due_date).getTime()
                      );
                      const anyActive = task.subtasks.some((st: any) => st.status === 'in_progress' || st.status === 'done');
                      if (hasOverdueSubtasks) { cardClass = 'task-bg-red border'; isOverdue = true; }
                      else if (allDone && anyCompletedLate) { cardClass = 'task-bg-orange border'; isCompletedLate = true; }
                      else if (allDone) { cardClass = 'task-bg-green border'; isDone = true; }
                      else if (anyActive) cardClass = 'task-bg-blue border';
                      else cardClass = 'task-bg-gray border';
                    } else {
                      const taskIsOverdue = task.due_date && new Date(task.due_date).getTime() < currentTime && task.status !== 'done';
                      const taskIsDone = task.status === 'done';
                      const taskIsCompletedLate = taskIsDone && task.completed_at && task.due_date &&
                        new Date(task.completed_at).getTime() > new Date(task.due_date).getTime();
                      isOverdue = !!taskIsOverdue;
                      isDone = taskIsDone;
                      isCompletedLate = !!taskIsCompletedLate;
                      if (isOverdue) cardClass = 'task-bg-red border';
                      else if (isCompletedLate) cardClass = 'task-bg-orange border';
                      else if (isDone) cardClass = 'task-bg-green border';
                      else if (task.status === 'in_progress') cardClass = 'task-bg-blue border';
                      else cardClass = 'task-bg-gray border';
                    }

                    return (
                    <div
                      key={task.id}
                      className={`p-3 sm:p-4 rounded-xl cursor-pointer card-hover stagger-item ${cardClass}`}
                      onClick={() => navigate(`/task/${task.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className={`inline-flex items-center justify-center gap-1 w-14 sm:w-16 py-0.5 rounded-full text-xs font-medium mt-0.5 flex-shrink-0 ${getPriorityBadge(task.priority)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`} />
                            <span className="truncate">{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-medium truncate text-sm sm:text-base">{task.title}</h3>
                            {task.description && <p className="text-gray-400 text-xs sm:text-sm mt-0.5 hidden sm:block line-clamp-2">{task.description}</p>}

                            <div className="flex flex-wrap gap-2 mt-2">
                              {task.status === 'done' ? (() => {
                                const subtasks: any[] = task.subtasks || [];
                                const subtaskCompleted = subtasks
                                  .filter((s: any) => s.completed_at)
                                  .map((s: any) => s.completed_at as string)
                                  .sort()
                                  .at(-1);
                                const completedAt = task.completed_at || subtaskCompleted;
                                if (!completedAt) return null;
                                const effectiveDueDate = task.due_date || subtasks
                                  .filter((s: any) => s.due_date)
                                  .map((s: any) => s.due_date as string)
                                  .sort()
                                  .at(-1);
                                const completed = formatCompletedDate(completedAt, effectiveDueDate, lang);
                                return (
                                  <span className={`date-badge ${completed.className}`}>
                                    <span className="date-badge-icon">{completed.icon}</span>
                                    {completed.text}
                                  </span>
                                );
                              })() : task.due_date && (() => {
                                const deadline = formatDeadline(task.due_date, lang);
                                return (
                                  <span className={`date-badge ${deadline.className}`}>
                                    <span className="date-badge-icon">{deadline.icon}</span>
                                    {deadline.text}
                                  </span>
                                );
                              })()}
                            </div>
                            {/* Labels in list view */}
                            {task.labels && task.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {task.labels.map((label: any) => (
                                  <LabelBadge key={label.id} label={label} size="sm" />
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <AssigneeAvatars assignees={task.assignees || []} maxDisplay={2} teamSize={members.length} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusBadge
                            status={hasSubtasks && task.subtasks
                              ? task.subtasks.some((st: any) => st.status === 'in_progress' || st.status === 'done')
                                ? 'in_progress'
                                : 'todo'
                              : task.status as 'todo' | 'in_progress' | 'done'}
                            onChange={(newStatus) => handleUpdateTaskStatus(task.id, newStatus)}
                            disabled={hasSubtasks}
                            disabledTitle="Статус управляется подзадачами"
                          />
                          {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                              title="Delete task"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Прогресс-бар подзадач на всю ширину */}
                      {task.subtasks && task.subtasks.length > 0 && (() => {
                        const completedCount = task.subtasks.filter((st: any) => st.status === 'done').length;
                        return (
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-600">
                            <div className="flex-1 bg-gray-600 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-green-500 h-full transition-all duration-300"
                                style={{ width: `${(completedCount / task.subtasks.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-300 font-medium min-w-[50px]">
                              {completedCount}/{task.subtasks.length}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    );
                  })
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">{t('notes')}</h2>
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium"
              >
                {t('newNote')}
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleCreateNote} className="mb-6 p-6 glass rounded-xl animate-fade-in-scale border border-indigo-500/20">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={t('noteTitle')}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                  required
                />
                <div className="mb-3">
                  <MarkdownEditor
                    value={noteContent}
                    onChange={setNoteContent}
                    placeholder={t('noteContent')}
                    minHeight="100px"
                  />
                </div>
                <label className="flex items-center gap-2 text-gray-300 mb-4">
                  <input
                    type="checkbox"
                    checked={noteShared}
                    onChange={(e) => setNoteShared(e.target.checked)}
                    className="rounded"
                  />
                  {t('shareWithTeam')}
                </label>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                  >
                    {t('createNote')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNoteForm(false)}
                    className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-6 py-2.5 rounded-lg transition-all hover-lift border border-gray-600/50 font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.length === 0 ? (
                <p className="text-gray-400 text-center py-8 col-span-2">{t('noNotes')}</p>
              ) : (
                filteredNotes.map((note) => (
                  <div key={note.id} className="task-bg-gray border p-4 rounded-xl card-hover stagger-item">
                    {editingNoteId === note.id ? (
                      <div key={`edit-${note.id}`} className="animate-edit-in">
                        <input
                          type="text"
                          value={editingNoteTitle}
                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                          placeholder={t('noteTitle')}
                          className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50 focus:border-indigo-500/50"
                        />
                        <div className="mb-3">
                          <MarkdownEditor
                            value={editingNoteContent}
                            onChange={setEditingNoteContent}
                            placeholder={t('noteContent')}
                            minHeight="100px"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-gray-300 mb-4">
                          <input
                            type="checkbox"
                            checked={editingNoteShared}
                            onChange={(e) => setEditingNoteShared(e.target.checked)}
                            className="rounded"
                          />
                          {t('shareWithTeam')}
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleSaveNote}
                            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm transition-all btn-modern hover-lift shadow-md font-medium"
                          >
                            {t('save')}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditNote}
                            className="px-4 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-sm transition-all hover-lift border border-gray-600/50 font-medium"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={`view-${note.id}`} className="animate-edit-in">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-white font-medium">{note.title}</h3>
                          <div className="flex items-center gap-2">
                            {note.is_shared && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                {t('sharedBadge')}
                              </span>
                            )}
                            {note.author_id === user?.id && (
                              <button
                                onClick={() => handleEditNote(note)}
                                className="px-3 py-1.5 bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 hover:text-white rounded-lg text-xs transition-all hover-lift border border-gray-600/30 font-medium"
                              >
                                {t('edit')}
                              </button>
                            )}
                            {note.author_id === user?.id && (
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                              >
                                {t('delete')}
                              </button>
                            )}
                          </div>
                        </div>
                        <MarkdownPreview content={note.content || ''} className="text-sm" />
                        <p className="text-gray-500 text-xs mt-2">{t('by')}: {getMemberName(note.author_id)}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">{t('members')}</h2>
              {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <button
                  onClick={() => setShowMemberForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium"
                >
                  {t('addMember')}
                </button>
              )}
            </div>

            {showMemberForm && (
              <form onSubmit={handleAddMember} className="mb-6 p-6 glass rounded-xl animate-fade-in-scale border border-indigo-500/20">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder={t('email')}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                  required
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                >
                  <option value="member">{t('member')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                  >
                    {t('addMember')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMemberForm(false)}
                    className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-6 py-2.5 rounded-lg transition-all hover-lift border border-gray-600/50 font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t('noMembers')}</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="task-bg-gray border p-4 rounded-xl flex flex-wrap justify-between items-center gap-3 card-hover stagger-item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {member.username?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="absolute bottom-0 right-0">
                          <OnlineIndicator isOnline={onlineUserIds.includes(member.user_id)} size="sm" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">
                          {member.username}
                          {member.user_id === user?.id && <span className="text-gray-400 text-xs ml-2">({t('you')})</span>}
                        </p>
                        <p className="text-gray-400 text-sm truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                      {/* Бейдж роли */}
                      <RoleBadge
                        role={member.role as 'owner' | 'admin' | 'member'}
                        onChange={(newRole) => handleUpdateMemberRole(member.user_id, newRole)}
                        disabled={currentUserRole !== 'owner' || member.role === 'owner'}
                      />
                      {/* Кнопка Remove / Leave */}
                      {canRemoveMember(member.role, member.user_id) && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-xs transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium whitespace-nowrap"
                        >
                          {member.user_id === user?.id ? t('leaveTeamBtn') : t('removeMember')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* Documents Tab */}
        {activeTab === 'documents' && id && user && (
          <div className="bg-gray-800 rounded-xl p-6">
            <AttachmentSection
              teamId={id}
              currentUserId={user.id}
            />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && user && (
          <TeamAnalytics
            tasks={tasks}
            members={members.map(m => ({ user_id: m.user_id, username: m.username, role: m.role }))}
            currentUserId={user.id}
          />
        )}
      </main>

      {/* ── Модалка управления метками ── */}
      {showLabelManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowLabelManager(false); setEditingLabel(null); setLabelForm({ name: '', color: '#6366f1' }); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a0 0 0 014-4z" />
                </svg>
                Управление метками
              </h3>
              <button onClick={() => { setShowLabelManager(false); setEditingLabel(null); setLabelForm({ name: '', color: '#6366f1' }); }} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Форма создания / редактирования */}
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 border border-gray-700/50">
              <p className="text-xs text-gray-400 font-medium mb-3">
                {editingLabel ? `Редактировать: ${editingLabel.name}` : 'Создать новую метку'}
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  value={labelForm.name}
                  onChange={e => setLabelForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') editingLabel ? handleUpdateLabel() : handleCreateLabel(); }}
                  placeholder="Название метки..."
                  maxLength={50}
                  className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-600 focus:border-indigo-500 transition-colors"
                />
                {/* Превью */}
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 border-2 transition-all"
                  style={{ backgroundColor: labelForm.color + '33', borderColor: labelForm.color }}
                />
              </div>
              {/* Палитра */}
              <div className="flex flex-wrap gap-2 mb-3">
                {LABEL_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setLabelForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${labelForm.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                  disabled={!labelForm.name.trim() || labelLoading}
                  className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm rounded-xl font-semibold transition-all btn-modern hover-lift"
                >
                  {editingLabel ? 'Сохранить' : 'Создать'}
                </button>
                {editingLabel && (
                  <button
                    onClick={() => { setEditingLabel(null); setLabelForm({ name: '', color: '#6366f1' }); }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </div>

            {/* Список меток */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {teamLabels.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Нет меток. Создайте первую!</p>
              ) : teamLabels.map((label: any) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-xl border border-gray-700/40 hover:border-gray-600/60 transition-all group"
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span
                    className="flex-1 text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: label.color + '22', color: label.color }}
                  >
                    {label.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditLabel(label)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                      title="Редактировать"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLabel(label.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Удалить"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}