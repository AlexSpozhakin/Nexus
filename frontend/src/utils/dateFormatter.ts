// Modern date formatting utility inspired by Linear, Notion, and Asana
import { translations } from '../i18n/translations';

type Lang = 'en' | 'ru';

const t = (lang: Lang, key: keyof typeof translations.en, vars?: Record<string, string | number>): string => {
  let str = translations[lang][key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
};

export const formatDeadline = (dateString: string, lang: Lang = 'en'): { text: string; className: string; icon: string } => {
  const now = new Date();
  const deadline = new Date(dateString);
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // Overdue
  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    const absHours = Math.abs(diffHours);

    if (absDays > 0) {
      return {
        text: absDays === 1
          ? t(lang, 'dateOverdueByDay')
          : t(lang, 'dateOverdueByDays', { n: absDays }),
        className: 'bg-red-500/20 text-red-300 border border-red-500/50',
        icon: '🔴'
      };
    } else if (absHours > 0) {
      return {
        text: absHours === 1
          ? t(lang, 'dateOverdueByHour')
          : t(lang, 'dateOverdueByHours', { n: absHours }),
        className: 'bg-red-500/20 text-red-300 border border-red-500/50',
        icon: '🔴'
      };
    } else {
      return {
        text: t(lang, 'dateOverdueByMinutes', { n: Math.abs(diffMinutes) }),
        className: 'bg-red-500/20 text-red-300 border border-red-500/50',
        icon: '🔴'
      };
    }
  }

  // Due today
  if (diffDays === 0) {
    const hours = deadline.getHours();
    const minutes = deadline.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (diffHours < 2) {
      return {
        text: t(lang, 'dateDueInMinutes', { n: diffHours === 0 ? diffMinutes : diffHours * 60 + (diffMinutes % 60) }),
        className: 'bg-orange-500/20 text-orange-300 border border-orange-500/50 animate-pulse',
        icon: '⚡'
      };
    }

    return {
      text: t(lang, 'dateDueTodayAt', { time: timeStr }),
      className: 'bg-orange-500/20 text-orange-300 border border-orange-500/50',
      icon: '📅'
    };
  }

  // Due tomorrow
  if (diffDays === 1) {
    const hours = deadline.getHours();
    const minutes = deadline.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return {
      text: t(lang, 'dateDueTomorrowAt', { time: timeStr }),
      className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
      icon: '⏰'
    };
  }

  // Due within a week
  if (diffDays <= 7) {
    const dayKeys = [
      'dateDaySunday', 'dateDayMonday', 'dateDayTuesday', 'dateDayWednesday',
      'dateDayThursday', 'dateDayFriday', 'dateDaySaturday'
    ] as const;
    const dayName = t(lang, dayKeys[deadline.getDay()]);

    return {
      text: t(lang, 'dateDueOn', { date: dayName }),
      className: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
      icon: '📆'
    };
  }

  // Due later
  const month = deadline.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
  const day = deadline.getDate();

  return {
    text: t(lang, 'dateDueOn', { date: `${month} ${day}` }),
    className: 'bg-gray-500/20 text-gray-300 border border-gray-500/50',
    icon: '📅'
  };
};

export const formatCompletedDate = (dateString: string, dueDate?: string, lang: Lang = 'en'): { text: string; className: string; icon: string } => {
  const completed = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - completed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let timeAgo = '';

  // Format "time ago"
  if (diffMinutes < 1) {
    timeAgo = t(lang, 'dateJustNow');
  } else if (diffMinutes < 60) {
    timeAgo = `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    timeAgo = t(lang, 'dateYesterday');
  } else if (diffDays < 7) {
    timeAgo = `${diffDays}d ago`;
  } else {
    const month = completed.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
    const day = completed.getDate();
    timeAgo = lang === 'ru' ? `${day} ${month}` : `on ${month} ${day}`;
  }

  // Check if completed late
  if (dueDate) {
    const due = new Date(dueDate);
    const wasLate = completed > due;

    if (wasLate) {
      const lateDays = Math.floor((completed.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      return {
        text: t(lang, 'dateCompletedLate', { time: timeAgo, n: lateDays }),
        className: 'bg-orange-500/20 text-orange-300 border border-orange-500/50',
        icon: '⚠️'
      };
    }
  }

  // Completed on time
  return {
    text: t(lang, 'dateCompleted', { time: timeAgo }),
    className: 'bg-green-500/20 text-green-300 border border-green-500/50',
    icon: '✅'
  };
};

export const formatRelativeDate = (dateString: string, lang: Lang = 'en'): string => {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return t(lang, 'dateJustNow');
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return t(lang, 'dateYesterday');
  if (diffDays < 7) return `${diffDays}d ago`;

  const month = date.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
  const day = date.getDate();
  return lang === 'ru' ? `${day} ${month}` : `${month} ${day}`;
};
