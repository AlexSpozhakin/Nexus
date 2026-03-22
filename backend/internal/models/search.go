package models

import (
	"github.com/google/uuid"
	"time"
)

type SearchResultItem struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Type      string    `json:"type" db:"type"`
	Title     string    `json:"title" db:"title"`
	Excerpt   string    `json:"excerpt" db:"excerpt"`
	TeamID    uuid.UUID `json:"team_id" db:"team_id"`
	TeamName  string    `json:"team_name" db:"team_name"`
	Status    string    `json:"status,omitempty" db:"status"`
	Priority  string    `json:"priority,omitempty" db:"priority"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type SearchResponse struct {
	Tasks []SearchResultItem `json:"tasks"`
	Notes []SearchResultItem `json:"notes"`
	Total int                `json:"total"`
}
