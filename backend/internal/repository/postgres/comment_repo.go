package postgres

import (
	"database/sql"
	"errors"

	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type CommentRepository struct {
	db *sqlx.DB
}

func NewCommentRepository(db *sqlx.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) Create(comment *models.Comment) error {
	query := `
		INSERT INTO comments (task_id, user_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, is_edited, created_at, updated_at
	`
	return r.db.QueryRow(query, comment.TaskID, comment.UserID, comment.Content).
		Scan(&comment.ID, &comment.IsEdited, &comment.CreatedAt, &comment.UpdatedAt)
}

func (r *CommentRepository) GetByID(id uuid.UUID) (*models.Comment, error) {
	var comment models.Comment
	query := `SELECT id, task_id, user_id, content, is_edited, created_at, updated_at FROM comments WHERE id = $1`
	err := r.db.Get(&comment, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &comment, err
}

func (r *CommentRepository) GetByTaskID(taskID uuid.UUID) ([]models.Comment, error) {
	var comments []models.Comment
	query := `
		SELECT c.id, c.task_id, c.user_id, c.content, c.is_edited, c.created_at, c.updated_at, u.username
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.task_id = $1
		ORDER BY c.created_at ASC
	`
	err := r.db.Select(&comments, query, taskID)
	return comments, err
}

func (r *CommentRepository) Update(id uuid.UUID, content string) (*models.Comment, error) {
	var comment models.Comment
	query := `
		UPDATE comments
		SET content = $1, is_edited = true, updated_at = NOW()
		WHERE id = $2
		RETURNING id, task_id, user_id, content, is_edited, created_at, updated_at
	`
	err := r.db.Get(&comment, query, content, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &comment, err
}

func (r *CommentRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM comments WHERE id = $1`, id)
	return err
}
