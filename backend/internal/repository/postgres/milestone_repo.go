package postgres

import (
	"task-manager/internal/models"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type MilestoneRepository struct {
	db *sqlx.DB
}

func NewMilestoneRepository(db *sqlx.DB) *MilestoneRepository {
	return &MilestoneRepository{db: db}
}

// GetActiveMilestone returns the nearest active milestone for a team, with task counts.
func (r *MilestoneRepository) GetActiveMilestone(teamID uuid.UUID) (*models.Milestone, error) {
	var m models.Milestone
	err := r.db.QueryRowx(`
		SELECT
			m.id, m.team_id, m.title, COALESCE(m.description, '') AS description,
			m.due_date, m.status, m.created_by, m.created_at, m.updated_at, m.completed_at,
			(SELECT COUNT(*) FROM tasks WHERE team_id = $1) AS total_tasks,
			(SELECT COUNT(*) FROM tasks WHERE team_id = $1 AND status = 'done') AS completed_tasks
		FROM milestones m
		WHERE m.team_id = $1 AND m.status = 'active'
		ORDER BY m.due_date ASC
		LIMIT 1
	`, teamID).StructScan(&m)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// GetByID returns a single milestone by its ID.
func (r *MilestoneRepository) GetByID(id uuid.UUID) (*models.Milestone, error) {
	var m models.Milestone
	err := r.db.QueryRowx(`
		SELECT
			m.id, m.team_id, m.title, COALESCE(m.description, '') AS description,
			m.due_date, m.status, m.created_by, m.created_at, m.updated_at, m.completed_at,
			0 AS total_tasks, 0 AS completed_tasks
		FROM milestones m
		WHERE m.id = $1
	`, id).StructScan(&m)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// GetAll returns all milestones for a team, with task counts.
func (r *MilestoneRepository) GetAll(teamID uuid.UUID) ([]models.Milestone, error) {
	var milestones []models.Milestone
	rows, err := r.db.Queryx(`
		SELECT
			m.id, m.team_id, m.title, COALESCE(m.description, '') AS description,
			m.due_date, m.status, m.created_by, m.created_at, m.updated_at, m.completed_at,
			(SELECT COUNT(*) FROM tasks WHERE team_id = $1) AS total_tasks,
			(SELECT COUNT(*) FROM tasks WHERE team_id = $1 AND status = 'done') AS completed_tasks
		FROM milestones m
		WHERE m.team_id = $1
		ORDER BY m.due_date ASC
	`, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var m models.Milestone
		if err := rows.StructScan(&m); err != nil {
			return nil, err
		}
		milestones = append(milestones, m)
	}
	if milestones == nil {
		milestones = []models.Milestone{}
	}
	return milestones, nil
}

// Create inserts a new milestone.
func (r *MilestoneRepository) Create(m *models.Milestone) error {
	return r.db.QueryRowx(`
		INSERT INTO milestones (team_id, title, description, due_date, status, created_by)
		VALUES ($1, $2, $3, $4, 'active', $5)
		RETURNING id, created_at, updated_at
	`, m.TeamID, m.Title, m.Description, m.DueDate, m.CreatedBy).
		Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
}

// Update modifies an existing milestone.
func (r *MilestoneRepository) Update(m *models.Milestone) error {
	m.UpdatedAt = time.Now().UTC()
	_, err := r.db.Exec(`
		UPDATE milestones
		SET title = $1, description = $2, due_date = $3, status = $4, updated_at = $5
		WHERE id = $6
	`, m.Title, m.Description, m.DueDate, m.Status, m.UpdatedAt, m.ID)
	return err
}

// Complete marks a milestone as completed.
func (r *MilestoneRepository) Complete(id uuid.UUID) error {
	_, err := r.db.Exec(`
		UPDATE milestones
		SET status = 'completed', completed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}

// Delete removes a milestone by ID.
func (r *MilestoneRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM milestones WHERE id = $1`, id)
	return err
}
