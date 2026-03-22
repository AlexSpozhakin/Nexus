import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, tasksAPI } from '../services/api';
import { useStore } from '../store/store';
import Header from '../components/Header';
import { formatDeadline, formatCompletedDate } from '../utils/dateFormatter';
import { useTranslation } from '../i18n/translations';

interface TeamStat {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, setTeams, teams } = useStore();
  const { t, lang } = useTranslation();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<Record<string, TeamStat>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  const loadData = async () => {
    try {
      const [teamsRes, tasksRes] = await Promise.all([
        teamsAPI.getAll(),
        tasksAPI.getMyTasks(),
      ]);
      const fetchedTeams = teamsRes.data || [];
      setTeams(fetchedTeams);
      setMyTasks(tasksRes.data || []);

      // Fetch all tasks for each team in parallel for accurate stats
      const now = Date.now();
      const statsEntries = await Promise.all(
        fetchedTeams.map(async (team: any) => {
          try {
            const res = await tasksAPI.getByTeam(team.id);
            const tasks: any[] = res.data || [];
            const total = tasks.length;
            const done = tasks.filter((t: any) => t.status === 'done').length;
            const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
            const overdue = tasks.filter((t: any) => t.due_date && new Date(t.due_date).getTime() < now && t.status !== 'done').length;
            return [team.id, { total, done, inProgress, overdue }] as [string, TeamStat];
          } catch {
            return [team.id, { total: 0, done: 0, inProgress: 0, overdue: 0 }] as [string, TeamStat];
          }
        })
      );
      setTeamStats(Object.fromEntries(statsEntries));
      setDataLoaded(true);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Автообновление при получении уведомлений
  useEffect(() => {
    let isUpdating = false;

    const handleDataUpdate = () => {
      if (isUpdating) return;
      isUpdating = true;
      loadData().finally(() => {
        setTimeout(() => {
          isUpdating = false;
        }, 1000);
      });
    };

    window.addEventListener('data-update', handleDataUpdate);
    return () => window.removeEventListener('data-update', handleDataUpdate);
  }, []);

  // Таймер для обновления статуса "просрочено" каждую минуту
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Обновляем каждую минуту

    return () => clearInterval(interval);
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamsAPI.create({ name: newTeamName, description: newTeamDesc });
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateTeam(false);
      loadData();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем открытие команды при клике на кнопку удаления
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone!`)) return;
    try {
      await teamsAPI.delete(teamId);
      loadData(); // Обновляем список команд
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete team');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500/20 text-green-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'todo': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        actions={
          <button
            onClick={() => { useStore.getState().logout(); navigate('/login'); }}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-all btn-modern hover-lift font-medium text-sm"
          >
            <span className="hidden sm:inline">{t('logout')}</span>
            <span className="sm:hidden">←</span>
          </button>
        }
      />
      <main className="max-w-7xl mx-auto px-4 py-8 page-enter">
        {/* My Teams */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">{t('myTeams')}</h2>
            <button
              onClick={() => setShowCreateTeam(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl font-medium"
            >
              {t('newTeam')}
            </button>
          </div>

          {showCreateTeam && (
            <form onSubmit={handleCreateTeam} className="mb-6 p-6 glass rounded-xl animate-fade-in-scale border border-indigo-500/20">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder={t('teamName')}
                className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
                required
              />
              <input
                type="text"
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                placeholder={t('description')}
                className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern transition-all border border-gray-600/50"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg transition-all btn-modern hover-lift shadow-md hover:shadow-lg font-medium"
                >
                  {t('createTeam')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-6 py-2.5 rounded-lg transition-all hover-lift border border-gray-600/50 font-medium"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!dataLoaded ? (
              [1,2,3].map(i => (
                <div key={i} className="task-bg-gray border p-4 rounded-xl animate-pulse flex flex-col gap-3">
                  <div>
                    <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-700/60 rounded w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-3 bg-gray-700/60 rounded w-12" />
                    <div className="h-3 bg-gray-700/40 rounded w-16" />
                  </div>
                  <div className="h-1.5 bg-gray-700/50 rounded-full" />
                </div>
              ))
            ) : teams.length === 0 ? (
              <p className="text-gray-400 col-span-3 text-center py-8">{t('noTeams')}</p>
            ) : (
              teams.map((team) => {
                const stats = teamStats[team.id] || { total: 0, done: 0, inProgress: 0, overdue: 0 };
                const { total, done, inProgress, overdue } = stats;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                const barColor = overdue > 0 ? 'from-red-500 to-red-400' : progress === 100 ? 'from-green-500 to-emerald-400' : inProgress > 0 ? 'from-indigo-500 to-blue-400' : 'from-gray-500 to-gray-400';

                return (
                <div
                  key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="bg-gray-700/40 border border-gray-600/40 hover:border-indigo-500/40 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 stagger-item relative group flex flex-col gap-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-blue-400 flex-shrink-0" />
                        <h3 className="text-white font-semibold truncate">{team.name}</h3>
                      </div>
                      {team.description && (
                        <p className="text-gray-400 text-sm truncate pl-4">{team.description}</p>
                      )}
                    </div>
                    {team.owner_id === user?.id && (
                      <button
                        onClick={(e) => handleDeleteTeam(team.id, team.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                        title="Delete team"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Progress bar + stats */}
                  <div className="space-y-2">
                    <div className="h-1.5 bg-gray-600/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {total > 0 ? (
                        <>
                          <span className="text-gray-400">
                            <span className="text-white font-medium">{done}</span>
                            <span className="text-gray-600">/{total}</span>
                            <span className="text-gray-500 ml-1">{t('done')}</span>
                          </span>
                          {inProgress > 0 && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {inProgress}
                            </span>
                          )}
                          {overdue > 0 && (
                            <span className="flex items-center gap-1 text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              {overdue} {t('overdueShort')}
                            </span>
                          )}
                          <span className={`ml-auto font-semibold ${progress === 100 ? 'text-green-400' : overdue > 0 ? 'text-red-400' : 'text-indigo-400'}`}>{progress}%</span>
                        </>
                      ) : (
                        <span className="text-gray-500">{t('noTasks')}</span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">{t('myTasks')}</h2>
          
          <div className="space-y-3">
            {!dataLoaded ? (
              [1,2,3].map(i => (
                <div key={i} className="task-bg-gray border p-4 rounded-xl animate-pulse flex gap-3">
                  <div className="w-2 rounded-full bg-gray-700 self-stretch" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-700/60 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : myTasks.length === 0 ? (
              <p className="text-gray-400 text-center py-8">{t('noTasks')}</p>
            ) : (
              myTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date).getTime() < currentTime && task.status !== 'done';
                const isDone = task.status === 'done';
                const isCompletedLate = isDone && task.completed_at && task.due_date &&
                                        new Date(task.completed_at).getTime() > new Date(task.due_date).getTime();

                let cardClass = '';
                if (isOverdue) {
                  cardClass = 'task-bg-red border';
                } else if (isCompletedLate) {
                  cardClass = 'task-bg-orange border';
                } else if (isDone) {
                  cardClass = 'task-bg-green border';
                } else if (task.status === 'in_progress') {
                  cardClass = 'task-bg-blue border';
                } else {
                  cardClass = 'task-bg-gray border';
                }

                return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={`p-4 rounded-xl cursor-pointer card-hover stagger-item ${cardClass}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`} />
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <div>
                        <h3 className="text-white font-medium">{task.title}</h3>
                        <p className="text-gray-400 text-sm">{task.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                      {task.status === 'done' ? t('done') : task.status === 'in_progress' ? t('inProgress') : t('todo')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.status === 'done' && task.completed_at && (() => {
                      const completed = formatCompletedDate(task.completed_at, task.due_date, lang);
                      return (
                        <span className={`date-badge ${completed.className}`}>
                          <span className="date-badge-icon">{completed.icon}</span>
                          {completed.text}
                        </span>
                      );
                    })()}
                    {task.status !== 'done' && task.due_date && (() => {
                      const deadline = formatDeadline(task.due_date, lang);
                      return (
                        <span className={`date-badge ${deadline.className}`}>
                          <span className="date-badge-icon">{deadline.icon}</span>
                          {deadline.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}