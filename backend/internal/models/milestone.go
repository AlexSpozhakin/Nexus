package models

import (
	"time"

	"github.com/google/uuid"
)

type Milestone struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TeamID      uuid.UUID  `db:"team_id" json:"team_id"`
	Title       string     `db:"title" json:"title"`
	Description string     `db:"description" json:"description"`
	DueDate     time.Time  `db:"due_date" json:"due_date"`
	Status      string     `db:"status" json:"status"`
	CreatedBy   *uuid.UUID `db:"created_by" json:"created_by"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	CompletedAt *time.Time `db:"completed_at" json:"completed_at"`
	// Computed
	TotalTasks     int `db:"total_tasks" json:"total_tasks"`
	CompletedTasks int `db:"completed_tasks" json:"completed_tasks"`
}

type CreateMilestoneRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	DueDate     string `json:"due_date" binding:"required"`
}

type UpdateMilestoneRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	DueDate     string `json:"due_date"`
	Status      string `json:"status"`
}
