package postgres

import (
	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TimeEntryRepository struct {
	db *sqlx.DB
}

func NewTimeEntryRepository(db *sqlx.DB) *TimeEntryRepository {
	return &TimeEntryRepository{db: db}
}

func (r *TimeEntryRepository) Create(entry *models.TimeEntry) error {
	return r.db.QueryRow(`
		INSERT INTO time_entries (task_id, user_id, started_at, duration_seconds, note)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`, entry.TaskID, entry.UserID, entry.StartedAt, entry.DurationSeconds, entry.Note).
		Scan(&entry.ID, &entry.CreatedAt)
}

func (r *TimeEntryRepository) GetByTask(taskID uuid.UUID) ([]models.TimeEntry, error) {
	var entries []models.TimeEntry
	err := r.db.Select(&entries, `
		SELECT te.id, te.task_id, te.user_id, u.username,
		       te.started_at, te.duration_seconds, te.note, te.created_at
		FROM time_entries te
		JOIN users u ON te.user_id = u.id
		WHERE te.task_id = $1
		ORDER BY te.started_at DESC
	`, taskID)
	if entries == nil {
		entries = []models.TimeEntry{}
	}
	return entries, err
}

func (r *TimeEntryRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM time_entries WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *TimeEntryRepository) GetTotalSeconds(taskID uuid.UUID) (int, error) {
	var total int
	err := r.db.QueryRow(`SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries WHERE task_id = $1`, taskID).Scan(&total)
	return total, err
}
