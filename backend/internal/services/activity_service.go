package services

import (
	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type ActivityService struct {
	repo *postgres.ActivityLogRepository
}

func NewActivityService(repo *postgres.ActivityLogRepository) *ActivityService {
	return &ActivityService{repo: repo}
}

// Log records an activity entry. Errors are non-fatal — log silently.
func (s *ActivityService) Log(taskID, userID uuid.UUID, actionType string, oldVal, newVal *string) error {
	return s.repo.Log(taskID, userID, actionType, oldVal, newVal)
}

// GetByTask returns activity log for a task.
func (s *ActivityService) GetByTask(taskID uuid.UUID) ([]models.ActivityLog, error) {
	return s.repo.GetByTask(taskID)
}
