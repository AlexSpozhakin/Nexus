package postgres

import (
	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ActivityLogRepository struct {
	db *sqlx.DB
}

func NewActivityLogRepository(db *sqlx.DB) *ActivityLogRepository {
	return &ActivityLogRepository{db: db}
}

// Log inserts a new activity record for a task.
func (r *ActivityLogRepository) Log(taskID, userID uuid.UUID, actionType string, oldVal, newVal *string) error {
	query := `
		INSERT INTO task_activity_log (task_id, user_id, action_type, old_value, new_value)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(query, taskID, userID, actionType, oldVal, newVal)
	return err
}

// GetByTask returns the last 100 activity entries for a task, newest first.
func (r *ActivityLogRepository) GetByTask(taskID uuid.UUID) ([]models.ActivityLog, error) {
	var logs []models.ActivityLog
	query := `
		SELECT
			al.id,
			al.task_id,
			al.user_id,
			al.action_type,
			al.old_value,
			al.new_value,
			al.created_at,
			COALESCE(u.username, '') AS user_name
		FROM task_activity_log al
		LEFT JOIN users u ON al.user_id = u.id
		WHERE al.task_id = $1
		ORDER BY al.created_at DESC
		LIMIT 100
	`
	err := r.db.Select(&logs, query, taskID)
	if err != nil {
		return nil, err
	}
	return logs, nil
}
