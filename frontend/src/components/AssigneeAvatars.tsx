import { useState, useRef, useEffect } from 'react';
import OnlineIndicator from './OnlineIndicator';

interface Assignee {
  user_id: string;
  role: string;
  user_name?: string;
  user_email?: string;
}

interface AssigneeAvatarsProps {
  assignees: Assignee[];
  maxDisplay?: number;
  teamSize?: number; // Total team size to check if everyone is assigned
  onlineUserIds?: string[];
}

export default function AssigneeAvatars({ assignees, maxDisplay = 3, teamSize, onlineUserIds }: AssigneeAvatarsProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  if (!assignees || assignees.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">Not assigned</span>
      </div>
    );
  }

  // Check if everyone is assigned
  const isEveryoneAssigned = teamSize && assignees.length === teamSize;

  // Show "Everyone" badge if all team members are assigned
  if (isEveryoneAssigned) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 border border-blue-500/50 rounded-lg px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-blue-400">Everyone ({assignees.length})</span>
        </div>
      </div>
    );
  }

  const displayedAssignees = assignees.slice(0, maxDisplay);
  const remainingCount = Math.max(0, assignees.length - maxDisplay);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGradient = (userId: string) => {
    const gradients = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600',
      'bg-gradient-to-br from-yellow-500 to-orange-600',
    ];
    const index = userId.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':    return 'role-badge-owner';
      case 'assignee': return 'role-badge-assignee';
      case 'watcher':  return 'role-badge-watcher';
      default:         return 'role-badge-watcher';
    }
  };

  return (
    <div className="flex items-center gap-1 relative">
      {displayedAssignees.map((assignee) => (
        <div
          key={assignee.user_id}
          className="relative group"
          title={`${assignee.user_name || assignee.user_email || 'User'} (${assignee.role})`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getGradient(
              assignee.user_id
            )} shadow-lg`}
          >
            {getInitials(assignee.user_name || assignee.user_email || 'U')}
          </div>
          {onlineUserIds ? (
            <div className="absolute -bottom-1 -right-1">
              <OnlineIndicator isOnline={onlineUserIds.includes(assignee.user_id)} size="sm" />
            </div>
          ) : (
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${getRoleBadgeColor(
              assignee.role
            )} shadow-md`}
            style={{ color: '#ffffff' }}
          >
            {assignee.role === 'owner' ? 'O' : assignee.role === 'assignee' ? 'A' : 'W'}
          </div>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {assignee.user_name || assignee.user_email || 'User'}
            <div className="text-gray-400 text-[10px]">
              {assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1)}
            </div>
          </div>
        </div>
      ))}

      {remainingCount > 0 && (
        <div className="relative" ref={popoverRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(!showPopover);
            }}
            className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center text-white text-xs font-semibold shadow-lg transition-all cursor-pointer hover:scale-110"
            title={`Show ${remainingCount} more assignees`}
          >
            +{remainingCount}
          </button>

          {/* Popover with smooth animation */}
          {showPopover && (
            <div className="absolute top-full left-0 mt-2 glass-strong rounded-xl shadow-2xl p-3 min-w-[280px] max-w-[320px] z-50 animate-fade-in-scale border border-indigo-500/30">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                <h4 className="text-sm font-semibold text-white">All Assignees ({assignees.length})</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopover(false);
                  }}
                  className="text-gray-400 hover:text-white transition-all hover-scale"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 dark-scrollbar pr-1">
                {assignees.map((assignee, index) => (
                  <div
                    key={assignee.user_id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50 transition-colors animate-in fade-in slide-in-from-left duration-200"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getGradient(
                        assignee.user_id
                      )} shadow-md flex-shrink-0`}
                    >
                      {getInitials(assignee.user_name || assignee.user_email || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {assignee.user_name || assignee.user_email || 'User'}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {assignee.user_email || ''}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getRoleBadgeColor(
                        assignee.role
                      )} flex-shrink-0`}
                    >
                      {assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
