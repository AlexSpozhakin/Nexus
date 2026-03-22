import { useState, useEffect, useRef } from 'react';
import { timeAPI } from '../services/api';
import type { TimeEntry } from '../services/api';
import { useTranslation } from '../i18n/translations';

interface TimeTrackerProps {
  taskId: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimeTracker({ taskId }: TimeTrackerProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    timeAPI.getByTask(taskId).then(res => {
      setEntries(res.data.entries || []);
      setTotalSeconds(res.data.total_seconds || 0);
    }).catch(() => {});
  }, [taskId]);

  const startTimer = () => {
    startedAtRef.current = new Date().toISOString();
    setElapsed(0);
    setIsRunning(true);
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopTimer = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    if (elapsed < 1) return;
    setLoading(true);
    try {
      const res = await timeAPI.create(taskId, {
        started_at: startedAtRef.current,
        duration_seconds: elapsed,
        note: note.trim(),
      });
      setEntries(prev => [res.data, ...prev]);
      setTotalSeconds(prev => prev + elapsed);
      setElapsed(0);
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string, seconds: number) => {
    await timeAPI.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setTotalSeconds(prev => prev - seconds);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="space-y-3">
      {/* Инпут заметки (скрыт когда таймер запущен) */}
      {!isRunning && (
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('timeNotePlaceholder')}
          className="w-full bg-gray-700/50 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600/50 focus:border-indigo-500/50 input-modern transition-all placeholder-gray-500"
        />
      )}

      {/* Таймер когда запущен */}
      {isRunning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="font-mono font-bold text-white text-base tracking-widest">{formatTimer(elapsed)}</span>
          {note && <span className="text-xs text-gray-500 truncate ml-1">· {note}</span>}
        </div>
      )}

      {/* Кнопка — стиль как у вложений */}
      <button
        onClick={isRunning ? stopTimer : startTimer}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-medium px-4 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl disabled:cursor-not-allowed text-white text-sm ${
          isRunning
            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-600 disabled:to-gray-700'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700'
        }`}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isRunning ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            {t('timeStop')}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {t('timeStart')}
          </>
        )}
      </button>

      {/* Итого */}
      {totalSeconds > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">{t('timeTotal')}</span>
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            {formatDuration(totalSeconds)}
          </span>
        </div>
      )}

      {/* Список записей */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700/30 transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-indigo-300">{formatDuration(entry.duration_seconds)}</span>
                  <span className="text-xs text-gray-600">· {entry.username}</span>
                  {entry.note && <span className="text-xs text-gray-500 truncate">· {entry.note}</span>}
                </div>
                <p className="text-xs text-gray-700">
                  {new Date(entry.started_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => deleteEntry(entry.id, entry.duration_seconds)}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
