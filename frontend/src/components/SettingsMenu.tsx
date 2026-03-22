import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/store';
import { useTranslation } from '../i18n/translations';
import api from '../services/api';

interface StatsData {
  completed: number;
  overdue: number;
  in_progress: number;
  todo: number;
  total: number;
  completion_rate: number;
}

type Section = 'language' | 'theme' | 'notifications' | 'profile' | 'statistics';

export default function SettingsMenu() {
  const { settings, setLanguage, setTheme, setNotificationSettings, user, setUser } = useStore();
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [statsLoading, setStatsLoading] = useState(false);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Sync username when user changes
  useEffect(() => {
    setUsername(user?.username || '');
  }, [user?.username]);

  // Load stats when section opened
  useEffect(() => {
    if (activeSection === 'statistics') {
      loadStats();
    }
  }, [activeSection, statsPeriod]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get(`/stats?period=${statsPeriod}`);
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (newPassword && newPassword !== confirmPassword) {
      setProfileMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setProfileLoading(true);
    try {
      const payload: { username?: string; password?: string; new_password?: string } = {};
      if (username !== user?.username) payload.username = username;
      if (newPassword) {
        payload.password = password;
        payload.new_password = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setProfileMsg({ type: 'error', text: 'No changes to save' });
        setProfileLoading(false);
        return;
      }
      const res = await api.put('/auth/profile', payload);
      setUser(res.data);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileMsg({ type: 'success', text: t('success') });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || t('error') });
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleSection = (section: Section) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const avatarColors = [
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-yellow-500 to-orange-600',
  ];
  const avatarColor = avatarColors[(user?.username?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-base shadow-lg hover:shadow-xl transition-all hover-lift ring-2 ring-white/10 hover:ring-white/30 ${open ? 'ring-white/40 scale-95' : ''}`}
        aria-label="Settings menu"
        title={user?.username}
      >
        {user?.username?.[0]?.toUpperCase() || '?'}
      </button>

      {/* Sliding Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 glass-strong rounded-2xl shadow-2xl border border-white/10 animate-fade-in-scale z-50 overflow-hidden">
          {/* User Header */}
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="text-white font-semibold">{user?.username}</div>
                <div className="text-gray-400 text-xs">{user?.email}</div>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-1 max-h-[70vh] overflow-y-auto dark-scrollbar">
            {/* Language */}
            <SectionButton
              icon="🌐"
              label={t('language')}
              active={activeSection === 'language'}
              onClick={() => toggleSection('language')}
            />
            {activeSection === 'language' && (
              <div className="mx-2 mb-2 p-3 glass rounded-xl animate-fade-in-scale">
                <div className="flex gap-2">
                  <LangButton active={lang === 'en'} onClick={() => setLanguage('en')} label="EN English" />
                  <LangButton active={lang === 'ru'} onClick={() => setLanguage('ru')} label="RU Русский" />
                </div>
              </div>
            )}

            {/* Theme */}
            <SectionButton
              icon="🎨"
              label={t('theme')}
              active={activeSection === 'theme'}
              onClick={() => toggleSection('theme')}
            />
            {activeSection === 'theme' && (
              <div className="mx-2 mb-2 p-3 glass rounded-xl animate-fade-in-scale">
                <div className="flex gap-2">
                  <ThemeButton
                    active={settings.theme === 'dark'}
                    onClick={() => setTheme('dark')}
                    icon="🌙"
                    label={t('darkTheme')}
                  />
                  <ThemeButton
                    active={settings.theme === 'light'}
                    onClick={() => setTheme('light')}
                    icon="☀️"
                    label={t('lightTheme')}
                  />
                </div>
              </div>
            )}

            {/* Notifications */}
            <SectionButton
              icon="🔔"
              label={t('notifications')}
              active={activeSection === 'notifications'}
              onClick={() => toggleSection('notifications')}
            />
            {activeSection === 'notifications' && (
              <div className="mx-2 mb-2 p-3 glass rounded-xl animate-fade-in-scale space-y-2">
                <Toggle
                  label={t('soundEnabled')}
                  icon="🔊"
                  checked={settings.notifications.soundEnabled}
                  onChange={v => setNotificationSettings({ soundEnabled: v })}
                />
                <Toggle
                  label={t('newCommentNotif')}
                  icon="💬"
                  checked={settings.notifications.newComment}
                  onChange={v => setNotificationSettings({ newComment: v })}
                />
                <Toggle
                  label={t('taskAssignedNotif')}
                  icon="📋"
                  checked={settings.notifications.taskAssigned}
                  onChange={v => setNotificationSettings({ taskAssigned: v })}
                />
                <Toggle
                  label={t('teamEventsNotif')}
                  icon="👥"
                  checked={settings.notifications.teamEvents}
                  onChange={v => setNotificationSettings({ teamEvents: v })}
                />
                <Toggle
                  label={t('taskOverdueNotif')}
                  icon="⏰"
                  checked={settings.notifications.taskOverdue}
                  onChange={v => setNotificationSettings({ taskOverdue: v })}
                />
              </div>
            )}

            {/* Profile */}
            <SectionButton
              icon="👤"
              label={t('profile')}
              active={activeSection === 'profile'}
              onClick={() => toggleSection('profile')}
            />
            {activeSection === 'profile' && (
              <div className="mx-2 mb-2 p-3 glass rounded-xl animate-fade-in-scale space-y-2">
                {profileMsg && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${profileMsg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {profileMsg.text}
                  </div>
                )}
                <label className="text-xs text-gray-400">{t('username')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-gray-700/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern border border-gray-600/50"
                />
                <label className="text-xs text-gray-400">{t('password')} (current)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-gray-700/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern border border-gray-600/50"
                />
                <label className="text-xs text-gray-400">{t('newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-gray-700/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern border border-gray-600/50"
                />
                <label className="text-xs text-gray-400">{t('confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-gray-700/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-modern border border-gray-600/50"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="w-full mt-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm py-2 rounded-lg transition-all btn-modern hover-lift disabled:opacity-50 font-medium"
                >
                  {profileLoading ? t('loading') : t('saveChanges')}
                </button>
              </div>
            )}

            {/* Statistics */}
            <SectionButton
              icon="📊"
              label={t('statistics')}
              active={activeSection === 'statistics'}
              onClick={() => toggleSection('statistics')}
            />
            {activeSection === 'statistics' && (
              <div className="mx-2 mb-2 p-3 glass rounded-xl animate-fade-in-scale">
                {/* Period selector */}
                <div className="flex gap-1 mb-3">
                  {(['week', 'month', 'all'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-all font-medium ${statsPeriod === p ? 'bg-indigo-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'}`}
                    >
                      {p === 'week' ? t('thisWeek') : p === 'month' ? t('thisMonth') : t('allTime')}
                    </button>
                  ))}
                </div>

                {statsLoading ? (
                  <div className="text-center text-gray-400 text-sm py-4">{t('loading')}</div>
                ) : stats ? (
                  <div className="space-y-2">
                    {/* Completion Rate */}
                    <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-3 border border-indigo-500/20">
                      <div className="text-xs text-gray-400 mb-1">{t('completionRate')}</div>
                      <div className="text-2xl font-bold text-white">{stats.completion_rate}%</div>
                      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                          style={{ width: `${stats.completion_rate}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label={t('totalTasks')} value={stats.total} color="text-white" bg="bg-gray-700/50" />
                      <StatCard label={t('tasksCompleted')} value={stats.completed} color="text-green-400" bg="bg-green-500/10" />
                      <StatCard label={t('tasksInProgress')} value={stats.in_progress} color="text-blue-400" bg="bg-blue-500/10" />
                      <StatCard label={t('tasksTodo')} value={stats.todo} color="text-gray-400" bg="bg-gray-500/10" />
                    </div>

                    {stats.overdue > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-xs text-red-400">{t('tasksOverdue')}</span>
                        <span className="text-lg font-bold text-red-400">{stats.overdue}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">{t('error')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper sub-components

function SectionButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'bg-indigo-600/30 text-white border border-indigo-500/30' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-base">{icon}</span>
        {label}
      </span>
      <span className={`text-gray-500 transition-transform duration-200 ${active ? 'rotate-180' : ''}`}>▾</span>
    </button>
  );
}

function Toggle({ icon, label, checked, onChange }: { icon: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-300 flex items-center gap-2">
        <span>{icon}</span>{label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${checked ? 'bg-indigo-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function LangButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'}`}
    >
      {label}
    </button>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'}`}
    >
      <span>{icon}</span>{label}
    </button>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 border border-white/5`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
