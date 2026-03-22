package postgres

import (
	"database/sql"
	"errors"

	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AttachmentRepository struct {
	db *sqlx.DB
}

func NewAttachmentRepository(db *sqlx.DB) *AttachmentRepository {
	return &AttachmentRepository{db: db}
}

func (r *AttachmentRepository) Create(a *models.Attachment) error {
	query := `
		INSERT INTO attachments (task_id, team_id, uploaded_by, file_name, file_size, mime_type, storage_path)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.db.QueryRow(query,
		a.TaskID, a.TeamID, a.UploadedBy,
		a.FileName, a.FileSize, a.MimeType, a.StoragePath,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *AttachmentRepository) GetByID(id uuid.UUID) (*models.Attachment, error) {
	var a models.Attachment
	query := `
		SELECT a.id, a.task_id, a.team_id, a.uploaded_by, a.file_name, a.file_size,
		       a.mime_type, a.storage_path, a.created_at, u.username AS uploader_name
		FROM attachments a
		JOIN users u ON a.uploaded_by = u.id
		WHERE a.id = $1
	`
	err := r.db.Get(&a, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &a, err
}

func (r *AttachmentRepository) GetByTaskID(taskID uuid.UUID) ([]models.Attachment, error) {
	var list []models.Attachment
	query := `
		SELECT a.id, a.task_id, a.team_id, a.uploaded_by, a.file_name, a.file_size,
		       a.mime_type, a.storage_path, a.created_at, u.username AS uploader_name
		FROM attachments a
		JOIN users u ON a.uploaded_by = u.id
		WHERE a.task_id = $1
		ORDER BY a.created_at DESC
	`
	err := r.db.Select(&list, query, taskID)
	return list, err
}

func (r *AttachmentRepository) GetByTeamID(teamID uuid.UUID) ([]models.Attachment, error) {
	var list []models.Attachment
	query := `
		SELECT a.id, a.task_id, a.team_id, a.uploaded_by, a.file_name, a.file_size,
		       a.mime_type, a.storage_path, a.created_at, u.username AS uploader_name
		FROM attachments a
		JOIN users u ON a.uploaded_by = u.id
		WHERE a.team_id = $1
		ORDER BY a.created_at DESC
	`
	err := r.db.Select(&list, query, teamID)
	return list, err
}

func (r *AttachmentRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM attachments WHERE id = $1`, id)
	return err
}
