import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
}

interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
  user_name?: string;
  user_email?: string;
}

interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id?: string;
  creator_id: string;
  due_date?: string;
  completed_at?: string;
  parent_task_id?: string;
  subtasks?: Task[];
  assignees?: TaskAssignee[];
  labels?: { id: string; name: string; color: string }[];
}

interface Note {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string;
  is_shared: boolean;
}

export type Language = 'en' | 'ru';
export type Theme = 'dark' | 'light';

export interface NotificationSettings {
  soundEnabled: boolean;
  newComment: boolean;
  taskAssigned: boolean;
  teamEvents: boolean;
  taskOverdue: boolean;
}

export interface Settings {
  language: Language;
  theme: Theme;
  notifications: NotificationSettings;
}

interface AppState {
  user: User | null;
  teams: Team[];
  currentTeam: Team | null;
  tasks: Task[];
  notes: Note[];
  isAuthenticated: boolean;
  settings: Settings;

  setUser: (user: User | null) => void;
  setTeams: (teams: Team[]) => void;
  setCurrentTeam: (team: Team | null) => void;
  setTasks: (tasks: Task[]) => void;
  setNotes: (notes: Note[]) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setNotificationSettings: (ns: Partial<NotificationSettings>) => void;
  logout: () => void;
}

const defaultSettings: Settings = {
  language: 'en',
  theme: 'dark',
  notifications: {
    soundEnabled: true,
    newComment: true,
    taskAssigned: true,
    teamEvents: true,
    taskOverdue: true,
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, _get) => ({
      user: null,
      teams: [],
      currentTeam: null,
      tasks: [],
      notes: [],
      isAuthenticated: !!localStorage.getItem('token'),
      settings: defaultSettings,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTeams: (teams) => set({ teams }),
      setCurrentTeam: (team) => set({ currentTeam: team }),
      setTasks: (tasks) => set({ tasks }),
      setNotes: (notes) => set({ notes }),

      setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
      setLanguage: (lang) => set((state) => ({ settings: { ...state.settings, language: lang } })),
      setTheme: (theme) => {
        set((state) => ({ settings: { ...state.settings, theme } }));
        // Применяем тему к document
        if (theme === 'light') {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      },
      setNotificationSettings: (ns) => set((state) => ({
        settings: {
          ...state.settings,
          notifications: { ...state.settings.notifications, ...ns },
        },
      })),

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false, teams: [], currentTeam: null, tasks: [], notes: [] });
      },
    }),
    {
      name: 'task-manager-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        // Применяем тему при загрузке
        if (state?.settings?.theme === 'light') {
          document.documentElement.classList.add('light-theme');
        }
      },
    }
  )
);
