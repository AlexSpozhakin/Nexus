package handlers

import (
	"net/http"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"
	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TaskHandler struct {
	taskService          *services.TaskService
	notificationService  *services.NotificationService
	activityService      *services.ActivityService
	userRepo             *postgres.UserRepository
	teamRepo             *postgres.TeamRepository
	taskAssigneeRepo     *postgres.TaskAssigneeRepository
}

func NewTaskHandler(taskService *services.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

func NewTaskHandlerWithNotifications(taskService *services.TaskService, notificationService *services.NotificationService, userRepo *postgres.UserRepository, teamRepo *postgres.TeamRepository, taskAssigneeRepo *postgres.TaskAssigneeRepository) *TaskHandler {
	return &TaskHandler{
		taskService:          taskService,
		notificationService:  notificationService,
		userRepo:             userRepo,
		teamRepo:             teamRepo,
		taskAssigneeRepo:     taskAssigneeRepo,
	}
}

func (h *TaskHandler) SetActivityService(activityService *services.ActivityService) {
	h.activityService = activityService
}

func (h *TaskHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.Create(teamID, &req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Если это подзадача, обновляем статус родительской задачи
	if task.ParentTaskID != nil {
		if err := h.taskService.UpdateParentTaskStatus(*task.ParentTaskID); err != nil {
			// Логируем ошибку, но не прерываем выполнение
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update parent task status"})
			return
		}
	}

	// Отправляем уведомление если задача назначена (старая система - один assignee)
	if task.AssigneeID != nil && h.notificationService != nil {
		creator, _ := h.userRepo.GetByID(userID)
		creatorName := "Someone"
		if creator != nil {
			creatorName = creator.Username
		}
		h.notificationService.NotifyTaskAssigned(*task.AssigneeID, task.Title, creatorName, userID)
	}

	// Отправляем уведомления всем assignees (новая система - множественные assignees)
	if h.notificationService != nil && h.taskAssigneeRepo != nil {
		assignees, err := h.taskAssigneeRepo.GetAssigneesByTaskID(task.ID)
		if err == nil && len(assignees) > 0 {
			creator, _ := h.userRepo.GetByID(userID)
			creatorName := "Someone"
			if creator != nil {
				creatorName = creator.Username
			}

			// Отправляем уведомление каждому assignee
			for _, assignee := range assignees {
				h.notificationService.NotifyTaskAssigned(assignee.UserID, task.Title, creatorName, userID)
			}
		}
	}

	// Broadcast события обновления всем участникам команды для мгновенного обновления списка задач
	if h.notificationService != nil && h.teamRepo != nil {
		members, err := h.teamRepo.GetMembers(teamID)
		if err == nil && len(members) > 0 {
			var userIDs []uuid.UUID
			for _, member := range members {
				userIDs = append(userIDs, member.UserID)
			}
			h.notificationService.BroadcastDataUpdate(userIDs)
		}
	}

	c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) GetByTeam(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	tasks, err := h.taskService.GetByTeamID(teamID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) GetMyTasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	tasks, err := h.taskService.GetMyTasks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) GetByID(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	task, err := h.taskService.GetByID(taskID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Update(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	// Получаем старую задачу для сравнения
	oldTask, _ := h.taskService.GetByID(taskID, userID)

	var req models.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.Update(taskID, &req, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Логируем изменения в activity log
	if h.activityService != nil && oldTask != nil {
		if req.Status != "" && oldTask.Status != req.Status {
			oldVal := oldTask.Status
			newVal := req.Status
			h.activityService.Log(taskID, userID, "status_changed", &oldVal, &newVal) //nolint
		}
		if req.Priority != "" && oldTask.Priority != req.Priority {
			oldVal := oldTask.Priority
			newVal := req.Priority
			h.activityService.Log(taskID, userID, "priority_changed", &oldVal, &newVal) //nolint
		}
		if req.Title != "" && oldTask.Title != req.Title {
			oldVal := oldTask.Title
			newVal := req.Title
			h.activityService.Log(taskID, userID, "title_changed", &oldVal, &newVal) //nolint
		}
		// due_date change — only log when the request actually includes a due_date value
		if req.DueDate != "" {
			oldDueStr := ""
			if oldTask.DueDate != nil {
				oldDueStr = oldTask.DueDate.Format("2006-01-02 15:04")
			}
			newDueStr := req.DueDate
			if oldDueStr != newDueStr {
				var oldPtr, newPtr *string
				if oldDueStr != "" {
					oldPtr = &oldDueStr
				}
				if newDueStr != "" {
					newPtr = &newDueStr
				}
				h.activityService.Log(taskID, userID, "due_date_changed", oldPtr, newPtr) //nolint
			}
		}
	}

	// Если это подзадача и изменился статус, обновляем родительскую задачу
	if task.ParentTaskID != nil && oldTask != nil && oldTask.Status != task.Status {
		if err := h.taskService.UpdateParentTaskStatus(*task.ParentTaskID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update parent task status"})
			return
		}
	}

	// Отправляем уведомления
	if h.notificationService != nil {
		changer, _ := h.userRepo.GetByID(userID)
		changerName := "Someone"
		if changer != nil {
			changerName = changer.Username
		}

		// Уведомление о смене статуса
		if oldTask != nil && req.Status != "" && oldTask.Status != req.Status {
			// Уведомляем создателя задачи
			h.notificationService.NotifyTaskStatusChanged(task.CreatorID, task.Title, req.Status, changerName, userID)

			// Уведомляем исполнителя (старая система)
			if task.AssigneeID != nil {
				h.notificationService.NotifyTaskStatusChanged(*task.AssigneeID, task.Title, req.Status, changerName, userID)
			}

			// Уведомляем всех assignees (новая система)
			if h.taskAssigneeRepo != nil {
				assignees, err := h.taskAssigneeRepo.GetAssigneesByTaskID(taskID)
				if err == nil && len(assignees) > 0 {
					for _, assignee := range assignees {
						h.notificationService.NotifyTaskStatusChanged(assignee.UserID, task.Title, req.Status, changerName, userID)
					}
				}
			}
		}

		// Уведомление о назначении
		if req.AssigneeID != "" && oldTask != nil {
			newAssigneeID, _ := uuid.Parse(req.AssigneeID)
			if (oldTask.AssigneeID == nil || *oldTask.AssigneeID != newAssigneeID) {
				h.notificationService.NotifyTaskAssigned(newAssigneeID, task.Title, changerName, userID)
			}
		}

		// Broadcast события обновления всем участникам команды для автообновления
		if h.teamRepo != nil {
			members, err := h.teamRepo.GetMembers(task.TeamID)
			if err == nil && len(members) > 0 {
				var userIDs []uuid.UUID
				for _, member := range members {
					userIDs = append(userIDs, member.UserID)
				}
				h.notificationService.BroadcastDataUpdate(userIDs)
			}
		}
	}

	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	// Получаем информацию о задаче перед удалением
	task, _ := h.taskService.GetByID(taskID, userID)

	// Сохраняем parent_task_id перед удалением
	var parentTaskID *uuid.UUID
	if task != nil {
		parentTaskID = task.ParentTaskID
	}

	if err := h.taskService.Delete(taskID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Если это была подзадача, обновляем родительскую задачу
	if parentTaskID != nil {
		if err := h.taskService.UpdateParentTaskStatus(*parentTaskID); err != nil {
			// Логируем ошибку, но продолжаем выполнение
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update parent task status after delete"})
			return
		}
	}

	// Отправляем уведомления всем связанным пользователям
	if h.notificationService != nil && task != nil {
		deleter, _ := h.userRepo.GetByID(userID)
		deleterName := "Someone"
		if deleter != nil {
			deleterName = deleter.Username
		}

		// Уведомляем создателя задачи
		h.notificationService.NotifyTaskDeleted(task.CreatorID, task.Title, deleterName, userID)

		// Уведомляем исполнителя (старая система)
		if task.AssigneeID != nil {
			h.notificationService.NotifyTaskDeleted(*task.AssigneeID, task.Title, deleterName, userID)
		}

		// Уведомляем всех assignees (новая система)
		if h.taskAssigneeRepo != nil {
			assignees, err := h.taskAssigneeRepo.GetAssigneesByTaskID(taskID)
			if err == nil && len(assignees) > 0 {
				for _, assignee := range assignees {
					h.notificationService.NotifyTaskDeleted(assignee.UserID, task.Title, deleterName, userID)
				}
			}
		}

		// Broadcast события обновления всем участникам команды для мгновенного обновления списка задач
		if h.teamRepo != nil {
			members, err := h.teamRepo.GetMembers(task.TeamID)
			if err == nil && len(members) > 0 {
				var userIDs []uuid.UUID
				for _, member := range members {
					userIDs = append(userIDs, member.UserID)
				}
				h.notificationService.BroadcastDataUpdate(userIDs)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "task deleted"})
}

func (h *TaskHandler) GetActivity(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	if h.activityService == nil {
		c.JSON(http.StatusOK, gin.H{"activity": []interface{}{}})
		return
	}

	logs, err := h.activityService.GetByTask(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if logs == nil {
		logs = []models.ActivityLog{}
	}

	c.JSON(http.StatusOK, gin.H{"activity": logs})
}

func (h *TaskHandler) GetSubtasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	parentTaskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	subtasks, err := h.taskService.GetSubtasks(parentTaskID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subtasks)
}
