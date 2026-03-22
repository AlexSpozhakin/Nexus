import { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/translations';
import { useStore } from '../store/store';

interface TaskAssignee {
  user_id: string;
  role: string;
  user_name?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  created_at?: string;
  parent_task_id?: string;
  subtasks?: Task[];
  assignees?: TaskAssignee[];
  creator_id?: string;
}

interface Member {
  user_id: string;
  username: string;
  role: string;
}

interface Props {
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

type Period = '7' | '30' | 'all';

// ── Утилиты ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatAvgTime(ms: number, lang: string): string {
  if (ms <= 0) return '—';
  const hours = Math.round(ms / 3600000);
  if (hours < 24) return lang === 'ru' ? `${hours} ч` : `${hours}h`;
  const days = Math.round(hours / 24);
  return lang === 'ru' ? `${days} дн` : `${days}d`;
}

// Круговой прогресс SVG
function RadialProgress({ value, size = 80, stroke = 7, color = '#6366f1', trackColor }: {
  value: number; size?: number; stroke?: number; color?: string; trackColor?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={trackColor || 'rgba(255,255,255,0.07)'} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

// Горизонтальный прогресс-бар
function ProgressBar({ value, color, className = '' }: { value: number; color: string; className?: string }) {
  return (
    <div className={`h-2 bg-white/5 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

export default function TeamAnalytics({ tasks, members, currentUserId }: Props) {
  const { t, lang } = useTranslation();
  const isLight = useStore(s => s.settings.theme === 'light');
  const [period, setPeriod] = useState<Period>('30');
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'members' | 'activity'>('overview');
  const now = Date.now();

  // Только корневые задачи (без parent_task_id) для основной аналитики
  const rootTasks = useMemo(() => tasks.filter(t => !t.parent_task_id), [tasks]);

  // Фильтр по периоду
  const periodTasks = useMemo(() => {
    if (period === 'all') return rootTasks;
    const cutoff = daysAgo(parseInt(period)).getTime();
    return rootTasks.filter(task => {
      const ref = task.completed_at
        ? new Date(task.completed_at).getTime()
        : task.due_date
          ? new Date(task.due_date).getTime()
          : null;
      return ref ? ref >= cutoff : true;
    });
  }, [rootTasks, period]);

  // ── Метрики ─────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = periodTasks.length;
    const done = periodTasks.filter(t => t.status === 'done');
    const overdue = periodTasks.filter(t =>
      t.due_date && new Date(t.due_date).getTime() < now && t.status !== 'done'
    );
    const inProgress = periodTasks.filter(t => t.status === 'in_progress');
    const todo = periodTasks.filter(t => t.status === 'todo');

    // Выполнено в срок
    const doneOnTime = done.filter(t =>
      !t.due_date || !t.completed_at ||
      new Date(t.completed_at).getTime() <= new Date(t.due_date).getTime()
    );

    // Среднее время выполнения (только задачи с completed_at и с subtasks через created_at — нет created_at в Task)
    // Считаем от due_date - 0 (приближение) до completed_at для done задач с обоими полями
    const completionTimes = done
      .filter(t => t.completed_at && t.due_date)
      .map(t => new Date(t.completed_at!).getTime() - new Date(t.due_date!).getTime());
    const avgTimeMs = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + Math.abs(b), 0) / completionTimes.length
      : 0;

    const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const overdueRate = total > 0 ? Math.round(((done.length - doneOnTime.length + overdue.length) / total) * 100) : 0;
    const onTimeRate = done.length > 0 ? Math.round((doneOnTime.length / done.length) * 100) : 0;

    return { total, done, overdue, inProgress, todo, doneOnTime, completionRate, overdueRate, onTimeRate, avgTimeMs };
  }, [periodTasks, now]);

  // ── Задачи в опасности (дедлайн < 48ч, не done) ─────────────────────────────
  const atRiskTasks = useMemo(() => {
    const limit48h = now + 48 * 3600 * 1000;
    return rootTasks.filter(t =>
      t.due_date &&
      t.status !== 'done' &&
      new Date(t.due_date).getTime() <= limit48h
    ).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [rootTasks, now]);

  // ── Нагрузка участников (в рамках периода) ───────────────────────────────
  const workload = useMemo(() => {
    const cutoff = period === 'all' ? 0 : daysAgo(parseInt(period)).getTime();
    return members.map(member => {
      const activeTasks = periodTasks.filter(task =>
        task.status !== 'done' &&
        task.assignees?.some(a => a.user_id === member.user_id)
      );
      const overdueTasks = activeTasks.filter(t =>
        t.due_date && new Date(t.due_date).getTime() < now
      );
      const doneTasks = periodTasks.filter(task =>
        task.status === 'done' &&
        task.assignees?.some(a => a.user_id === member.user_id) &&
        (period === 'all' || (task.completed_at && new Date(task.completed_at).getTime() >= cutoff))
      );
      return {
        ...member,
        activeCount: activeTasks.length,
        overdueCount: overdueTasks.length,
        doneCount: doneTasks.length,
        totalCount: activeTasks.length + doneTasks.length,
      };
    }).sort((a, b) => b.activeCount - a.activeCount);
  }, [members, periodTasks, period, now]);

  // ── Распределение приоритетов ────────────────────────────────────────────────
  const priorityStats = useMemo(() => {
    const all = periodTasks;
    const high = all.filter(t => t.priority === 'high');
    const medium = all.filter(t => t.priority === 'medium');
    const low = all.filter(t => t.priority === 'low');
    const total = all.length || 1;
    return [
      { label: t('analyticsHighPriority'), count: high.length, pct: Math.round(high.length / total * 100), color: '#ef4444', bg: 'from-red-500 to-red-600' },
      { label: t('analyticsMedPriority'), count: medium.length, pct: Math.round(medium.length / total * 100), color: '#f59e0b', bg: 'from-yellow-500 to-amber-500' },
      { label: t('analyticsLowPriority'), count: low.length, pct: Math.round(low.length / total * 100), color: '#22c55e', bg: 'from-green-500 to-emerald-500' },
    ];
  }, [periodTasks]);

  // ── Последняя активность (в рамках периода) ──────────────────────────────
  const recentDone = useMemo(() => {
    const cutoff = period === 'all' ? 0 : daysAgo(parseInt(period)).getTime();
    return [...rootTasks]
      .filter(t => t.status === 'done' && t.completed_at &&
        new Date(t.completed_at).getTime() >= cutoff)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5);
  }, [rootTasks, period]);

  // ── Рейтинг надёжности (в рамках периода) ────────────────────────────────
  const reliabilityRanking = useMemo(() => {
    const cutoff = period === 'all' ? 0 : daysAgo(parseInt(period)).getTime();
    return members.map(member => {
      const memberDone = rootTasks.filter(t =>
        t.status === 'done' &&
        t.assignees?.some(a => a.user_id === member.user_id) &&
        t.completed_at && t.due_date &&
        new Date(t.completed_at).getTime() >= cutoff
      );
      const onTime = memberDone.filter(t =>
        new Date(t.completed_at!).getTime() <= new Date(t.due_date!).getTime()
      );
      const rate = memberDone.length > 0
        ? Math.round((onTime.length / memberDone.length) * 100)
        : null;
      return { ...member, rate, onTime: onTime.length, done: memberDone.length };
    })
      .filter(m => m.done > 0)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  }, [members, rootTasks, period]);

  // ── Тепловая карта (адаптируется под период) ──────────────────────────────
  const heatmapData = useMemo(() => {
    // 7д → 2 недели, 30д → 5 недель, all → 16 недель
    const WEEKS = period === '7' ? 2 : period === '30' ? 5 : 16;
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const grid: { date: Date; count: number }[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const week: { date: Date; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(base);
        date.setDate(base.getDate() - (w * 7 + (6 - d)));
        const nextDay = new Date(date); nextDay.setDate(date.getDate() + 1);
        const count = tasks.filter(t => {
          const ca = t.completed_at ? new Date(t.completed_at) : null;
          return ca && ca >= date && ca < nextDay;
        }).length;
        week.push({ date: new Date(date), count });
      }
      grid.push(week);
    }
    return grid;
  }, [tasks, period]);

  // ── Velocity Chart (адаптируется под период) ──────────────────────────────
  const velocityData = useMemo(() => {
    // 7д → 1 неделя (разбиваем на дни), 30д → 4 недели, all → 8 недель
    const WEEKS = period === '7' ? 1 : period === '30' ? 4 : 8;
    const now2 = new Date(); now2.setHours(0, 0, 0, 0);

    if (period === '7') {
      // Для 7 дней показываем по дням
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now2);
        date.setDate(now2.getDate() - (6 - i));
        const nextDay = new Date(date); nextDay.setDate(date.getDate() + 1);
        const created = rootTasks.filter(t => {
          const ca = t.created_at ? new Date(t.created_at) : null;
          return ca && ca >= date && ca < nextDay;
        }).length;
        const closed = rootTasks.filter(t => {
          const ca = t.completed_at ? new Date(t.completed_at) : null;
          return ca && ca >= date && ca < nextDay;
        }).length;
        const label = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' });
        return { label, created, closed };
      });
    }

    // Для 30д и all показываем по неделям
    const dayOfWeek = now2.getDay();
    return Array.from({ length: WEEKS }, (_, i) => {
      const weekStart = new Date(now2);
      weekStart.setDate(now2.getDate() - dayOfWeek - (WEEKS - 1 - i) * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      const created = rootTasks.filter(t => {
        const ca = t.created_at ? new Date(t.created_at) : null;
        return ca && ca >= weekStart && ca < weekEnd;
      }).length;
      const closed = rootTasks.filter(t => {
        const ca = t.completed_at ? new Date(t.completed_at) : null;
        return ca && ca >= weekStart && ca < weekEnd;
      }).length;
      const label = weekStart.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' });
      return { label, created, closed };
    });
  }, [rootTasks, period, lang]);

  if (tasks.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4 opacity-30">📊</div>
        <p className="text-gray-400 text-lg font-medium">{t('analyticsNoTasks')}</p>
        <p className="text-gray-600 text-sm mt-2">{lang === 'ru' ? 'Создайте задачи чтобы видеть аналитику' : 'Create tasks to see analytics'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Хедер вкладки — единый стиль с Tasks/Notes/Members ─────────── */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">{t('analytics')}</h2>
          {/* Переключатель периода */}
          <div className="flex gap-1 bg-gray-700/40 rounded-xl p-1 border border-gray-600/30">
            {(['7', '30', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all btn-modern hover-lift ${
                  period === p
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {p === '7' ? t('analyticsPeriod7') : p === '30' ? t('analyticsPeriod30') : t('analyticsPeriodAll')}
              </button>
            ))}
          </div>
        </div>
        {/* Вкладки разделов */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'overview', label: t('analyticsTabOverview'), icon: '📊' },
            { key: 'members', label: t('analyticsTabMembers'), icon: '👥' },
            { key: 'activity', label: t('analyticsTabActivity'), icon: '📈' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setAnalyticsTab(tab.key)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold transition-all hover-lift btn-modern text-sm sm:text-base whitespace-nowrap flex items-center gap-2 ${
                analyticsTab === tab.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Контент аналитики (перемонтируется при смене периода/вкладки) ─ */}
      <div key={`${period}-${analyticsTab}`} className="space-y-6 analytics-period-enter">

      {/* ══════════════════════ ОБЗОР ════════════════════════════════════ */}
      {analyticsTab === 'overview' && <>

      {/* ── Карточки-метрики (4 штуки) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 card-hover stagger-item flex flex-col items-center gap-2">
          <div className="relative">
            <RadialProgress value={metrics.completionRate} color="#6366f1" trackColor={isLight ? 'rgba(0,0,0,0.08)' : undefined} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm rotate-0">
              {metrics.completionRate}%
            </span>
          </div>
          <p className="text-gray-400 text-xs text-center font-medium">{t('analyticsCompletionRate')}</p>
          <p className="text-white font-bold text-lg">{metrics.done.length}<span className="text-gray-500 text-sm font-normal">/{metrics.total}</span></p>
        </div>

        {/* On Time Rate */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 card-hover stagger-item flex flex-col items-center gap-2">
          <div className="relative">
            <RadialProgress value={metrics.onTimeRate} color="#22c55e" trackColor={isLight ? 'rgba(0,0,0,0.08)' : undefined} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
              {metrics.onTimeRate}%
            </span>
          </div>
          <p className="text-gray-400 text-xs text-center font-medium">{t('analyticsOnTime')}</p>
          <p className="text-white font-bold text-lg">{metrics.doneOnTime.length}<span className="text-gray-500 text-sm font-normal">/{metrics.done.length}</span></p>
        </div>

        {/* Overdue Rate */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 card-hover stagger-item flex flex-col items-center gap-2">
          <div className="relative">
            <RadialProgress value={metrics.overdueRate} color="#ef4444" trackColor={isLight ? 'rgba(0,0,0,0.08)' : undefined} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
              {metrics.overdueRate}%
            </span>
          </div>
          <p className="text-gray-400 text-xs text-center font-medium">{t('analyticsOverdueRate')}</p>
          <p className="text-white font-bold text-lg">{metrics.overdue.length}<span className="text-gray-500 text-sm font-normal"> {lang === 'ru' ? 'акт.' : 'act.'}</span></p>
        </div>

        {/* Avg Time */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 card-hover stagger-item flex flex-col items-center justify-center gap-2">
          <div className="text-4xl font-black text-white tracking-tight">
            {formatAvgTime(metrics.avgTimeMs, lang)}
          </div>
          <p className="text-gray-400 text-xs text-center font-medium">{t('analyticsAvgTime')}</p>
          <div className="flex gap-2 mt-1 flex-wrap justify-center">
            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">{metrics.done.length} {t('analyticsTasksDone')}</span>
            <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">{metrics.overdue.length} {t('analyticsTasksOverdue')}</span>
          </div>
        </div>
      </div>

      {/* ── Статус-блок + Приоритеты ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Статусы */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            {lang === 'ru' ? 'Статусы задач' : 'Task Statuses'}
          </h3>
          <div className="space-y-4">
            {[
              { label: t('analyticsTasksDone'), count: metrics.done.length, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
              { label: t('analyticsTasksInProgress'), count: metrics.inProgress.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
              { label: t('analyticsTasksTodo'), count: metrics.todo.length, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
              { label: t('analyticsTasksOverdue'), count: metrics.overdue.length, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-gray-300 text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: item.bg, color: item.color }}>
                      {metrics.total > 0 ? Math.round(item.count / metrics.total * 100) : 0}%
                    </span>
                    <span className="text-white font-bold text-sm w-6 text-right">{item.count}</span>
                  </div>
                </div>
                <ProgressBar value={metrics.total > 0 ? item.count / metrics.total * 100 : 0} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Приоритеты */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            {t('analyticsPriorityBreakdown')}
          </h3>
          <div className="space-y-4">
            {priorityStats.map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${item.bg}`} />
                    <span className="text-gray-300 text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{item.pct}%</span>
                    <span className="text-white font-bold text-sm w-6 text-right">{item.count}</span>
                  </div>
                </div>
                <ProgressBar value={item.pct} color={item.color} />
              </div>
            ))}
            {/* Задачи с/без дедлайна */}
            <div className="pt-4 border-t border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{periodTasks.filter(t => t.due_date).length}</p>
                  <p className="text-gray-500 text-xs">{t('analyticsTasksWithDeadline')}</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{periodTasks.filter(t => !t.due_date).length}</p>
                  <p className="text-gray-500 text-xs">{t('analyticsNoDeadline')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">{lang === 'ru' ? 'Всего' : 'Total'}</p>
                <p className="text-white font-bold text-2xl">{metrics.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Задачи в опасности ───────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <span className="text-red-400 text-lg">⚠️</span>
          {t('analyticsAtRisk')}
          {atRiskTasks.length > 0 && (
            <span className="ml-1 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
              {atRiskTasks.length}
            </span>
          )}
        </h3>
        <p className="text-gray-500 text-xs mb-5">{t('analyticsAtRiskDesc')}</p>

        {atRiskTasks.length === 0 ? (
          <div className="flex items-center gap-3 text-green-400 bg-green-500/10 rounded-xl px-4 py-3 border border-green-500/20">
            <span className="text-xl">✅</span>
            <span className="text-sm font-medium">{t('analyticsNoAtRisk')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {atRiskTasks.map((task, idx) => {
              const dueMs = new Date(task.due_date!).getTime();
              const diffH = Math.round((dueMs - now) / 3600000);
              const isOverdue = diffH < 0;
              const label = isOverdue
                ? (lang === 'ru' ? `Просрочено на ${Math.abs(diffH)}ч` : `Overdue by ${Math.abs(diffH)}h`)
                : diffH < 1
                  ? (lang === 'ru' ? 'Менее часа!' : 'Less than 1h!')
                  : (lang === 'ru' ? `Через ${diffH}ч` : `In ${diffH}h`);
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-xl border stagger-item card-hover ${
                    isOverdue ? 'task-bg-red' : 'task-bg-orange'
                  }`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{task.title}</p>
                      <p className="text-gray-400 text-xs">
                        {task.status === 'in_progress'
                          ? (lang === 'ru' ? 'В работе' : 'In Progress')
                          : task.status === 'done'
                          ? (lang === 'ru' ? 'Выполнено' : 'Done')
                          : (lang === 'ru' ? 'Ожидает' : 'To Do')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ml-3 ${
                    isOverdue ? 'bg-red-500/25 text-red-300' : 'bg-orange-500/25 text-orange-300'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </> /* конец overview */}

      {/* ══════════════════════ УЧАСТНИКИ ════════════════════════════════ */}
      {analyticsTab === 'members' && <>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Нагрузка участников ──────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          {t('analyticsWorkloadTitle')}
        </h3>
        <div className="space-y-3">
          {workload.map((member, idx) => {
            const maxActive = Math.max(...workload.map(m => m.activeCount), 1);
            const pct = Math.round((member.activeCount / maxActive) * 100);
            const isOverloaded = member.activeCount >= 5;
            const isFree = member.activeCount === 0;
            const isMe = member.user_id === currentUserId;
            return (
              <div
                key={member.user_id}
                className="task-bg-gray border rounded-xl p-4 stagger-item card-hover"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* Аватар */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md ${
                    isOverloaded ? 'bg-gradient-to-br from-red-500 to-red-700'
                    : isFree ? 'bg-gradient-to-br from-green-500 to-emerald-700'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    {member.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{member.username}</span>
                      {isMe && <span className="text-xs text-indigo-400 font-medium">(you)</span>}
                      {isOverloaded && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                          {t('analyticsWorkloadOverloaded')}
                        </span>
                      )}
                      {isFree && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                          {t('analyticsWorkloadFree')}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs capitalize">{member.role}</p>
                  </div>
                  {/* Счётчики */}
                  <div className="flex items-center gap-3 text-right flex-shrink-0">
                    <div className="text-center">
                      <p className="text-white font-bold text-base leading-none">{member.activeCount}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{t('analyticsWorkloadActive')}</p>
                    </div>
                    {member.doneCount > 0 && (
                      <div className="text-center">
                        <p className="text-green-400 font-bold text-base leading-none">{member.doneCount}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{t('analyticsTasksDone')}</p>
                      </div>
                    )}
                    {member.overdueCount > 0 && (
                      <div className="text-center">
                        <p className="text-red-400 font-bold text-base leading-none">{member.overdueCount}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{t('analyticsTasksOverdue')}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Прогресс нагрузки */}
                <ProgressBar
                  value={pct}
                  color={isOverloaded ? '#ef4444' : isFree ? '#22c55e' : '#6366f1'}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Рейтинг надёжности ───────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          {t('analyticsReliability')}
        </h3>
        <p className="text-gray-500 text-xs mb-5">{t('analyticsReliabilityDesc')}</p>
        {reliabilityRanking.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">{t('analyticsNoReliabilityData')}</p>
        ) : (
          <div className="space-y-3">
            {reliabilityRanking.map((member, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
              const barColor = (member.rate ?? 0) >= 80 ? '#22c55e' : (member.rate ?? 0) >= 50 ? '#f59e0b' : '#ef4444';
              const rateColor = (member.rate ?? 0) >= 80 ? 'text-green-400' : (member.rate ?? 0) >= 50 ? 'text-yellow-400' : 'text-red-400';
              return (
                <div key={member.user_id} className="task-bg-gray border card-hover stagger-item p-4 rounded-xl" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg w-7 text-center flex-shrink-0">{medal}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm truncate">{member.username}</span>
                        <span className={`font-bold text-sm flex-shrink-0 ml-2 ${rateColor}`}>{member.rate}%</span>
                      </div>
                      <ProgressBar value={member.rate ?? 0} color={barColor} />
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs ml-10">
                    {member.onTime} {t('analyticsOnTimeOf')} {member.done} {lang === 'ru' ? 'выполненных' : 'completed'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>{/* конец grid members */}

      </> /* конец members */}

      {/* ══════════════════════ АКТИВНОСТЬ ═══════════════════════════════ */}
      {analyticsTab === 'activity' && <>

      {/* ── Последняя активность ─────────────────────────────────────────── */}
      {recentDone.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {t('analyticsRecentActivity')}
          </h3>
          <div className="space-y-2">
            {recentDone.map((task, idx) => {
              const isLate = task.completed_at && task.due_date &&
                new Date(task.completed_at).getTime() > new Date(task.due_date).getTime();
              const completedDate = task.completed_at
                ? new Date(task.completed_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-4 rounded-xl task-bg-gray border card-hover stagger-item"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    isLate ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {isLate ? '⚡' : '✓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{task.title}</p>
                    <p className="text-gray-500 text-xs">{completedDate}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                    isLate ? 'bg-orange-500/15 text-orange-400' : 'bg-green-500/15 text-green-400'
                  }`}>
                    {isLate ? t('analyticsCompletedLate') : t('analyticsCompletedOn')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Тепловая карта активности ─────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          {t('analyticsHeatmap')}
        </h3>
        <p className="text-gray-500 text-xs mb-5">
          {t('analyticsHeatmapDesc')} · {period === '7' ? (lang === 'ru' ? '2 недели' : '2 weeks') : period === '30' ? (lang === 'ru' ? '5 недель' : '5 weeks') : (lang === 'ru' ? '16 недель' : '16 weeks')}
        </p>
        <div className="overflow-x-auto dark-scrollbar">
          <div className="flex gap-1 min-w-max">
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell, di) => {
                  const bg = cell.count === 0
                    ? (isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)')
                    : cell.count <= 2
                      ? 'rgba(99,102,241,0.35)'
                      : cell.count <= 4
                        ? 'rgba(99,102,241,0.65)'
                        : '#6366f1';
                  const dateStr = cell.date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <div
                      key={di}
                      title={`${dateStr}: ${cell.count} ${lang === 'ru' ? 'задач' : 'tasks'}`}
                      className="w-3 h-3 rounded-sm transition-all duration-300 hover:scale-125 cursor-default"
                      style={{ background: bg }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Легенда */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-gray-600 text-xs">{lang === 'ru' ? 'Меньше' : 'Less'}</span>
          {[0, 1, 3, 5].map((v, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{
              background: v === 0
                ? (isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)')
                : v === 1 ? 'rgba(99,102,241,0.35)'
                : v === 3 ? 'rgba(99,102,241,0.65)'
                : '#6366f1'
            }} />
          ))}
          <span className="text-gray-600 text-xs">{lang === 'ru' ? 'Больше' : 'More'}</span>
        </div>
      </div>

      {/* ── Velocity Chart ────────────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50 stagger-item">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            {t('analyticsVelocity')}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="text-gray-600">{period === '7' ? (lang === 'ru' ? '7 дней' : '7 days') : period === '30' ? (lang === 'ru' ? '4 недели' : '4 weeks') : (lang === 'ru' ? '8 недель' : '8 weeks')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/70 inline-block" />{t('analyticsVelocityCreated')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500/70 inline-block" />{t('analyticsVelocityClosed')}</span>
          </div>
        </div>
        {(() => {
          const maxVal = Math.max(...velocityData.flatMap(w => [w.created, w.closed]), 1);
          const chartH = 120;
          const barW = 16;
          const gap = 6;
          const colW = barW * 2 + gap + 20;
          const paddingX = 24;
          const totalW = velocityData.length * colW + paddingX;
          return (
            <div className="overflow-x-auto dark-scrollbar">
              <svg width={totalW} height={chartH + 36} className="overflow-visible">
                {/* Горизонтальные линии сетки */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                  <line
                    key={pct}
                    x1={0} y1={chartH * (1 - pct)}
                    x2={totalW} y2={chartH * (1 - pct)}
                    stroke={isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'} strokeWidth={1}
                  />
                ))}
                {velocityData.map((week, wi) => {
                  const x = paddingX / 2 + wi * colW;
                  const createdH = maxVal > 0 ? Math.max((week.created / maxVal) * chartH, week.created > 0 ? 4 : 0) : 0;
                  const closedH = maxVal > 0 ? Math.max((week.closed / maxVal) * chartH, week.closed > 0 ? 4 : 0) : 0;
                  return (
                    <g key={wi}>
                      {/* Столбик created */}
                      <rect
                        x={x} y={chartH - createdH}
                        width={barW} height={createdH}
                        rx={3} fill="rgba(59,130,246,0.65)"
                        className="transition-all duration-500"
                      >
                        {week.created > 0 && <title>{t('analyticsVelocityCreated')}: {week.created}</title>}
                      </rect>
                      {/* Столбик closed */}
                      <rect
                        x={x + barW + gap} y={chartH - closedH}
                        width={barW} height={closedH}
                        rx={3} fill="rgba(34,197,94,0.65)"
                        className="transition-all duration-500"
                      >
                        {week.closed > 0 && <title>{t('analyticsVelocityClosed')}: {week.closed}</title>}
                      </rect>
                      {/* Подпись недели */}
                      <text
                        x={x + barW} y={chartH + 18}
                        textAnchor="middle" fontSize={10}
                        fill={isLight ? 'rgba(71,85,105,0.9)' : 'rgba(156,163,175,0.8)'}
                      >
                        {week.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          );
        })()}
      </div>

      </> /* конец activity */}

      </div>{/* конец analytics-period-enter */}

    </div>
  );
}
