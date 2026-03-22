import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import NotificationBell from './NotificationBell';
import SettingsMenu from './SettingsMenu';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface Props {
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  onSearchOpen?: () => void;
}

export default function Header({ breadcrumbs, actions, onSearchOpen }: Props) {
  const navigate = useNavigate();
  const { user } = useStore();

  if (!user) return null;

  return (
    <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer flex-shrink-0 group"
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/logo.png"
            alt="Nexus"
            className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
          />
          <span className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors hidden sm:block">
            Nexus
          </span>
        </div>

        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center min-w-0 flex-1">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs!.length - 1;
              return (
                <span key={i} className="flex items-center min-w-0">
                  {/* Разделитель */}
                  <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mx-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {crumb.path ? (
                    /* Промежуточная ссылка — приглушённая, при наведении чуть светлее */
                    <button
                      onClick={() => navigate(crumb.path!)}
                      className="breadcrumb-link text-sm truncate max-w-[110px] sm:max-w-[180px] px-1 py-0.5 rounded-md transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : isLast ? (
                    /* Текущая страница — pill с акцентом */
                    <span className="breadcrumb-current inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-0.5 rounded-lg truncate max-w-[130px] sm:max-w-[250px] flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 animate-pulse" />
                      <span className="truncate">{crumb.label}</span>
                    </span>
                  ) : (
                    <span className="breadcrumb-link text-sm truncate max-w-[110px] sm:max-w-[180px] px-1 py-0.5">
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Spacer when no breadcrumb */}
        {(!breadcrumbs || breadcrumbs.length === 0) && <div className="flex-1" />}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {actions}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSearchOpen) {
                onSearchOpen();
              } else {
                window.dispatchEvent(new CustomEvent('open-global-search'));
              }
            }}
            title="Search (press /)"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <NotificationBell />
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
