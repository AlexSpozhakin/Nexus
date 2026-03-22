import { useEffect, useState } from 'react';
import { milestonesAPI } from '../services/api';
import { formatDeadline } from '../utils/dateFormatter';
import { useTranslation } from '../i18n/translations';

interface Milestone {
  id: string;
  team_id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
}

interface Props {
  teamId: string;
  onUpdate: () => void;
}

export default function MilestoneCard({ teamId, onUpdate }: Props) {
  const { t, lang } = useTranslation();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = async () => {
    try {
      const res = await milestonesAPI.getActive(teamId);
      setMilestone(res.data || null);
    } catch {
      setMilestone(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [teamId]);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDate) return;
    setFormLoading(true);
    try {
      await milestonesAPI.create(teamId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        due_date: new Date(formDate).toISOString(),
      });
      setShowForm(false);
      setFormTitle('');
      setFormDesc('');
      setFormDate('');
      await load();
      onUpdate();
    } catch {
      // keep form open on error
    } finally {
      setFormLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!milestone) return;
    setCompleting(true);
    try {
      await milestonesAPI.complete(teamId, milestone.id);
      setMilestone(null);
      onUpdate();
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return null;

  const progress =
    milestone && milestone.total_tasks > 0
      ? Math.round((milestone.completed_tasks / milestone.total_tasks) * 100)
      : milestone ? 0 : 0;

  const deadline = milestone ? formatDeadline(milestone.due_date, lang) : null;

  // Color scheme based on progress / deadline urgency
  const isUrgent = deadline && (deadline.className.includes('red') || deadline.className.includes('orange'));
  const borderColor = isUrgent ? 'border-red-500/30' : 'border-gray-700/50';
  const barFrom = isUrgent ? 'from-orange-500' : 'from-indigo-500';
  const barTo = isUrgent ? 'to-red-500' : 'to-blue-500';

  return (
    <div className="mb-6 animate-fade-in-scale">
      {milestone ? (
        <div className={`rounded-xl bg-gray-800 border ${borderColor} p-5 transition-all`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H10.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
                  {t('milestoneNew').replace('New ', '').replace('Новая ', '')}
                </div>
                <h3 className="text-white font-semibold text-base truncate leading-tight">{milestone.title}</h3>
                {milestone.description && (
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{milestone.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all hover-lift shadow-md flex items-center gap-1.5"
            >
              {completing ? (
                <span>{t('milestoneCompleting')}</span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('milestoneComplete')}
                </>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs">
                {milestone.completed_tasks} / {milestone.total_tasks} {t('milestoneTasks')}
              </span>
              <span className="text-indigo-300 text-xs font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${barFrom} ${barTo} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Deadline badge */}
          {deadline && (
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${deadline.className}`}>
              <span>{deadline.icon}</span>
              <span>{deadline.text}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          {showForm ? (
            <div className="rounded-xl bg-gray-800 border border-gray-700/50 p-5 animate-fade-in-scale">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H10.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                {t('milestoneNew')}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('milestoneTitle')}
                  autoFocus
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 input-modern transition-all"
                />
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t('milestoneDesc')}
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 input-modern transition-all"
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">{t('milestoneDeadline')}</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 input-modern transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={formLoading || !formTitle.trim() || !formDate}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all hover-lift btn-modern shadow-md"
                  >
                    {formLoading ? t('milestoneCreating') : t('milestoneCreate')}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-sm px-4 py-2 rounded-xl transition-all border border-gray-600/50"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-2xl border border-dashed border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-900/5 hover:bg-indigo-900/15 text-indigo-400 hover:text-indigo-300 py-3.5 px-4 flex items-center justify-center gap-2.5 text-sm font-medium transition-all group"
            >
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              {t('milestoneSetTeam')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
