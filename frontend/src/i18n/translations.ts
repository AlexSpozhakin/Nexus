export type TranslationKey =
  // Navigation
  | 'logout' | 'back' | 'dashboard' | 'hello'
  // Teams
  | 'myTeams' | 'newTeam' | 'createTeam' | 'deleteTeam' | 'leaveTeam'
  | 'teamName' | 'description' | 'cancel' | 'noTeams'
  // Tasks
  | 'myTasks' | 'newTask' | 'createTask' | 'deleteTask' | 'noTasks'
  | 'tasks' | 'subtasks' | 'addSubtask' | 'createSubtask' | 'noSubtasks'
  | 'title' | 'priority' | 'status' | 'dueDate' | 'assignees'
  | 'low' | 'medium' | 'high'
  | 'todo' | 'inProgress' | 'done' | 'cancelled'
  | 'overdue' | 'completedLate' | 'overdueShort'
  // Notes
  | 'notes' | 'newNote' | 'createNote' | 'noteTitle' | 'noteContent'
  | 'shareWithTeam' | 'noNotes' | 'sharedBadge'
  // Members
  | 'members' | 'addMember' | 'removeMember' | 'leaveTeamBtn'
  | 'email' | 'role' | 'owner' | 'admin' | 'member'
  | 'noMembers'
  // Comments
  | 'comments' | 'addComment' | 'writeComment' | 'noComments'
  | 'edited' | 'you' | 'edit' | 'delete' | 'save'
  // Profile
  | 'profile' | 'username' | 'password' | 'newPassword' | 'confirmPassword'
  | 'saveChanges' | 'changeAvatar'
  // Settings menu
  | 'settings' | 'language' | 'theme' | 'notifications'
  | 'darkTheme' | 'lightTheme'
  | 'soundEnabled' | 'newCommentNotif' | 'taskAssignedNotif'
  | 'teamEventsNotif' | 'taskOverdueNotif'
  // Stats
  | 'statistics' | 'tasksCompleted' | 'tasksOverdue' | 'tasksInProgress'
  | 'tasksTodo' | 'totalTasks' | 'completionRate' | 'thisWeek' | 'thisMonth' | 'allTime'
  // Common
  | 'loading' | 'error' | 'success' | 'confirm' | 'by'
  | 'searchTasks' | 'searchNotes' | 'noDescription'
  // Notifications
  | 'notifTaskAssigned' | 'notifNewComment' | 'notifStatusChanged'
  | 'notifNewTeamMember' | 'notifAddedToTeam' | 'notifRemovedFromTeam'
  | 'notifTeamDeleted' | 'notifUserLeftTeam' | 'notifTaskOverdue'
  | 'notifTaskDeleted' | 'notifRoleChanged'
  | 'notifMarkAllRead' | 'notifClear' | 'notifNoNotifications'
  // Attachments
  | 'attachments' | 'addAttachment' | 'noAttachments' | 'uploadFile' | 'uploading'
  | 'downloadFile' | 'deleteAttachment' | 'attachmentUploadError' | 'attachmentDeleteError'
  | 'attachmentSizeError' | 'attachmentTypeError' | 'attachedBy' | 'teamDocuments'
  // Analytics
  | 'analytics' | 'analyticsOverview' | 'analyticsWorkload' | 'analyticsDangerZone'
  | 'analyticsCompletionRate' | 'analyticsAvgTime' | 'analyticsOnTime' | 'analyticsOverdueRate'
  | 'analyticsTasksDone' | 'analyticsTasksOverdue' | 'analyticsTasksInProgress' | 'analyticsTasksTodo'
  | 'analyticsAtRisk' | 'analyticsAtRiskDesc' | 'analyticsNoAtRisk'
  | 'analyticsWorkloadTitle' | 'analyticsWorkloadActive' | 'analyticsWorkloadOverloaded' | 'analyticsWorkloadFree'
  | 'analyticsNoTasks' | 'analyticsPeriod7' | 'analyticsPeriod30' | 'analyticsPeriodAll'
  | 'analyticsHighPriority' | 'analyticsMedPriority' | 'analyticsLowPriority'
  | 'analyticsPriorityBreakdown' | 'analyticsTasksWithDeadline' | 'analyticsNoDeadline'
  | 'analyticsRecentActivity' | 'analyticsCompletedOn' | 'analyticsCompletedLate' | 'analyticsStillOpen'
  // Analytics 2.0
  | 'analyticsReliability' | 'analyticsReliabilityDesc' | 'analyticsNoReliabilityData'
  | 'analyticsHeatmap' | 'analyticsHeatmapDesc'
  | 'analyticsVelocity' | 'analyticsVelocityCreated' | 'analyticsVelocityClosed'
  | 'analyticsOnTimeOf' | 'analyticsWeek'
  | 'analyticsTabOverview' | 'analyticsTabMembers' | 'analyticsTabActivity'
  // Kanban
  | 'listView' | 'kanbanView' | 'kanbanTodo' | 'kanbanInProgress' | 'kanbanDone'
  // Global Search
  | 'searchPlaceholder' | 'searchHint' | 'searchNoResults' | 'searchTasksGroup' | 'searchNotesGroup'
  | 'searchNavigate' | 'searchOpen' | 'searchClose'
  // Time Tracking
  | 'timeTracking' | 'timeStart' | 'timeStop' | 'timeTotal' | 'timeNotePlaceholder'
  // Date formatter
  | 'dateOverdueByDays' | 'dateOverdueByDay' | 'dateOverdueByHours' | 'dateOverdueByHour' | 'dateOverdueByMinutes'
  | 'dateDueInMinutes' | 'dateDueTodayAt' | 'dateDueTomorrowAt' | 'dateDueOn'
  | 'dateDaySunday' | 'dateDayMonday' | 'dateDayTuesday' | 'dateDayWednesday'
  | 'dateDayThursday' | 'dateDayFriday' | 'dateDaySaturday'
  | 'dateJustNow' | 'dateYesterday' | 'dateCompletedLate' | 'dateCompleted'
  // Online status
  | 'online' | 'offline' | 'lastSeen'
  // Milestone
  | 'milestoneSetTeam' | 'milestoneNew' | 'milestoneTitle' | 'milestoneDesc' | 'milestoneDeadline'
  | 'milestoneCreate' | 'milestoneCreating' | 'milestoneComplete' | 'milestoneCompleting'
  | 'milestoneTasks' | 'milestoneNoActive'
  // Activity Log
  | 'activityLog' | 'activityNoActivity'
  | 'activityStatusChanged' | 'activityPriorityChanged' | 'activityTitleChanged'
  | 'activityDueDateChanged' | 'activityCommentAdded' | 'activityCommentDeleted'
  | 'activityAssigneeAdded' | 'activityAssigneeRemoved' | 'activityAttachmentAdded'
  | 'activitySomeone'
  // Markdown
  | 'mdEdit' | 'mdPreview' | 'mdNothingToPreview' | 'mdCopied';

type Translations = Record<TranslationKey, string>;

export const translations: Record<'en' | 'ru', Translations> = {
  en: {
    // Navigation
    logout: 'Logout', back: '← Back', dashboard: 'Nexus', hello: 'Hello',
    // Teams
    myTeams: 'My Teams', newTeam: '+ New Team', createTeam: 'Create Team',
    deleteTeam: 'Delete Team', leaveTeam: 'Leave Team',
    teamName: 'Team name', description: 'Description', cancel: 'Cancel', noTeams: 'No teams yet. Create your first team!',
    // Tasks
    myTasks: 'My Tasks', newTask: '+ New Task', createTask: 'Create Task',
    deleteTask: 'Delete', noTasks: 'No tasks yet. Create your first task!',
    tasks: 'Tasks', subtasks: 'Subtasks', addSubtask: 'Add Subtask',
    createSubtask: 'Create Subtask', noSubtasks: 'No subtasks yet. Add one to break down this task!',
    title: 'Title', priority: 'Priority', status: 'Status', dueDate: 'Due Date', assignees: 'Assignees',
    low: 'Low', medium: 'Medium', high: 'High',
    todo: 'Todo', inProgress: 'In Progress', done: 'Done', cancelled: 'Cancelled',
    overdue: 'OVERDUE!', completedLate: 'Completed late', overdueShort: 'overdue',
    // Notes
    notes: 'Notes', newNote: '+ New Note', createNote: 'Create Note',
    noteTitle: 'Note title', noteContent: 'Note content',
    shareWithTeam: 'Share with team', noNotes: 'No notes yet. Create your first note!',
    sharedBadge: 'Shared',
    // Members
    members: 'Members', addMember: 'Add Member', removeMember: 'Remove',
    leaveTeamBtn: 'Leave', email: 'Email', role: 'Role',
    owner: 'Owner', admin: 'Admin', member: 'Member', noMembers: 'No members',
    // Comments
    comments: 'Comments', addComment: 'Add Comment', writeComment: 'Write a comment...',
    noComments: 'No comments yet. Be the first to comment!',
    edited: 'edited', you: 'you', edit: 'Edit', delete: 'Delete', save: 'Save',
    // Profile
    profile: 'Profile', username: 'Username', password: 'Password',
    newPassword: 'New Password', confirmPassword: 'Confirm Password',
    saveChanges: 'Save Changes', changeAvatar: 'Change Color',
    // Settings menu
    settings: 'Settings', language: 'Language', theme: 'Theme', notifications: 'Notifications',
    darkTheme: 'Dark', lightTheme: 'Light',
    soundEnabled: 'Sound notifications', newCommentNotif: 'New comments',
    taskAssignedNotif: 'Task assignments', teamEventsNotif: 'Team events',
    taskOverdueNotif: 'Overdue reminders',
    // Stats
    statistics: 'Statistics', tasksCompleted: 'Completed', tasksOverdue: 'Overdue',
    tasksInProgress: 'In Progress', tasksTodo: 'To Do', totalTasks: 'Total Tasks',
    completionRate: 'Completion Rate', thisWeek: 'This Week', thisMonth: 'This Month', allTime: 'All Time',
    // Common
    loading: 'Loading...', error: 'Error', success: 'Success', confirm: 'Confirm', by: 'By',
    searchTasks: 'Search tasks...', searchNotes: 'Search notes...', noDescription: 'No description',
    // Notifications
    notifTaskAssigned: 'New Task Assigned', notifNewComment: 'New Comment',
    notifStatusChanged: 'Task Status Changed', notifNewTeamMember: 'New Team Member',
    notifAddedToTeam: 'Added to Team', notifRemovedFromTeam: 'Removed from Team',
    notifTeamDeleted: 'Team Deleted', notifUserLeftTeam: 'Member Left Team',
    notifTaskOverdue: 'Task Overdue', notifTaskDeleted: 'Task Deleted', notifRoleChanged: 'Your Role Changed',
    notifMarkAllRead: 'Mark all read', notifClear: 'Clear', notifNoNotifications: 'No notifications yet',
    // Attachments
    attachments: 'Attachments', addAttachment: 'Attach File', noAttachments: 'No attachments yet.',
    uploadFile: 'Upload', uploading: 'Uploading...', downloadFile: 'Download',
    deleteAttachment: 'Delete', attachmentUploadError: 'Upload failed. Check file type and size.',
    attachmentDeleteError: 'Failed to delete attachment.',
    attachmentSizeError: 'File too large. Maximum 20 MB.', attachmentTypeError: 'File type not allowed.',
    attachedBy: 'by', teamDocuments: 'Team Documents',
    // Analytics
    analytics: 'Analytics', analyticsOverview: 'Overview', analyticsWorkload: 'Workload',
    analyticsDangerZone: 'Danger Zone', analyticsCompletionRate: 'Completion Rate',
    analyticsAvgTime: 'Avg. Completion Time', analyticsOnTime: 'On Time', analyticsOverdueRate: 'Overdue Rate',
    analyticsTasksDone: 'Completed', analyticsTasksOverdue: 'Overdue',
    analyticsTasksInProgress: 'In Progress', analyticsTasksTodo: 'To Do',
    analyticsAtRisk: 'Tasks at Risk', analyticsAtRiskDesc: 'Deadline within 48h, not completed',
    analyticsNoAtRisk: 'No tasks at risk — great job!',
    analyticsWorkloadTitle: 'Member Workload', analyticsWorkloadActive: 'active tasks',
    analyticsWorkloadOverloaded: 'Overloaded', analyticsWorkloadFree: 'Available',
    analyticsNoTasks: 'No tasks to analyze yet', analyticsPeriod7: '7 days',
    analyticsPeriod30: '30 days', analyticsPeriodAll: 'All time',
    analyticsHighPriority: 'High', analyticsMedPriority: 'Medium', analyticsLowPriority: 'Low',
    analyticsPriorityBreakdown: 'Priority Breakdown', analyticsTasksWithDeadline: 'with deadline',
    analyticsNoDeadline: 'no deadline', analyticsRecentActivity: 'Recent Activity',
    analyticsCompletedOn: 'Completed on time', analyticsCompletedLate: 'Completed late', analyticsStillOpen: 'Still open',
    // Analytics 2.0
    analyticsReliability: 'Reliability Ranking', analyticsReliabilityDesc: 'On-time completion rate per member',
    analyticsNoReliabilityData: 'Complete tasks with deadlines to see the ranking',
    analyticsHeatmap: 'Activity Heatmap', analyticsHeatmapDesc: 'Tasks completed per day (last 12 weeks)',
    analyticsVelocity: 'Team Velocity', analyticsVelocityCreated: 'Created', analyticsVelocityClosed: 'Closed',
    analyticsOnTimeOf: 'on time out of', analyticsWeek: 'W',
    analyticsTabOverview: 'Overview', analyticsTabMembers: 'Members', analyticsTabActivity: 'Activity',
    // Kanban
    listView: 'List', kanbanView: 'Board', kanbanTodo: 'To Do', kanbanInProgress: 'In Progress', kanbanDone: 'Done',
    // Global Search
    searchPlaceholder: 'Search tasks and notes...', searchHint: 'Type at least 2 characters to search',
    searchNoResults: 'Nothing found', searchTasksGroup: 'Tasks', searchNotesGroup: 'Notes',
    searchNavigate: 'navigate', searchOpen: 'open', searchClose: 'close',
    // Time Tracking
    timeTracking: 'Time Tracking', timeStart: 'Start', timeStop: 'Stop',
    timeTotal: 'Total spent', timeNotePlaceholder: 'What are you working on?',
    // Date formatter
    dateOverdueByDays: 'Overdue by {n} days', dateOverdueByDay: 'Overdue by 1 day',
    dateOverdueByHours: 'Overdue by {n} hours', dateOverdueByHour: 'Overdue by 1 hour',
    dateOverdueByMinutes: 'Overdue by {n} minutes',
    dateDueInMinutes: 'Due in {n} minutes', dateDueTodayAt: 'Due today at {time}',
    dateDueTomorrowAt: 'Due tomorrow at {time}', dateDueOn: 'Due {date}',
    dateDaySunday: 'Sunday', dateDayMonday: 'Monday', dateDayTuesday: 'Tuesday',
    dateDayWednesday: 'Wednesday', dateDayThursday: 'Thursday', dateDayFriday: 'Friday', dateDaySaturday: 'Saturday',
    dateJustNow: 'just now', dateYesterday: 'yesterday',
    dateCompletedLate: 'Completed {time} ({n}d late)', dateCompleted: 'Completed {time}',
    // Online status
    online: 'Online', offline: 'Offline', lastSeen: 'Last seen',
    // Milestone
    milestoneSetTeam: 'Set a team milestone', milestoneNew: 'New Milestone',
    milestoneTitle: 'Milestone title', milestoneDesc: 'Description (optional)',
    milestoneDeadline: 'Deadline', milestoneCreate: 'Create', milestoneCreating: 'Creating...',
    milestoneComplete: 'Complete', milestoneCompleting: '...',
    milestoneTasks: 'tasks', milestoneNoActive: 'No active milestone',
    // Activity Log
    activityLog: 'Activity Log', activityNoActivity: 'No activity yet',
    activityStatusChanged: 'changed status', activityPriorityChanged: 'changed priority',
    activityTitleChanged: 'changed title', activityDueDateChanged: 'changed due date',
    activityCommentAdded: 'added a comment', activityCommentDeleted: 'deleted a comment',
    activityAssigneeAdded: 'added assignee', activityAssigneeRemoved: 'removed assignee',
    activityAttachmentAdded: 'attached a file', activitySomeone: 'Someone',
    // Markdown
    mdEdit: 'Edit', mdPreview: 'Preview', mdNothingToPreview: 'Nothing to preview', mdCopied: 'Copied!',
  },
  ru: {
    // Navigation
    logout: 'Выйти', back: '← Назад', dashboard: 'Nexus', hello: 'Привет',
    // Teams
    myTeams: 'Мои команды', newTeam: '+ Новая команда', createTeam: 'Создать команду',
    deleteTeam: 'Удалить команду', leaveTeam: 'Покинуть команду',
    teamName: 'Название команды', description: 'Описание', cancel: 'Отмена', noTeams: 'Нет команд. Создайте первую команду!',
    // Tasks
    myTasks: 'Мои задачи', newTask: '+ Новая задача', createTask: 'Создать задачу',
    deleteTask: 'Удалить', noTasks: 'Нет задач. Создайте первую задачу!',
    tasks: 'Задачи', subtasks: 'Подзадачи', addSubtask: 'Подзадача',
    createSubtask: 'Создать подзадачу', noSubtasks: 'Нет подзадач. Добавьте для декомпозиции!',
    title: 'Название', priority: 'Приоритет', status: 'Статус', dueDate: 'Дедлайн', assignees: 'Исполнители',
    low: 'Низкий', medium: 'Средний', high: 'Высокий',
    todo: 'К выполнению', inProgress: 'В работе', done: 'Выполнено', cancelled: 'Отменено',
    overdue: 'ПРОСРОЧЕНО!', completedLate: 'Выполнено с опозданием', overdueShort: 'просрочено',
    // Notes
    notes: 'Заметки', newNote: '+ Новая заметка', createNote: 'Создать заметку',
    noteTitle: 'Заголовок заметки', noteContent: 'Содержание заметки',
    shareWithTeam: 'Поделиться с командой', noNotes: 'Нет заметок. Создайте первую!',
    sharedBadge: 'Общая',
    // Members
    members: 'Участники', addMember: 'Добавить участника', removeMember: 'Удалить',
    leaveTeamBtn: 'Покинуть', email: 'Email', role: 'Роль',
    owner: 'Владелец', admin: 'Администратор', member: 'Участник', noMembers: 'Нет участников',
    // Comments
    comments: 'Комментарии', addComment: 'Добавить комментарий', writeComment: 'Написать комментарий...',
    noComments: 'Нет комментариев. Будьте первым!',
    edited: 'изменён', you: 'вы', edit: 'Изменить', delete: 'Удалить', save: 'Сохранить',
    // Profile
    profile: 'Профиль', username: 'Имя пользователя', password: 'Пароль',
    newPassword: 'Новый пароль', confirmPassword: 'Подтвердите пароль',
    saveChanges: 'Сохранить изменения', changeAvatar: 'Сменить цвет',
    // Settings menu
    settings: 'Настройки', language: 'Язык', theme: 'Тема', notifications: 'Уведомления',
    darkTheme: 'Тёмная', lightTheme: 'Светлая',
    soundEnabled: 'Звук уведомлений', newCommentNotif: 'Новые комментарии',
    taskAssignedNotif: 'Назначение задач', teamEventsNotif: 'События команды',
    taskOverdueNotif: 'Напоминания о просрочке',
    // Stats
    statistics: 'Статистика', tasksCompleted: 'Выполнено', tasksOverdue: 'Просрочено',
    tasksInProgress: 'В работе', tasksTodo: 'К выполнению', totalTasks: 'Всего задач',
    completionRate: 'Процент выполнения', thisWeek: 'Эта неделя', thisMonth: 'Этот месяц', allTime: 'За всё время',
    // Common
    loading: 'Загрузка...', error: 'Ошибка', success: 'Успешно', confirm: 'Подтвердить', by: 'Автор',
    searchTasks: 'Поиск задач...', searchNotes: 'Поиск заметок...', noDescription: 'Нет описания',
    // Notifications
    notifTaskAssigned: 'Новая задача назначена', notifNewComment: 'Новый комментарий',
    notifStatusChanged: 'Статус задачи изменён', notifNewTeamMember: 'Новый участник команды',
    notifAddedToTeam: 'Вас добавили в команду', notifRemovedFromTeam: 'Вас удалили из команды',
    notifTeamDeleted: 'Команда удалена', notifUserLeftTeam: 'Участник покинул команду',
    notifTaskOverdue: 'Задача просрочена', notifTaskDeleted: 'Задача удалена', notifRoleChanged: 'Ваша роль изменена',
    notifMarkAllRead: 'Отметить все прочитанными', notifClear: 'Очистить', notifNoNotifications: 'Нет уведомлений',
    // Attachments
    attachments: 'Вложения', addAttachment: 'Прикрепить файл', noAttachments: 'Нет вложений.',
    uploadFile: 'Загрузить', uploading: 'Загрузка...', downloadFile: 'Скачать',
    deleteAttachment: 'Удалить', attachmentUploadError: 'Ошибка загрузки. Проверьте тип и размер файла.',
    attachmentDeleteError: 'Не удалось удалить вложение.',
    attachmentSizeError: 'Файл слишком большой. Максимум 20 МБ.', attachmentTypeError: 'Тип файла не разрешён.',
    attachedBy: 'от', teamDocuments: 'Документы команды',
    // Analytics
    analytics: 'Аналитика', analyticsOverview: 'Обзор', analyticsWorkload: 'Нагрузка',
    analyticsDangerZone: 'Зона риска', analyticsCompletionRate: 'Процент выполнения',
    analyticsAvgTime: 'Среднее время выполнения', analyticsOnTime: 'В срок', analyticsOverdueRate: 'Просрочка',
    analyticsTasksDone: 'Выполнено', analyticsTasksOverdue: 'Просрочено',
    analyticsTasksInProgress: 'В работе', analyticsTasksTodo: 'К выполнению',
    analyticsAtRisk: 'Задачи в опасности', analyticsAtRiskDesc: 'Дедлайн в течение 48ч, не выполнено',
    analyticsNoAtRisk: 'Нет задач в опасности — отличная работа!',
    analyticsWorkloadTitle: 'Нагрузка участников', analyticsWorkloadActive: 'активных задач',
    analyticsWorkloadOverloaded: 'Перегружен', analyticsWorkloadFree: 'Свободен',
    analyticsNoTasks: 'Нет задач для анализа', analyticsPeriod7: '7 дней',
    analyticsPeriod30: '30 дней', analyticsPeriodAll: 'За всё время',
    analyticsHighPriority: 'Высокий', analyticsMedPriority: 'Средний', analyticsLowPriority: 'Низкий',
    analyticsPriorityBreakdown: 'Распределение приоритетов', analyticsTasksWithDeadline: 'с дедлайном',
    analyticsNoDeadline: 'без дедлайна', analyticsRecentActivity: 'Последняя активность',
    analyticsCompletedOn: 'Выполнено в срок', analyticsCompletedLate: 'Выполнено с опозданием', analyticsStillOpen: 'Ещё открыто',
    // Analytics 2.0
    analyticsReliability: 'Рейтинг надёжности', analyticsReliabilityDesc: '% выполнения задач в срок по участникам',
    analyticsNoReliabilityData: 'Выполните задачи с дедлайнами для отображения рейтинга',
    analyticsHeatmap: 'Тепловая карта активности', analyticsHeatmapDesc: 'Задач выполнено в день (последние 12 недель)',
    analyticsVelocity: 'Скорость команды', analyticsVelocityCreated: 'Создано', analyticsVelocityClosed: 'Закрыто',
    analyticsOnTimeOf: 'вовремя из', analyticsWeek: 'Н',
    analyticsTabOverview: 'Обзор', analyticsTabMembers: 'Участники', analyticsTabActivity: 'Активность',
    // Kanban
    listView: 'Список', kanbanView: 'Доска', kanbanTodo: 'К выполнению', kanbanInProgress: 'В работе', kanbanDone: 'Готово',
    // Global Search
    searchPlaceholder: 'Поиск по задачам и заметкам...', searchHint: 'Введите минимум 2 символа для поиска',
    searchNoResults: 'Ничего не найдено', searchTasksGroup: 'Задачи', searchNotesGroup: 'Заметки',
    searchNavigate: 'навигация', searchOpen: 'открыть', searchClose: 'закрыть',
    // Time Tracking
    timeTracking: 'Учёт времени', timeStart: 'Старт', timeStop: 'Стоп',
    timeTotal: 'Итого потрачено', timeNotePlaceholder: 'Над чем работаете?',
    // Date formatter
    dateOverdueByDays: 'Просрочено на {n} дней', dateOverdueByDay: 'Просрочено на 1 день',
    dateOverdueByHours: 'Просрочено на {n} часов', dateOverdueByHour: 'Просрочено на 1 час',
    dateOverdueByMinutes: 'Просрочено на {n} минут',
    dateDueInMinutes: 'Через {n} минут', dateDueTodayAt: 'Сегодня в {time}',
    dateDueTomorrowAt: 'Завтра в {time}', dateDueOn: 'Срок: {date}',
    dateDaySunday: 'Воскресенье', dateDayMonday: 'Понедельник', dateDayTuesday: 'Вторник',
    dateDayWednesday: 'Среда', dateDayThursday: 'Четверг', dateDayFriday: 'Пятница', dateDaySaturday: 'Суббота',
    dateJustNow: 'только что', dateYesterday: 'вчера',
    dateCompletedLate: 'Выполнено {time} (опоздание {n}д)', dateCompleted: 'Выполнено {time}',
    // Online status
    online: 'В сети', offline: 'Не в сети', lastSeen: 'Был в сети',
    // Milestone
    milestoneSetTeam: 'Установить веху команды', milestoneNew: 'Новая веха',
    milestoneTitle: 'Название вехи', milestoneDesc: 'Описание (необязательно)',
    milestoneDeadline: 'Дедлайн', milestoneCreate: 'Создать', milestoneCreating: 'Создание...',
    milestoneComplete: 'Завершить', milestoneCompleting: '...',
    milestoneTasks: 'задач', milestoneNoActive: 'Нет активной вехи',
    // Activity Log
    activityLog: 'Журнал активности', activityNoActivity: 'Активности пока нет',
    activityStatusChanged: 'изменил статус', activityPriorityChanged: 'изменил приоритет',
    activityTitleChanged: 'изменил название', activityDueDateChanged: 'изменил дедлайн',
    activityCommentAdded: 'добавил комментарий', activityCommentDeleted: 'удалил комментарий',
    activityAssigneeAdded: 'добавил исполнителя', activityAssigneeRemoved: 'удалил исполнителя',
    activityAttachmentAdded: 'прикрепил файл', activitySomeone: 'Кто-то',
    // Markdown
    mdEdit: 'Редактор', mdPreview: 'Просмотр', mdNothingToPreview: 'Нечего отображать', mdCopied: 'Скопировано!',
  },
};

export function useTranslation() {
  const lang = (useStore().settings?.language) || 'en';
  const t = (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key;
  return { t, lang };
}

// Нужен импорт useStore внутри функции — делаем через прямой доступ
import { useStore } from '../store/store';
