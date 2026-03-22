package models

import (
	"time"

	"github.com/google/uuid"
)

type Note struct {
	ID        uuid.UUID `json:"id" db:"id"`
	TeamID    uuid.UUID `json:"team_id" db:"team_id"`
	AuthorID  uuid.UUID `json:"author_id" db:"author_id"`
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	IsShared  bool      `json:"is_shared" db:"is_shared"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateNoteRequest struct {
	Title    string `json:"title" binding:"required,min=1,max=200"`
	Content  string `json:"content" binding:"required"`
	IsShared bool   `json:"is_shared"`
}

type UpdateNoteRequest struct {
	Title    string `json:"title" binding:"max=200"`
	Content  string `json:"content"`
	IsShared *bool  `json:"is_shared"`
}
