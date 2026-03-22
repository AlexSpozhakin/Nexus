import { useState } from 'react';
import { useTranslation } from '../i18n/translations';

interface OnlineIndicatorProps {
  isOnline: boolean;
  lastSeen?: string;
  size?: 'sm' | 'md';
}

export default function OnlineIndicator({ isOnline, lastSeen, size = 'sm' }: OnlineIndicatorProps) {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  const dotClass = size === 'sm'
    ? isOnline
      ? 'w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-gray-800 animate-pulse'
      : 'w-2.5 h-2.5 bg-gray-600 rounded-full ring-2 ring-gray-800'
    : isOnline
      ? 'w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-gray-800 animate-pulse'
      : 'w-3.5 h-3.5 bg-gray-600 rounded-full ring-2 ring-gray-800';

  const tooltipText = isOnline
    ? t('online')
    : lastSeen
      ? `${t('lastSeen')}: ${lastSeen}`
      : t('offline');

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={dotClass} />
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-gray-900 text-xs text-gray-300 px-2 py-1 rounded-lg border border-gray-700 whitespace-nowrap">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
  );
}
