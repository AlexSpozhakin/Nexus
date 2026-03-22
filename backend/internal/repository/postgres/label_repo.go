package postgres

import (
	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type LabelRepository struct {
	db *sqlx.DB
}

func NewLabelRepository(db *sqlx.DB) *LabelRepository {
	return &LabelRepository{db: db}
}

func (r *LabelRepository) Create(label *models.Label) error {
	query := `
		INSERT INTO labels (id, team_id, name, color, created_by, created_at)
		VALUES (:id, :team_id, :name, :color, :created_by, :created_at)
	`
	_, err := r.db.NamedExec(query, label)
	return err
}

func (r *LabelRepository) GetByTeam(teamID uuid.UUID) ([]models.Label, error) {
	var labels []models.Label
	err := r.db.Select(&labels, `
		SELECT id, team_id, name, color, created_by, created_at
		FROM labels
		WHERE team_id = $1
		ORDER BY name ASC
	`, teamID)
	return labels, err
}

func (r *LabelRepository) GetByID(id uuid.UUID) (*models.Label, error) {
	var label models.Label
	err := r.db.Get(&label, `SELECT id, team_id, name, color, created_by, created_at FROM labels WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return &label, nil
}

func (r *LabelRepository) Update(label *models.Label) error {
	_, err := r.db.Exec(`
		UPDATE labels SET name = $1, color = $2 WHERE id = $3
	`, label.Name, label.Color, label.ID)
	return err
}

func (r *LabelRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM labels WHERE id = $1`, id)
	return err
}

func (r *LabelRepository) AddToTask(taskID, labelID uuid.UUID) error {
	_, err := r.db.Exec(`
		INSERT INTO task_labels (task_id, label_id, assigned_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT DO NOTHING
	`, taskID, labelID)
	return err
}

func (r *LabelRepository) RemoveFromTask(taskID, labelID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2`, taskID, labelID)
	return err
}

func (r *LabelRepository) GetByTask(taskID uuid.UUID) ([]models.Label, error) {
	var labels []models.Label
	err := r.db.Select(&labels, `
		SELECT l.id, l.team_id, l.name, l.color, l.created_by, l.created_at
		FROM labels l
		JOIN task_labels tl ON tl.label_id = l.id
		WHERE tl.task_id = $1
		ORDER BY l.name ASC
	`, taskID)
	return labels, err
}

func (r *LabelRepository) GetByTasks(taskIDs []uuid.UUID) (map[uuid.UUID][]models.Label, error) {
	result := make(map[uuid.UUID][]models.Label)
	if len(taskIDs) == 0 {
		return result, nil
	}

	query, args, err := sqlx.In(`
		SELECT l.id, l.team_id, l.name, l.color, l.created_by, l.created_at, tl.task_id
		FROM labels l
		JOIN task_labels tl ON tl.label_id = l.id
		WHERE tl.task_id IN (?)
		ORDER BY l.name ASC
	`, taskIDs)
	if err != nil {
		return nil, err
	}
	query = r.db.Rebind(query)

	rows, err := r.db.Queryx(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var label models.Label
		var taskID uuid.UUID
		if err := rows.Scan(&label.ID, &label.TeamID, &label.Name, &label.Color, &label.CreatedBy, &label.CreatedAt, &taskID); err != nil {
			continue
		}
		result[taskID] = append(result[taskID], label)
	}
	return result, nil
}

func (r *LabelRepository) GetLabelStats(teamID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.db.Queryx(`
		SELECT l.id, l.name, l.color, COUNT(tl.task_id) as task_count
		FROM labels l
		LEFT JOIN task_labels tl ON tl.label_id = l.id
		WHERE l.team_id = $1
		GROUP BY l.id, l.name, l.color
		ORDER BY task_count DESC, l.name ASC
	`, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		if err := rows.MapScan(row); err != nil {
			continue
		}
		stats = append(stats, row)
	}
	return stats, nil
}
