package postgres

import (
	"database/sql"
	"errors"
	"math"

	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type TaskRepository struct {
	db                     *sqlx.DB
	taskAssigneeRepository *TaskAssigneeRepository
}

func NewTaskRepository(db *sqlx.DB) *TaskRepository {
	return &TaskRepository{
		db:                     db,
		taskAssigneeRepository: NewTaskAssigneeRepository(db),
	}
}

func (r *TaskRepository) Create(task *models.Task) error {
	query := `
		INSERT INTO tasks (team_id, title, description, status, priority, assignee_id, creator_id, due_date, parent_task_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		query,
		task.TeamID,
		task.Title,
		task.Description,
		task.Status,
		task.Priority,
		task.AssigneeID,
		task.CreatorID,
		task.DueDate,
		task.ParentTaskID,
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
}

func (r *TaskRepository) GetByID(id uuid.UUID) (*models.Task, error) {
	var task models.Task
	query := `SELECT * FROM tasks WHERE id = $1`
	err := r.db.Get(&task, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &task, err
}

func (r *TaskRepository) GetByTeamID(teamID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	// Показываем только основные задачи (не подзадачи)
	query := `SELECT * FROM tasks WHERE team_id = $1 AND parent_task_id IS NULL ORDER BY created_at DESC`
	err := r.db.Select(&tasks, query, teamID)
	return tasks, err
}

func (r *TaskRepository) GetByAssignee(userID uuid.UUID) ([]models.Task, error) {
	var taskIDs []uuid.UUID

	// Сначала получаем ID задач, где пользователь является исполнителем
	query := `
		SELECT DISTINCT task_id
		FROM task_assignees
		WHERE user_id = $1
	`
	err := r.db.Select(&taskIDs, query, userID)
	if err != nil {
		return nil, err
	}

	if len(taskIDs) == 0 {
		return []models.Task{}, nil
	}

	// Затем получаем сами задачи (только основные, не подзадачи)
	var tasks []models.Task
	query2 := `
		SELECT * FROM tasks
		WHERE id = ANY($1) AND parent_task_id IS NULL
		ORDER BY created_at DESC
	`
	err = r.db.Select(&tasks, query2, pq.Array(taskIDs))
	return tasks, err
}

func (r *TaskRepository) Update(task *models.Task) error {
	query := `
		UPDATE tasks
		SET title = $1, description = $2, status = $3, priority = $4,
		    assignee_id = $5, due_date = $6, completed_at = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
	`
	_, err := r.db.Exec(
		query,
		task.Title,
		task.Description,
		task.Status,
		task.Priority,
		task.AssigneeID,
		task.DueDate,
		task.CompletedAt,
		task.ID,
	)
	return err
}

func (r *TaskRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM tasks WHERE id = $1`, id)
	return err
}

func (r *TaskRepository) GetOverdueTasks() ([]models.Task, error) {
	var tasks []models.Task
	query := `
		SELECT * FROM tasks
		WHERE due_date < CURRENT_TIMESTAMP
		AND status != 'done'
		AND deadline_notified = false
		ORDER BY due_date ASC
	`
	err := r.db.Select(&tasks, query)
	return tasks, err
}

func (r *TaskRepository) MarkDeadlineNotified(taskID uuid.UUID) error {
	query := `UPDATE tasks SET deadline_notified = true WHERE id = $1`
	_, err := r.db.Exec(query, taskID)
	return err
}

func (r *TaskRepository) GetSubtasks(parentTaskID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	query := `SELECT * FROM tasks WHERE parent_task_id = $1 ORDER BY created_at ASC`
	err := r.db.Select(&tasks, query, parentTaskID)
	return tasks, err
}

// LoadAssignees загружает исполнителей для задачи
func (r *TaskRepository) LoadAssignees(task *models.Task) error {
	assignees, err := r.taskAssigneeRepository.GetAssigneesByTaskID(task.ID)
	if err != nil {
		return err
	}
	task.Assignees = assignees
	return nil
}

// LoadAssigneesForTasks загружает исполнителей для списка задач
func (r *TaskRepository) LoadAssigneesForTasks(tasks []models.Task) error {
	for i := range tasks {
		if err := r.LoadAssignees(&tasks[i]); err != nil {
			return err
		}
	}
	return nil
}

// GetStats возвращает статистику задач пользователя за период (week/month/all)
func (r *TaskRepository) GetStats(userID uuid.UUID, period string) (*models.StatsResponse, error) {
	var periodFilter string
	switch period {
	case "week":
		periodFilter = "AND t.created_at >= NOW() - INTERVAL '7 days'"
	case "month":
		periodFilter = "AND t.created_at >= NOW() - INTERVAL '30 days'"
	default:
		periodFilter = ""
	}

	query := `
		SELECT
			COUNT(*) FILTER (WHERE t.status = 'done') AS completed,
			COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status != 'done') AS overdue,
			COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress,
			COUNT(*) FILTER (WHERE t.status = 'todo') AS todo,
			COUNT(*) AS total
		FROM tasks t
		JOIN task_assignees ta ON ta.task_id = t.id
		WHERE ta.user_id = $1
		` + periodFilter

	var stats models.StatsResponse
	row := r.db.QueryRow(query, userID)
	err := row.Scan(&stats.Completed, &stats.Overdue, &stats.InProgress, &stats.Todo, &stats.Total)
	if err != nil {
		return nil, err
	}
	if stats.Total > 0 {
		stats.CompletionRate = math.Round(float64(stats.Completed)/float64(stats.Total)*100*10) / 10
	}
	return &stats, nil
}
