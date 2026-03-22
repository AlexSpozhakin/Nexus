import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/store';

type Role = 'owner' | 'assignee' | 'watcher';

interface Assignee {
  user_id: string;
  role: Role;
}

interface TeamMember {
  user_id: string;
  username: string;
  email: string;
  role: string;
}

interface AssigneeSelectorProps {
  teamMembers: TeamMember[];
  selectedAssignees: Assignee[];
  onChange: (assignees: Assignee[]) => void;
  disabled?: boolean;
}

const roleConfig: Record<Role, { label: string; color: string; bg: string; border: string; dot: string }> = {
  owner:    { label: 'Owner',    color: 'text-purple-300', bg: 'bg-purple-500/20', border: 'border-purple-500/50', dot: 'bg-purple-400' },
  assignee: { label: 'Assignee', color: 'text-indigo-300', bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', dot: 'bg-indigo-400' },
  watcher:  { label: 'Watcher',  color: 'text-gray-400',   bg: 'bg-gray-500/15',   border: 'border-gray-500/40',   dot: 'bg-gray-400' },
};

export default function AssigneeSelector({ teamMembers, selectedAssignees, onChange, disabled = false }: AssigneeSelectorProps) {
  const isLight = useStore(s => s.settings.theme === 'light');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUp: false });

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    setDropdownPosition({
      top: openUp ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 320),
      openUp,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Scroll containment
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        const atTop = el.scrollTop === 0 && e.deltaY < 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight && e.deltaY > 0;
        if (atTop || atBottom) e.preventDefault();
        e.stopPropagation();
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const listRefCallback = React.useCallback((el: HTMLDivElement | null) => { listRef.current = el; }, []);

  const getSelected = (userId: string) => selectedAssignees.find(a => a.user_id === userId);
  const getUserName = (userId: string) => teamMembers.find(m => m.user_id === userId)?.username || '?';

  const handleToggle = (userId: string) => {
    const existing = getSelected(userId);
    if (existing) onChange(selectedAssignees.filter(a => a.user_id !== userId));
    else onChange([...selectedAssignees, { user_id: userId, role: 'assignee' }]);
  };

  const handleChangeRole = (userId: string, role: Role) => {
    onChange(selectedAssignees.map(a => a.user_id === userId ? { ...a, role } : a));
  };

  const filteredMembers = teamMembers.filter(m => {
    const q = searchQuery.toLowerCase();
    return m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const isEveryoneSelected = selectedAssignees.length === teamMembers.length && teamMembers.length > 0;

  if (disabled) {
    return (
      <div className="bg-gray-700/50 rounded-xl px-4 py-2.5 border border-gray-600/50 text-gray-400 text-sm">
        Assignment disabled
      </div>
    );
  }

  const dropdown = isOpen ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 10001, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(1px)' }}
        onClick={e => { e.stopPropagation(); setIsOpen(false); }}
        onMouseDown={e => e.stopPropagation()}
      />

      {/* Panel */}
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 10002,
        }}
        className="animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: isLight ? 'rgba(255,255,255,0.99)' : 'rgba(31,41,55,0.98)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(75,85,99,0.6)',
          }}>

          {/* Header */}
          <div className={`px-4 pt-4 pb-3 border-b ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className={`text-sm font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>Исполнители</span>
                {selectedAssignees.length > 0 && (
                  <span className="text-[11px] bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                    {selectedAssignees.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2.5">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Поиск участников..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all ${isLight ? 'bg-gray-100 text-gray-800 border border-gray-200 placeholder-gray-400 focus:bg-white' : 'bg-white/5 text-white border border-white/8 placeholder-gray-500 focus:bg-white/8'}`}
              />
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onChange(teamMembers.map(m => ({ user_id: m.user_id, role: 'assignee' as Role })))}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover-lift ${isLight ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/20'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Все ({teamMembers.length})
              </button>
              {selectedAssignees.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover-lift ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 border-gray-200' : 'bg-white/5 hover:bg-white/8 text-gray-400 hover:text-gray-200 border-white/8'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Сбросить
                </button>
              )}
            </div>
          </div>

          {/* Members list */}
          <div
            ref={listRefCallback}
            className="overflow-y-auto dark-scrollbar p-2 space-y-0.5"
            style={{ maxHeight: '260px', overscrollBehavior: 'contain' }}
          >
            {filteredMembers.length === 0 ? (
              <div className={`py-8 text-center text-sm ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Участники не найдены</div>
            ) : filteredMembers.map((member, i) => {
              const isSelected = !!getSelected(member.user_id);
              const assignee = getSelected(member.user_id);

              return (
                <div
                  key={member.user_id}
                  className={`rounded-xl overflow-hidden transition-all duration-150 stagger-item ${isSelected ? 'assignee-row selected' : 'assignee-row'}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Member row */}
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onClick={() => handleToggle(member.user_id)}
                  >
                    {/* Custom checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(member.user_id)}
                      onClick={e => e.stopPropagation()}
                      className="assignee-checkbox"
                    />

                    {/* Avatar with gradient based on name */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, hsl(${member.username.charCodeAt(0) * 7 % 360},60%,45%), hsl(${(member.username.charCodeAt(0) * 7 + 60) % 360},70%,35%))`,
                      }}
                    >
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate leading-tight ${isLight ? 'text-gray-800' : 'text-white'}`}>{member.username}</div>
                      <div className={`text-[11px] truncate ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{member.email}</div>
                    </div>

                    {/* Role pill (if selected) */}
                    {isSelected && assignee && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleConfig[assignee.role].bg} ${roleConfig[assignee.role].color} ${roleConfig[assignee.role].border} flex-shrink-0`}>
                        {roleConfig[assignee.role].label}
                      </span>
                    )}
                  </div>

                  {/* Role selector — appears when selected */}
                  {isSelected && assignee && (
                    <div className="px-3 pb-2.5 pl-14">
                      <div className="flex gap-1.5">
                        {(Object.keys(roleConfig) as Role[]).map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={e => { e.stopPropagation(); handleChangeRole(member.user_id, role); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all hover-lift ${
                              assignee.role === role
                                ? `${roleConfig[role].bg} ${roleConfig[role].color} border ${roleConfig[role].border} shadow-sm`
                                : isLight ? 'bg-black/4 text-gray-500 hover:text-gray-800 border border-black/8 hover:bg-black/8' : 'bg-white/4 text-gray-500 hover:text-gray-300 border border-white/6 hover:bg-white/8'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${assignee.role === role ? roleConfig[role].dot : 'bg-gray-600'}`} />
                            {roleConfig[role].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`px-4 py-2.5 border-t flex items-center justify-between ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
            <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
              {selectedAssignees.length === 0
                ? 'Никто не выбран'
                : isEveryoneSelected
                  ? 'Вся команда выбрана'
                  : `Выбрано: ${selectedAssignees.length} из ${teamMembers.length}`}
            </span>
            {selectedAssignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {selectedAssignees.slice(0, 4).map(a => (
                  <div
                    key={a.user_id}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold border ${isLight ? 'border-gray-200' : 'border-gray-800'}`}
                    style={{
                      background: `linear-gradient(135deg, hsl(${getUserName(a.user_id).charCodeAt(0) * 7 % 360},60%,45%), hsl(${(getUserName(a.user_id).charCodeAt(0) * 7 + 60) % 360},70%,35%))`,
                    }}
                    title={getUserName(a.user_id)}
                  >
                    {getUserName(a.user_id).slice(0, 1).toUpperCase()}
                  </div>
                ))}
                {selectedAssignees.length > 4 && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${isLight ? 'border-gray-200 bg-gray-400 text-white' : 'border-gray-800 bg-gray-700 text-gray-300'}`}>
                    +{selectedAssignees.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Trigger button */}
      <div
        ref={buttonRef}
        onClick={e => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`relative rounded-xl px-4 py-2.5 border cursor-pointer transition-all ${
          isOpen
            ? 'border-indigo-500/60 bg-indigo-500/8 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
            : 'border-gray-600/50 bg-gray-700/50 hover:border-indigo-500/40 hover:bg-gray-700/70'
        }`}
      >
        {selectedAssignees.length === 0 ? (
          <div className="flex items-center justify-between text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Выбрать исполнителей...</span>
            </div>
            <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : isEveryoneSelected ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm text-white font-medium">Вся команда ({teamMembers.length})</span>
            </div>
            <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {selectedAssignees.slice(0, 3).map(a => (
                <div key={a.user_id} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-0.5">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] text-white font-bold"
                    style={{ background: `linear-gradient(135deg, hsl(${getUserName(a.user_id).charCodeAt(0) * 7 % 360},60%,45%), hsl(${(getUserName(a.user_id).charCodeAt(0) * 7 + 60) % 360},70%,35%))` }}
                  >
                    {getUserName(a.user_id).slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-xs text-indigo-200 truncate max-w-[80px]">{getUserName(a.user_id)}</span>
                </div>
              ))}
              {selectedAssignees.length > 3 && (
                <span className="text-xs text-gray-400 bg-gray-700/50 border border-gray-600/40 rounded-lg px-2 py-0.5">
                  +{selectedAssignees.length - 3}
                </span>
              )}
            </div>
            <svg className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
}
