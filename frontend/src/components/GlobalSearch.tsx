import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import type { SearchResult } from '../services/api';
import { useTranslation } from '../i18n/translations';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const statusMeta: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  todo:        { label: 'Todo',        dot: '#6b7280', bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
  in_progress: { label: 'In Progress', dot: '#60a5fa', bg: 'bg-blue-500/15',  text: 'text-blue-400',  border: 'border-blue-500/30' },
  done:        { label: 'Done',        dot: '#4ade80', bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
};

const priorityMeta: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  urgent: { label: 'Urgent', icon: '🔴', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30' },
  high:   { label: 'High',   icon: '🟠', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { label: 'Medium', icon: '🟡', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low:    { label: 'Low',    icon: '🟢', bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30' },
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part
  );
}

// Иконка задачи
const TaskIcon = ({ active }: { active: boolean }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

// Иконка заметки
const NoteIcon = ({ active }: { active: boolean }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.8}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// Skeleton строка
const SkeletonRow = ({ delay }: { delay: number }) => (
  <div className="flex items-center gap-3 px-4 py-3 mx-2 mb-1" style={{ animationDelay: `${delay}ms` }}>
    <div className="skeleton w-8 h-8 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-3 rounded-lg w-3/4" />
      <div className="skeleton h-2.5 rounded-lg w-1/2" />
    </div>
    <div className="skeleton h-5 w-14 rounded-full flex-shrink-0" />
  </div>
);

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<SearchResult[]>([]);
  const [notes, setNotes] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [resultsKey, setResultsKey] = useState(0); // для re-trigger анимации
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      setQuery(''); setTasks([]); setNotes([]); setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) { setTasks([]); setNotes([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAPI.search(query);
        setTasks(res.data.tasks || []);
        setNotes(res.data.notes || []);
        setResultsKey(k => k + 1);
        setSelectedIdx(0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const allResults = [
    ...tasks.map(t => ({ ...t, type: 'task' as const })),
    ...notes.map(n => ({ ...n, type: 'note' as const })),
  ];

  const handleSelect = useCallback((item: SearchResult) => {
    if (item.type === 'task') navigate(`/task/${item.id}`);
    else navigate(`/team/${item.team_id}?tab=notes&note=${item.id}`);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => {
          const next = Math.min(i + 1, allResults.length - 1);
          scrollToItem(next);
          return next;
        });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => {
          const prev = Math.max(i - 1, 0);
          scrollToItem(prev);
          return prev;
        });
      }
      if (e.key === 'Enter' && allResults[selectedIdx]) handleSelect(allResults[selectedIdx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, allResults, selectedIdx, handleSelect, onClose]);

  const scrollToItem = (idx: number) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
    item?.scrollIntoView({ block: 'nearest' });
  };

  if (!open) return null;

  let globalIdx = -1;

  const renderItem = (item: SearchResult, type: 'task' | 'note') => {
    globalIdx++;
    const idx = globalIdx;
    const isSelected = selectedIdx === idx;
    const sm = item.status ? statusMeta[item.status] : null;
    const pm = item.priority ? priorityMeta[item.priority] : null;
    const isTask = type === 'task';

    return (
      <div
        key={item.id}
        data-idx={idx}
        onClick={() => handleSelect(item)}
        onMouseEnter={() => setSelectedIdx(idx)}
        style={{ animationDelay: `${idx * 35}ms` }}
        className={`search-item group relative flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-xl cursor-pointer transition-all duration-150 ${
          isSelected
            ? isTask
              ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
              : 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 shadow-lg shadow-amber-500/10'
            : 'border border-transparent hover:bg-white/5 hover:border-white/8'
        }`}
      >
        {/* Левая полоска при выделении */}
        {isSelected && (
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full ${isTask ? 'bg-indigo-400' : 'bg-amber-400'}`} />
        )}

        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          isTask
            ? isSelected
              ? 'bg-indigo-500/30 text-indigo-300 scale-110 shadow-md shadow-indigo-500/20'
              : 'bg-gray-700/60 text-gray-500 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:scale-105'
            : isSelected
              ? 'bg-amber-500/30 text-amber-300 scale-110 shadow-md shadow-amber-500/20'
              : 'bg-gray-700/60 text-gray-500 group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:scale-105'
        }`}>
          {isTask ? <TaskIcon active={isSelected} /> : <NoteIcon active={isSelected} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Заголовок + badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-sm font-medium leading-tight transition-colors duration-150 ${
              isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'
            }`}>
              {highlight(item.title, query)}
            </span>

            {sm && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${sm.bg} ${sm.text} ${sm.border}`}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sm.dot }} />
                {sm.label}
              </span>
            )}
            {pm && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${pm.bg} ${pm.text} ${pm.border}`}>
                {pm.label}
              </span>
            )}
          </div>

          {/* Excerpt + team */}
          <div className="flex items-center gap-2">
            {item.excerpt && (
              <p className={`text-xs truncate transition-colors ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                {highlight(item.excerpt, query)}
              </p>
            )}
            {item.team_name && (
              <span className={`text-[10px] flex-shrink-0 ml-auto px-1.5 py-0.5 rounded-md border transition-colors ${
                isSelected
                  ? 'text-gray-400 bg-gray-700/40 border-gray-600/40'
                  : 'text-gray-600 bg-transparent border-transparent'
              }`}>
                {item.team_name}
              </span>
            )}
          </div>
        </div>

        {/* Enter hint */}
        <kbd className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border font-medium transition-all duration-150 ${
          isSelected
            ? 'opacity-100 text-indigo-300 bg-indigo-500/15 border-indigo-500/40'
            : 'opacity-0 scale-90'
        }`}>
          ↵
        </kbd>
      </div>
    );
  };

  const hasResults = tasks.length > 0 || notes.length > 0;
  const total = tasks.length + notes.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] px-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] flex flex-col gap-2.5 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Карточка 1: Поисковый инпут ── */}
        <div className="rounded-2xl shadow-2xl overflow-hidden bg-gray-700/50 border border-gray-600/50 backdrop-blur-xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:bg-gray-700/70 transition-all duration-200">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {/* Иконка поиска / спиннер */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className={`w-5 h-5 transition-colors ${query.length >= 2 ? 'text-indigo-400' : 'text-gray-500'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base"
            />

            {/* Счётчик результатов */}
            {hasResults && !loading && (
              <span className="text-xs text-gray-500 flex-shrink-0 px-2 py-0.5 bg-gray-700/50 rounded-full border border-gray-600/40">
                {total}
              </span>
            )}

            {/* Очистить */}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/60 transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Esc badge */}
            <kbd className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-700/60 border border-gray-600/50 text-gray-500 font-medium hidden sm:block">
              Esc
            </kbd>
          </div>

          {/* Прогресс-бар при загрузке */}
          {loading && (
            <div className="h-0.5 w-full bg-gray-700/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[gradient-shift_1.2s_ease_infinite] bg-[length:200%_100%]" />
            </div>
          )}
        </div>

        {/* ── Карточка 2: Результаты + Footer ── */}
        <div className="glass-strong rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div
            ref={listRef}
            key={resultsKey}
            className="overflow-y-auto dark-scrollbar"
            style={{ maxHeight: '400px', overscrollBehavior: 'contain' }}
          >
            {/* Пустое состояние — подсказка */}
            {query.length < 2 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {/* Пульс */}
                  <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-gray-300 text-sm font-medium">{t('searchHint')}</p>
                  <p className="text-gray-600 text-xs">Tasks · Notes · Descriptions</p>
                </div>
                {/* Быстрые подсказки */}
                <div className="flex items-center gap-2 flex-wrap justify-center px-4">
                  {['bug', 'review', 'deploy'].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setQuery(hint)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-700/40 border border-gray-600/40 text-gray-500 hover:text-gray-300 hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-150"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skeleton при загрузке (только первый запрос) */}
            {loading && tasks.length === 0 && notes.length === 0 && (
              <div className="pt-2 pb-1">
                {[0, 1, 2].map(i => <SkeletonRow key={i} delay={i * 60} />)}
              </div>
            )}

            {/* Нет результатов */}
            {query.length >= 2 && !hasResults && !loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-700/50 border border-gray-600/30 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-gray-400 text-sm font-medium">
                    {t('searchNoResults')} <span className="text-white">«{query}»</span>
                  </p>
                  <p className="text-gray-600 text-xs">Try different keywords</p>
                </div>
              </div>
            )}

            {/* Группа: Задачи */}
            {tasks.length > 0 && (
              <div className="pt-2.5 pb-1">
                <div className="flex items-center gap-2 px-4 py-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {t('searchTasksGroup')}
                  </span>
                  <div className="flex-1 h-px bg-gray-700/60 ml-1" />
                  <span className="text-[10px] text-gray-600 bg-gray-700/50 px-1.5 py-0.5 rounded-full border border-gray-600/40">
                    {tasks.length}
                  </span>
                </div>
                {tasks.map(item => renderItem(item, 'task'))}
              </div>
            )}

            {/* Разделитель между группами */}
            {tasks.length > 0 && notes.length > 0 && (
              <div className="mx-4 h-px bg-gray-700/50 my-1" />
            )}

            {/* Группа: Заметки */}
            {notes.length > 0 && (
              <div className={`pb-2.5 ${tasks.length === 0 ? 'pt-2.5' : 'pt-1.5'}`}>
                <div className="flex items-center gap-2 px-4 py-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {t('searchNotesGroup')}
                  </span>
                  <div className="flex-1 h-px bg-gray-700/60 ml-1" />
                  <span className="text-[10px] text-gray-600 bg-gray-700/50 px-1.5 py-0.5 rounded-full border border-gray-600/40">
                    {notes.length}
                  </span>
                </div>
                {notes.map(item => renderItem(item, 'note'))}
              </div>
            )}
          </div>

          {/* Footer с хоткеями */}
          <div className="border-t border-white/8 px-4 py-2 flex items-center gap-4 bg-gray-900/30">
            <div className="flex items-center gap-3">
              {[
                { key: '↑↓', label: t('searchNavigate') },
                { key: '↵',  label: t('searchOpen') },
              ].map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <kbd className="bg-gray-700/70 border border-gray-600/60 px-1.5 py-0.5 rounded-md text-gray-400 text-[10px] font-medium">
                    {key}
                  </kbd>
                  {label}
                </span>
              ))}
            </div>

            {/* Тип контента */}
            <div className="flex items-center gap-2 ml-auto">
              {hasResults && (
                <>
                  {tasks.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/70" />
                      Tasks
                    </span>
                  )}
                  {notes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
                      Notes
                    </span>
                  )}
                </>
              )}
              {!hasResults && (
                <span className="text-[10px] text-gray-600 flex items-center gap-1.5">
                  <kbd className="bg-gray-700/70 border border-gray-600/60 px-1.5 py-0.5 rounded-md text-gray-400 text-[10px] font-medium">Esc</kbd>
                  {t('searchClose')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
