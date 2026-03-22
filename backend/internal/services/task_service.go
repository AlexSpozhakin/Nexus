package services

import (
	"errors"
	"time"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type TaskService struct {
	taskRepo         *postgres.TaskRepository
	teamRepo         *postgres.TeamRepository
	taskAssigneeRepo *postgres.TaskAssigneeRepository
	labelRepo        *postgres.LabelRepository
}

func NewTaskService(taskRepo *postgres.TaskRepository, teamRepo *postgres.TeamRepository, taskAssigneeRepo *postgres.TaskAssigneeRepository) *TaskService {
	return &TaskService{
		taskRepo:         taskRepo,
		teamRepo:         teamRepo,
		taskAssigneeRepo: taskAssigneeRepo,
	}
}

func (s *TaskService) SetLabelRepo(labelRepo *postgres.LabelRepository) {
	s.labelRepo = labelRepo
}

func (s *TaskService) Create(teamID uuid.UUID, req *models.CreateTaskRequest, userID uuid.UUID) (*models.Task, error) {
	// Проверяем доступ к команде
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	task := &models.Task{
		TeamID:      teamID,
		Title:       req.Title,
		Description: req.Description,
		Status:      "todo",
		Priority:    req.Priority,
		CreatorID:   userID,
	}

	// Парсим assignee_id если указан
	if req.AssigneeID != "" {
		assigneeID, err := uuid.Parse(req.AssigneeID)
		if err == nil {
			task.AssigneeID = &assigneeID
		}
	}

	// Парсим parent_task_id если указан (для создания подзадачи)
	if req.ParentTaskID != "" {
		parentTaskID, err := uuid.Parse(req.ParentTaskID)
		if err == nil {
			task.ParentTaskID = &parentTaskID

			// Получаем родительскую задачу для проверки дедлайна
			parentTask, err := s.taskRepo.GetByID(parentTaskID)
			if err == nil && parentTask != nil && parentTask.DueDate != nil && task.DueDate != nil {
				// ВАЛИДАЦИЯ: дедлайн подзадачи не может быть позже дедлайна родительской задачи
				if task.DueDate.After(*parentTask.DueDate) {
					return nil, errors.New("subtask deadline cannot be later than parent task deadline")
				}
			}
		}
	}

	// Парсим due_date если указан
	if req.DueDate != "" {
		var parsedTime time.Time
		var err error

		// Пробуем парсить с таймзоной (ISO 8601: "2006-01-02T15:04:05+03:00")
		parsedTime, err = time.Parse(time.RFC3339, req.DueDate)
		if err != nil {
			// Fallback: парсим без секунд ("2006-01-02T15:04+03:00")
			parsedTime, err = time.Parse("2006-01-02T15:04-07:00", req.DueDate)
		}
		if err != nil {
			// Fallback: парсим без таймзоны (старый формат)
			parsedTime, err = time.Parse("2006-01-02T15:04", req.DueDate)
		}
		if err != nil {
			// Fallback: только дата
			parsedTime, err = time.Parse("2006-01-02", req.DueDate)
		}

		if err == nil {
			// Конвертируем в UTC для хранения (PostgreSQL автоматически конвертирует обратно при чтении)
			utcTime := parsedTime.UTC()
			task.DueDate = &utcTime
		}
	}

	if err := s.taskRepo.Create(task); err != nil {
		return nil, err
	}

	// Добавляем исполнителей, если указаны
	if len(req.Assignees) > 0 {
		for _, assigneeInput := range req.Assignees {
			assigneeUserID, err := uuid.Parse(assigneeInput.UserID)
			if err != nil {
				continue
			}

			assignee := &models.TaskAssignee{
				TaskID:     task.ID,
				UserID:     assigneeUserID,
				Role:       assigneeInput.Role,
				AssignedBy: &userID,
			}

			if err := s.taskAssigneeRepo.AddAssignee(assignee); err != nil {
				// Логируем ошибку, но не прерываем создание задачи
				continue
			}
		}
	} else if req.AssigneeID != "" {
		// Обратная совместимость: если указан старый формат assignee_id
		assigneeUserID, err := uuid.Parse(req.AssigneeID)
		if err == nil {
			assignee := &models.TaskAssignee{
				TaskID:     task.ID,
				UserID:     assigneeUserID,
				Role:       "owner",
				AssignedBy: &userID,
			}
			s.taskAssigneeRepo.AddAssignee(assignee)
		}
	}

	// Загружаем исполнителей для возврата
	s.taskRepo.LoadAssignees(task)

	return task, nil
}

func (s *TaskService) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Task, error) {
	task, err := s.taskRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Проверяем доступ
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	// Загружаем исполнителей
	s.taskRepo.LoadAssignees(task)

	// Загружаем метки
	if s.labelRepo != nil {
		if labels, err := s.labelRepo.GetByTask(task.ID); err == nil {
			task.Labels = labels
		}
	}

	return task, nil
}

func (s *TaskService) GetByTeamID(teamID uuid.UUID, userID uuid.UUID) ([]models.Task, error) {
	// Проверяем доступ
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	tasks, err := s.taskRepo.GetByTeamID(teamID)
	if err != nil {
		return nil, err
	}

	// Загружаем исполнителей для всех задач
	s.taskRepo.LoadAssigneesForTasks(tasks)

	// Загружаем метки для всех задач
	if s.labelRepo != nil && len(tasks) > 0 {
		taskIDs := make([]uuid.UUID, len(tasks))
		for i, t := range tasks {
			taskIDs[i] = t.ID
		}
		if labelsMap, err := s.labelRepo.GetByTasks(taskIDs); err == nil {
			for i := range tasks {
				if lbls, ok := labelsMap[tasks[i].ID]; ok {
					tasks[i].Labels = lbls
				} else {
					tasks[i].Labels = []models.Label{}
				}
			}
		}
	}

	return tasks, nil
}

func (s *TaskService) GetMyTasks(userID uuid.UUID) ([]models.Task, error) {
	tasks, err := s.taskRepo.GetByAssignee(userID)
	if err != nil {
		return nil, err
	}

	// Загружаем исполнителей для всех задач
	s.taskRepo.LoadAssigneesForTasks(tasks)

	return tasks, nil
}

func (s *TaskService) Update(id uuid.UUID, req *models.UpdateTaskRequest, userID uuid.UUID) (*models.Task, error) {
	task, err := s.taskRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Проверяем доступ
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	// Проверяем, есть ли у задачи подзадачи (для блокировки ручного изменения статуса)
	subtasks, _ := s.taskRepo.GetSubtasks(id)
	hasSubtasks := len(subtasks) > 0

	// Обновляем поля
	if req.Title != "" {
		task.Title = req.Title
	}
	if req.Description != "" {
		task.Description = req.Description
	}
	if req.Status != "" {
		// Блокируем ручное изменение статуса для задач с подзадачами
		if hasSubtasks {
			return nil, errors.New("cannot manually change status for tasks with subtasks. Complete all subtasks first")
		}

		oldStatus := task.Status
		task.Status = req.Status

		// Если задача завершена (статус изменился на "done"), сохраняем время завершения
		if task.Status == "done" && oldStatus != "done" {
			now := time.Now().UTC()
			task.CompletedAt = &now
		}
		// Если статус изменился с "done" на что-то другое, сбрасываем completed_at
		if task.Status != "done" && oldStatus == "done" {
			task.CompletedAt = nil
		}
	}
	if req.Priority != "" {
		task.Priority = req.Priority
	}
	if req.AssigneeID != "" {
		assigneeID, err := uuid.Parse(req.AssigneeID)
		if err == nil {
			task.AssigneeID = &assigneeID
		}
	}
	if req.DueDate != "" {
		var parsedTime time.Time
		var err error

		// Пробуем парсить с таймзоной (ISO 8601: "2006-01-02T15:04:05+03:00")
		parsedTime, err = time.Parse(time.RFC3339, req.DueDate)
		if err != nil {
			// Fallback: парсим без секунд ("2006-01-02T15:04+03:00")
			parsedTime, err = time.Parse("2006-01-02T15:04-07:00", req.DueDate)
		}
		if err != nil {
			// Fallback: парсим без таймзоны (старый формат)
			parsedTime, err = time.Parse("2006-01-02T15:04", req.DueDate)
		}
		if err != nil {
			// Fallback: только дата
			parsedTime, err = time.Parse("2006-01-02", req.DueDate)
		}

		if err == nil {
			// Конвертируем в UTC для хранения
			utcTime := parsedTime.UTC()

			// ВАЛИДАЦИЯ для подзадач: проверяем дедлайн родительской задачи
			if task.ParentTaskID != nil {
				parentTask, err := s.taskRepo.GetByID(*task.ParentTaskID)
				if err == nil && parentTask != nil && parentTask.DueDate != nil {
					if utcTime.After(*parentTask.DueDate) {
						return nil, errors.New("subtask deadline cannot be later than parent task deadline")
					}
				}
			}

			// КАСКАДНОЕ ОБНОВЛЕНИЕ: если это родительская задача, проверяем подзадачи
			if len(subtasks) > 0 {
				// Проверяем, есть ли подзадачи с дедлайнами позже нового дедлайна
				hasConflict := false
				for _, st := range subtasks {
					if st.DueDate != nil && st.DueDate.After(utcTime) {
						hasConflict = true
						break
					}
				}
				if hasConflict {
					return nil, errors.New("cannot set parent task deadline earlier than existing subtask deadlines")
				}
			}

			task.DueDate = &utcTime
		}
	}

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	// Обновляем исполнителей, если указаны
	if len(req.Assignees) > 0 {
		// Удаляем всех текущих исполнителей
		s.taskAssigneeRepo.RemoveAllAssignees(task.ID)

		// Добавляем новых исполнителей
		for _, assigneeInput := range req.Assignees {
			assigneeUserID, err := uuid.Parse(assigneeInput.UserID)
			if err != nil {
				continue
			}

			assignee := &models.TaskAssignee{
				TaskID:     task.ID,
				UserID:     assigneeUserID,
				Role:       assigneeInput.Role,
				AssignedBy: &userID,
			}

			s.taskAssigneeRepo.AddAssignee(assignee)
		}
	}

	// Загружаем исполнителей для возврата
	s.taskRepo.LoadAssignees(task)

	return task, nil
}

func (s *TaskService) Delete(id uuid.UUID, userID uuid.UUID) error {
	task, err := s.taskRepo.GetByID(id)
	if err != nil {
		return err
	}
	if task == nil {
		return errors.New("task not found")
	}

	// Проверяем доступ
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("access denied")
	}

	// Только владелец или админ могут удалять задачи
	if member.Role != "owner" && member.Role != "admin" {
		return errors.New("only owner and admin can delete tasks")
	}

	return s.taskRepo.Delete(id)
}

func (s *TaskService) GetSubtasks(parentTaskID uuid.UUID, userID uuid.UUID) ([]models.Task, error) {
	// Проверяем, что родительская задача существует и у пользователя есть доступ
	parentTask, err := s.taskRepo.GetByID(parentTaskID)
	if err != nil {
		return nil, err
	}
	if parentTask == nil {
		return nil, errors.New("parent task not found")
	}

	// Проверяем доступ к команде
	member, err := s.teamRepo.GetMember(parentTask.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	return s.taskRepo.GetSubtasks(parentTaskID)
}

// UpdateParentTaskStatus обновляет статус и дату завершения родительской задачи на основе подзадач
func (s *TaskService) UpdateParentTaskStatus(parentTaskID uuid.UUID) error {
	// Получаем все подзадачи
	subtasks, err := s.taskRepo.GetSubtasks(parentTaskID)
	if err != nil {
		return err
	}

	// Получаем родительскую задачу
	parentTask, err := s.taskRepo.GetByID(parentTaskID)
	if err != nil {
		return err
	}
	if parentTask == nil {
		return errors.New("parent task not found")
	}

	// Если нет подзадач, ничего не делаем
	if len(subtasks) == 0 {
		return nil
	}

	// Проверяем статус всех подзадач
	allDone := true
	var latestCompletedAt *time.Time

	for _, subtask := range subtasks {
		if subtask.Status != "done" {
			allDone = false
		} else {
			// Находим самую позднюю дату завершения среди подзадач
			if subtask.CompletedAt != nil {
				if latestCompletedAt == nil || subtask.CompletedAt.After(*latestCompletedAt) {
					latestCompletedAt = subtask.CompletedAt
				}
			}
		}
	}

	// Обновляем статус родительской задачи
	if allDone {
		parentTask.Status = "done"
		parentTask.CompletedAt = latestCompletedAt // Дата завершения = дата последней подзадачи
	} else {
		// Если есть хотя бы одна невыполненная подзадача
		if parentTask.Status == "done" {
			parentTask.Status = "in_progress" // Возвращаем в in_progress
		}
		parentTask.CompletedAt = nil // Обнуляем дату завершения
	}

	return s.taskRepo.Update(parentTask)
}
