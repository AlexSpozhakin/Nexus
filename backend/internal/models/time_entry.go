package models

import (
	"github.com/google/uuid"
	"time"
)

type TimeEntry struct {
	ID              uuid.UUID `json:"id" db:"id"`
	TaskID          uuid.UUID `json:"task_id" db:"task_id"`
	UserID          uuid.UUID `json:"user_id" db:"user_id"`
	Username        string    `json:"username,omitempty" db:"username"`
	StartedAt       time.Time `json:"started_at" db:"started_at"`
	DurationSeconds int       `json:"duration_seconds" db:"duration_seconds"`
	Note            string    `json:"note,omitempty" db:"note"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

type CreateTimeEntryRequest struct {
	StartedAt       string `json:"started_at" binding:"required"`
	DurationSeconds int    `json:"duration_seconds" binding:"required,min=1"`
	Note            string `json:"note"`
}

type TimeEntrySummary struct {
	Entries      []TimeEntry `json:"entries"`
	TotalSeconds int         `json:"total_seconds"`
}
