package postgres

import (
	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TaskAssigneeRepository struct {
	db *sqlx.DB
}

func NewTaskAssigneeRepository(db *sqlx.DB) *TaskAssigneeRepository {
	return &TaskAssigneeRepository{db: db}
}

// AddAssignee добавляет исполнителя к задаче
func (r *TaskAssigneeRepository) AddAssignee(assignee *models.TaskAssignee) error {
	query := `
		INSERT INTO task_assignees (task_id, user_id, role, assigned_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, assigned_at
	`
	return r.db.QueryRow(
		query,
		assignee.TaskID,
		assignee.UserID,
		assignee.Role,
		assignee.AssignedBy,
	).Scan(&assignee.ID, &assignee.AssignedAt)
}

// GetAssigneesByTaskID получает всех исполнителей задачи
func (r *TaskAssigneeRepository) GetAssigneesByTaskID(taskID uuid.UUID) ([]models.TaskAssignee, error) {
	var assignees []models.TaskAssignee
	query := `
		SELECT ta.*, u.username as user_name, u.email as user_email
		FROM task_assignees ta
		JOIN users u ON ta.user_id = u.id
		WHERE ta.task_id = $1
		ORDER BY
			CASE ta.role
				WHEN 'owner' THEN 1
				WHEN 'assignee' THEN 2
				WHEN 'watcher' THEN 3
			END,
			ta.assigned_at ASC
	`
	err := r.db.Select(&assignees, query, taskID)
	return assignees, err
}

// GetTasksByAssignee получает все задачи, назначенные пользователю
func (r *TaskAssigneeRepository) GetTasksByAssignee(userID uuid.UUID) ([]uuid.UUID, error) {
	var taskIDs []uuid.UUID
	query := `
		SELECT DISTINCT task_id
		FROM task_assignees
		WHERE user_id = $1
	`
	err := r.db.Select(&taskIDs, query, userID)
	return taskIDs, err
}

// RemoveAssignee удаляет исполнителя из задачи
func (r *TaskAssigneeRepository) RemoveAssignee(taskID, userID uuid.UUID) error {
	query := `DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, taskID, userID)
	return err
}

// RemoveAllAssignees удаляет всех исполнителей задачи
func (r *TaskAssigneeRepository) RemoveAllAssignees(taskID uuid.UUID) error {
	query := `DELETE FROM task_assignees WHERE task_id = $1`
	_, err := r.db.Exec(query, taskID)
	return err
}

// UpdateAssigneeRole обновляет роль исполнителя
func (r *TaskAssigneeRepository) UpdateAssigneeRole(taskID, userID uuid.UUID, role string) error {
	query := `
		UPDATE task_assignees
		SET role = $1
		WHERE task_id = $2 AND user_id = $3
	`
	_, err := r.db.Exec(query, role, taskID, userID)
	return err
}

// IsAssignee проверяет, назначен ли пользователь на задачу
func (r *TaskAssigneeRepository) IsAssignee(taskID, userID uuid.UUID) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM task_assignees WHERE task_id = $1 AND user_id = $2`
	err := r.db.Get(&count, query, taskID, userID)
	return count > 0, err
}
