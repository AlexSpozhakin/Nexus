package postgres

import (
	"database/sql"
	"errors"

	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type NoteRepository struct {
	db *sqlx.DB
}

func NewNoteRepository(db *sqlx.DB) *NoteRepository {
	return &NoteRepository{db: db}
}

func (r *NoteRepository) Create(note *models.Note) error {
	query := `
		INSERT INTO notes (team_id, author_id, title, content, is_shared)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		query,
		note.TeamID,
		note.AuthorID,
		note.Title,
		note.Content,
		note.IsShared,
	).Scan(&note.ID, &note.CreatedAt, &note.UpdatedAt)
}

func (r *NoteRepository) GetByID(id uuid.UUID) (*models.Note, error) {
	var note models.Note
	query := `SELECT * FROM notes WHERE id = $1`
	err := r.db.Get(&note, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &note, err
}

func (r *NoteRepository) GetByTeamID(teamID uuid.UUID, userID uuid.UUID) ([]models.Note, error) {
	var notes []models.Note
	query := `
		SELECT * FROM notes 
		WHERE team_id = $1 AND (is_shared = true OR author_id = $2)
		ORDER BY created_at DESC
	`
	err := r.db.Select(&notes, query, teamID, userID)
	return notes, err
}

func (r *NoteRepository) Update(note *models.Note) error {
	query := `
		UPDATE notes 
		SET title = $1, content = $2, is_shared = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`
	_, err := r.db.Exec(query, note.Title, note.Content, note.IsShared, note.ID)
	return err
}

func (r *NoteRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM notes WHERE id = $1`, id)
	return err
}
