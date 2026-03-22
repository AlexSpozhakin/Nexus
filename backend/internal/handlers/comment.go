package handlers

import (
	"log"
	"net/http"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"
	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CommentHandler struct {
	commentService      *services.CommentService
	notificationService *services.NotificationService
	activityService     *services.ActivityService
	taskRepo            *postgres.TaskRepository
	userRepo            *postgres.UserRepository
	teamRepo            *postgres.TeamRepository
	taskAssigneeRepo    *postgres.TaskAssigneeRepository
}

func NewCommentHandler(commentService *services.CommentService) *CommentHandler {
	return &CommentHandler{commentService: commentService}
}

func NewCommentHandlerWithNotifications(commentService *services.CommentService, notificationService *services.NotificationService, taskRepo *postgres.TaskRepository, userRepo *postgres.UserRepository, teamRepo *postgres.TeamRepository, taskAssigneeRepo *postgres.TaskAssigneeRepository) *CommentHandler {
	return &CommentHandler{
		commentService:      commentService,
		notificationService: notificationService,
		taskRepo:            taskRepo,
		userRepo:            userRepo,
		teamRepo:            teamRepo,
		taskAssigneeRepo:    taskAssigneeRepo,
	}
}

func (h *CommentHandler) SetActivityService(activityService *services.ActivityService) {
	h.activityService = activityService
}

func (h *CommentHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	var req models.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment, err := h.commentService.Create(taskID, &req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Логируем добавление комментария
	if h.activityService != nil {
		shortContent := req.Content
		if len(shortContent) > 80 {
			shortContent = shortContent[:80]
		}
		h.activityService.Log(taskID, userID, "comment_added", nil, &shortContent) //nolint
	}

	// Отправляем уведомления
	if h.notificationService != nil && h.taskRepo != nil && h.userRepo != nil && h.teamRepo != nil {
		task, _ := h.taskRepo.GetByID(taskID)
		commenter, _ := h.userRepo.GetByID(userID)

		commenterName := "Someone"
		if commenter != nil {
			commenterName = commenter.Username
		}

		if task != nil {
			log.Printf("📋 Task found: %s, TeamID: %s", task.Title, task.TeamID)

			// Уведомляем ВСЕХ участников команды о новом комментарии (кроме автора)
			// Логика: в небольших командах все должны видеть активность в задачах
			members, err := h.teamRepo.GetMembers(task.TeamID)
			log.Printf("📋 Got %d members for team %s, error: %v", len(members), task.TeamID, err)

			if len(members) > 0 {
				var memberIDs []uuid.UUID
				for _, member := range members {
					memberIDs = append(memberIDs, member.UserID)
					// Отправляем информационное уведомление каждому участнику (кроме автора комментария)
					h.notificationService.NotifyNewComment(member.UserID, task.Title, commenterName, req.Content, userID)
				}
				log.Printf("📋 Sending task_update to %d members: %v", len(memberIDs), memberIDs)
				h.notificationService.NotifyTaskUpdate(memberIDs, taskID, "new_comment")
			} else {
				log.Printf("⚠️ No members found for team %s!", task.TeamID)
			}
		} else {
			log.Printf("⚠️ Task not found!")
		}
	}

	c.JSON(http.StatusCreated, comment)
}

func (h *CommentHandler) GetByTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	comments, err := h.commentService.GetByTaskID(taskID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comments)
}

func (h *CommentHandler) Update(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	var req models.UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment, err := h.commentService.Update(commentID, &req, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Отправляем real-time обновление всем участникам команды
	if h.notificationService != nil && h.taskRepo != nil && h.teamRepo != nil {
		task, _ := h.taskRepo.GetByID(comment.TaskID)
		if task != nil {
			members, err := h.teamRepo.GetMembers(task.TeamID)
			if err == nil && len(members) > 0 {
				var memberIDs []uuid.UUID
				for _, member := range members {
					memberIDs = append(memberIDs, member.UserID)
				}
				h.notificationService.NotifyTaskUpdate(memberIDs, comment.TaskID, "comment_updated")
			}
		}
	}

	c.JSON(http.StatusOK, comment)
}

func (h *CommentHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	comment, err := h.commentService.Delete(commentID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Логируем удаление комментария
	if h.activityService != nil {
		h.activityService.Log(comment.TaskID, userID, "comment_deleted", nil, nil) //nolint
	}

	// Уведомляем автора, если его комментарий удалил кто-то другой
	if h.notificationService != nil && h.userRepo != nil && h.taskRepo != nil && h.teamRepo != nil {
		if comment.UserID != userID {
			deleter, _ := h.userRepo.GetByID(userID)
			task, _ := h.taskRepo.GetByID(comment.TaskID)
			deleterName := "Someone"
			if deleter != nil {
				deleterName = deleter.Username
			}
			taskTitle := "a task"
			if task != nil {
				taskTitle = task.Title
			}
			h.notificationService.Notify(
				comment.UserID,
				"comment_deleted",
				"Your comment was deleted",
				deleterName+" deleted your comment on: "+taskTitle,
				nil,
			)
		}

		// Real-time обновление всем участникам команды
		task, _ := h.taskRepo.GetByID(comment.TaskID)
		if task != nil {
			members, err := h.teamRepo.GetMembers(task.TeamID)
			if err == nil && len(members) > 0 {
				var memberIDs []uuid.UUID
				for _, member := range members {
					memberIDs = append(memberIDs, member.UserID)
				}
				h.notificationService.NotifyTaskUpdate(memberIDs, comment.TaskID, "comment_deleted")
			}
		}
		log.Printf("🗑️ Comment %s deleted by user %s", commentID, userID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "comment deleted"})
}
