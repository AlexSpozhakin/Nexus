import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../i18n/translations';

type Role = 'owner' | 'admin' | 'member';

interface RoleBadgeProps {
  role: Role;
  onChange?: (role: 'admin' | 'member') => void;
  disabled?: boolean;
}

const roleConfig = {
  owner: {
    icon: '👑',
    bgColor: 'bg-purple-500/20',
    hoverBgColor: 'hover:bg-purple-500/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-300',
    dotColor: 'bg-purple-500',
  },
  admin: {
    icon: '🛡️',
    bgColor: 'bg-blue-500/20',
    hoverBgColor: 'hover:bg-blue-500/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-300',
    dotColor: 'bg-blue-500',
  },
  member: {
    icon: '👤',
    bgColor: 'bg-gray-500/20',
    hoverBgColor: 'hover:bg-gray-500/30',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-300',
    dotColor: 'bg-gray-500',
  },
};

export default function RoleBadge({ role, onChange, disabled = false }: RoleBadgeProps) {
  const { t } = useTranslation();
  const roleLabels: Record<Role, string> = {
    owner: t('owner'),
    admin: t('admin'),
    member: t('member'),
  };

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUp: false });
  const config = roleConfig[role];

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownH = 88; // 2 пункта
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownH + 8;
      setDropdownPosition({
        top: openUp ? rect.top - dropdownH - 4 : rect.bottom + 4,
        left: rect.left,
        openUp,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleRoleChange = (newRole: 'admin' | 'member') => {
    if (onChange && !disabled) onChange(newRole);
    setIsOpen(false);
  };

  // Статичный бейдж (owner или если нет права менять)
  if (disabled) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor} ${config.textColor} text-xs font-medium`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        {roleLabels[role]}
      </div>
    );
  }

  const dropdownContent = isOpen ? (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: '10rem',
        }}
        className="glass-strong border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(['admin', 'member'] as const).map((roleKey) => {
          const item = roleConfig[roleKey];
          const isActive = roleKey === role;
          return (
            <button
              key={roleKey}
              onClick={(e) => { e.stopPropagation(); handleRoleChange(roleKey); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-all hover-lift ${
                isActive
                  ? `${item.bgColor} ${item.textColor}`
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
              <span className="flex-1">{roleLabels[roleKey]}</span>
              {isActive && (
                <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.hoverBgColor} ${config.borderColor} ${config.textColor} text-xs font-semibold transition-all duration-200 cursor-pointer hover-lift shadow-sm hover:shadow-md`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
        {roleLabels[role]}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
