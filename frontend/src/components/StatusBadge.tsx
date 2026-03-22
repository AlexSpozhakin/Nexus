import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../i18n/translations';

type Status = 'todo' | 'in_progress' | 'done' | 'cancelled';

interface StatusBadgeProps {
  status: Status;
  onChange?: (status: Status) => void;
  disabled?: boolean;
  disabledTitle?: string;
}

const statusConfig = {
  todo: {
    label: 'Todo',
    icon: '○',
    bgColor: 'bg-gray-500/20',
    hoverBgColor: 'hover:bg-gray-500/30',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-300',
    dotColor: 'bg-gray-500',
  },
  in_progress: {
    label: 'In Progress',
    icon: '◐',
    bgColor: 'bg-blue-500/20',
    hoverBgColor: 'hover:bg-blue-500/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-300',
    dotColor: 'bg-blue-500',
  },
  done: {
    label: 'Done',
    icon: '✓',
    bgColor: 'bg-green-500/20',
    hoverBgColor: 'hover:bg-green-500/30',
    borderColor: 'border-green-500',
    textColor: 'text-green-300',
    dotColor: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: '✕',
    bgColor: 'bg-gray-600/20',
    hoverBgColor: 'hover:bg-gray-600/30',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-400',
    dotColor: 'bg-gray-600',
  },
};

export default function StatusBadge({ status, onChange, disabled = false, disabledTitle }: StatusBadgeProps) {
  const { t } = useTranslation();
  const statusLabels: Record<Status, string> = {
    todo: t('todo'),
    in_progress: t('inProgress'),
    done: t('done'),
    cancelled: t('cancelled'),
  };
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUp: false });
  const config = statusConfig[status];

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownH = 120; // примерная высота дропдауна (3 пункта)
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
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
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

  const handleStatusChange = (newStatus: Status) => {
    if (onChange && !disabled) {
      onChange(newStatus);
    }
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border whitespace-nowrap ${config.bgColor} ${config.borderColor} ${config.textColor} text-xs font-medium cursor-not-allowed opacity-70`}
        title={disabledTitle || 'Status is automatically managed based on subtasks'}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
        {statusLabels[status]}
      </div>
    );
  }

  const dropdownContent = isOpen ? (
    <>
      {/* Backdrop - блокирует клики на элементы под меню */}
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      />

      {/* Dropdown меню */}
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
        {(['todo', 'in_progress', 'done'] as Status[]).map((statusKey) => {
          const statusItem = statusConfig[statusKey];
          const isActive = statusKey === status;

          return (
            <button
              key={statusKey}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(statusKey);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-all hover-lift ${
                isActive
                  ? `${statusItem.bgColor} ${statusItem.textColor}`
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusItem.dotColor}`} />
              <span className="flex-1">{statusLabels[statusKey]}</span>
              {isActive && (
                <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
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
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border whitespace-nowrap ${config.bgColor} ${config.hoverBgColor} ${config.borderColor} ${config.textColor} text-xs font-semibold transition-all duration-200 cursor-pointer hover-lift shadow-sm hover:shadow-md`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
        {statusLabels[status]}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Рендерим dropdown через Portal напрямую в body */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
