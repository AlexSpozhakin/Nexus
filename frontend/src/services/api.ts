import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Отдельный инстанс для загрузки файлов — без дефолтного Content-Type
// чтобы браузер сам выставил multipart/form-data с правильным boundary
const uploadApi = axios.create({
  baseURL: '/api/v1',
});
uploadApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Teams
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  getById: (id: string) => api.get(`/teams/${id}`),
  create: (data: { name: string; description: string }) =>
    api.post('/teams', data),
  update: (id: string, data: { name: string; description: string }) =>
    api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getMembers: (id: string) => api.get(`/teams/${id}/members`),
  addMember: (id: string, data: { email: string; role: string }) =>
    api.post(`/teams/${id}/members`, data),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
  updateMemberRole: (teamId: string, userId: string, role: string) =>
    api.patch(`/teams/${teamId}/members/${userId}/role`, { role }),
  getOnlineStatus: (teamId: string) =>
    api.get<{ online_user_ids: string[] }>(`/teams/${teamId}/online`),
};

// Tasks
export const tasksAPI = {
  getByTeam: (teamId: string) => api.get(`/teams/${teamId}/tasks`),
  getMyTasks: () => api.get('/tasks/my'),
  getById: (id: string) => api.get(`/tasks/${id}`),
  getSubtasks: (taskId: string) => api.get(`/tasks/${taskId}/subtasks`),
  create: (teamId: string, data: {
    title: string;
    description: string;
    priority: string;
    assignee_id?: string;
    assignees?: { user_id: string; role: string }[];
    due_date?: string;
    parent_task_id?: string
  }) =>
    api.post(`/teams/${teamId}/tasks`, data),
  update: (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    assignees?: { user_id: string; role: string }[];
    due_date?: string
  }) =>
    api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getActivity: (taskId: string) => api.get(`/tasks/${taskId}/activity`),
};

// Notes
export const notesAPI = {
  getByTeam: (teamId: string) => api.get(`/teams/${teamId}/notes`),
  getById: (id: string) => api.get(`/notes/${id}`),
  create: (teamId: string, data: { title: string; content: string; is_shared: boolean }) =>
    api.post(`/teams/${teamId}/notes`, data),
  update: (id: string, data: { title?: string; content?: string; is_shared?: boolean }) =>
    api.put(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
};

// Comments
export const commentsAPI = {
  getByTask: (taskId: string) => api.get(`/tasks/${taskId}/comments`),
  create: (taskId: string, data: { content: string }) =>
    api.post(`/tasks/${taskId}/comments`, data),
  update: (taskId: string, commentId: string, data: { content: string }) =>
    api.put(`/tasks/${taskId}/comments/${commentId}`, data),
  delete: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),
};

// Attachments
export const attachmentsAPI = {
  getByTask: (taskId: string) =>
    api.get(`/tasks/${taskId}/attachments`),
  getByTeam: (teamId: string) =>
    api.get(`/teams/${teamId}/attachments`),
  uploadToTask: (taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return uploadApi.post(`/tasks/${taskId}/attachments`, form);
  },
  uploadToTeam: (teamId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return uploadApi.post(`/teams/${teamId}/attachments`, form);
  },
  download: (attachmentId: string) =>
    api.get(`/attachments/${attachmentId}/download`, { responseType: 'blob' }),
  preview: (attachmentId: string) =>
    api.get(`/attachments/${attachmentId}/preview`, { responseType: 'blob' }),
  delete: (attachmentId: string) =>
    api.delete(`/attachments/${attachmentId}`),
};

// Labels
export const labelsAPI = {
  getByTeam: (teamId: string) => api.get(`/teams/${teamId}/labels`),
  getStats: (teamId: string) => api.get(`/teams/${teamId}/labels/stats`),
  create: (teamId: string, data: { name: string; color: string }) =>
    api.post(`/teams/${teamId}/labels`, data),
  update: (labelId: string, data: { name?: string; color?: string }) =>
    api.put(`/labels/${labelId}`, data),
  delete: (labelId: string) => api.delete(`/labels/${labelId}`),
  getByTask: (taskId: string) => api.get(`/tasks/${taskId}/labels`),
  addToTask: (taskId: string, labelId: string) =>
    api.post(`/tasks/${taskId}/labels`, { label_id: labelId }),
  removeFromTask: (taskId: string, labelId: string) =>
    api.delete(`/tasks/${taskId}/labels/${labelId}`),
};

// Profile & Stats
export const profileAPI = {
  update: (data: { username?: string; password?: string; new_password?: string }) =>
    api.put('/auth/profile', data),
  getStats: (period: 'week' | 'month' | 'all') =>
    api.get(`/stats?period=${period}`),
};

export interface SearchResult {
  id: string;
  type: 'task' | 'note';
  title: string;
  excerpt: string;
  team_id: string;
  team_name: string;
  status?: string;
  priority?: string;
  created_at: string;
}

// Search
export const searchAPI = {
  search: (q: string) => api.get<{ tasks: SearchResult[], notes: SearchResult[], total: number }>(`/search?q=${encodeURIComponent(q)}`),
};

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  username: string;
  started_at: string;
  duration_seconds: number;
  note: string;
  created_at: string;
}

// Time Tracking
export const timeAPI = {
  create: (taskId: string, data: { started_at: string; duration_seconds: number; note?: string }) =>
    api.post(`/tasks/${taskId}/time`, data),
  getByTask: (taskId: string) =>
    api.get<{ entries: TimeEntry[], total_seconds: number }>(`/tasks/${taskId}/time`),
  delete: (entryId: string) => api.delete(`/time/${entryId}`),
};

// Milestones
export const milestonesAPI = {
  getActive: (teamId: string) => api.get(`/teams/${teamId}/milestones/active`),
  getAll: (teamId: string) => api.get(`/teams/${teamId}/milestones`),
  create: (teamId: string, data: { title: string; description?: string; due_date: string }) =>
    api.post(`/teams/${teamId}/milestones`, data),
  update: (teamId: string, milestoneId: string, data: any) =>
    api.put(`/teams/${teamId}/milestones/${milestoneId}`, data),
  complete: (teamId: string, milestoneId: string) =>
    api.post(`/teams/${teamId}/milestones/${milestoneId}/complete`, {}),
  delete: (teamId: string, milestoneId: string) =>
    api.delete(`/teams/${teamId}/milestones/${milestoneId}`),
};

export default api;