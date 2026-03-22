import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { labelsAPI } from '../services/api';
import LabelBadge from './LabelBadge';

export interface Label {
  id: string;
  team_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#8b5cf6', '#f97316',
  '#84cc16', '#14b8a6',
];

interface LabelManagerProps {
  taskId: string;
  teamId: string;
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  readonly?: boolean;
}

export default function LabelManager({ taskId, teamId, labels, onLabelsChange, readonly }: LabelManagerProps) {
  const [teamLabels, setTeamLabels] = useState<Label[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 350;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      setDropdownPos({
        top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: 224,
        openUpward,
      });
    }
  };

  useEffect(() => {
    if (open) {
      labelsAPI.getByTeam(teamId).then(r => setTeamLabels(r.data));
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      const blockScroll = (e: WheelEvent) => {
        const list = listRef.current;
        if (list && list.contains(e.target as Node)) {
          const atTop = list.scrollTop === 0 && e.deltaY < 0;
          const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight && e.deltaY > 0;
          if (!atTop && !atBottom) return;
        } else if (!dropdownRef.current?.contains(e.target as Node)) {
          return; // вне дропдауна — не трогаем
        }
        e.preventDefault();
      };
      document.body.addEventListener('wheel', blockScroll, { passive: false });
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        document.body.removeEventListener('wheel', blockScroll);
      };
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, teamId]);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const listRefCallback = React.useCallback((el: HTMLDivElement | null) => {
    listRef.current = el;
  }, []);

  const dropdownRefCallback = React.useCallback((el: HTMLDivElement | null) => {
    (dropdownRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, []);

  const isAttached = (labelId: string) => labels.some(l => l.id === labelId);

  const toggle = async (label: Label) => {
    if (loading) return;
    setLoading(true);
    try {
      if (isAttached(label.id)) {
        await labelsAPI.removeFromTask(taskId, label.id);
        onLabelsChange(labels.filter(l => l.id !== label.id));
      } else {
        await labelsAPI.addToTask(taskId, label.id);
        onLabelsChange([...labels, label]);
      }
    } finally {
      setLoading(false);
    }
  };

  const createLabel = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);
    try {
      const res = await labelsAPI.create(teamId, { name: newName.trim(), color: newColor });
      const created: Label = res.data;
      setTeamLabels(prev => [...prev, created]);
      await labelsAPI.addToTask(taskId, created.id);
      onLabelsChange([...labels, created]);
      setNewName('');
      setCreating(false);
    } catch {
      // name already exists etc.
    } finally {
      setLoading(false);
    }
  };

  const deleteTeamLabel = async (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await labelsAPI.delete(labelId);
      setTeamLabels(prev => prev.filter(l => l.id !== labelId));
      onLabelsChange(labels.filter(l => l.id !== labelId));
    } finally {
      setLoading(false);
    }
  };

  const dropdown = open ? createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false); }} />
      <div
        ref={dropdownRefCallback}
        style={{
          position: 'fixed',
          top: `${dropdownPos.top}px`,
          left: `${dropdownPos.left}px`,
          width: `${dropdownPos.width}px`,
          zIndex: 50,
        }}
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-gray-400 text-xs font-medium px-2 py-1 mb-1">Метки команды</p>

        {teamLabels.length === 0 && !creating && (
          <p className="text-gray-500 text-xs px-2 py-2">Нет меток. Создайте первую!</p>
        )}

        <div
          ref={listRefCallback}
          className="max-h-48 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {teamLabels.map(label => (
            <div
              key={label.id}
              onClick={() => toggle(label)}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-all group"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-sm text-gray-200">{label.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {isAttached(label.id) && (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <button
                  onClick={(e) => deleteTeamLabel(label.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs leading-none"
                  title="Удалить метку"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 mt-1 pt-1">
          {creating ? (
            <div className="px-1 py-1 space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createLabel(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="Название метки..."
                className="w-full bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none border border-gray-600 focus:border-indigo-500 transition-colors"
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={createLabel}
                  disabled={!newName.trim() || loading}
                  className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-all font-medium"
                >
                  Создать
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Создать метку
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {labels.map(label => (
        <LabelBadge
          key={label.id}
          label={label}
          onRemove={readonly ? undefined : () => toggle(label)}
        />
      ))}
      {!readonly && (
        <button
          ref={buttonRef}
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/60 text-gray-400 hover:bg-gray-600/60 hover:text-gray-200 border border-gray-600/40 transition-all hover-lift"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Метка
        </button>
      )}
      {dropdown}
    </div>
  );
}
