package models

import (
	"time"

	"github.com/google/uuid"
)

type Label struct {
	ID        uuid.UUID `json:"id" db:"id"`
	TeamID    uuid.UUID `json:"team_id" db:"team_id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`
	CreatedBy uuid.UUID `json:"created_by" db:"created_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type TaskLabel struct {
	TaskID     uuid.UUID `json:"task_id" db:"task_id"`
	LabelID    uuid.UUID `json:"label_id" db:"label_id"`
	AssignedAt time.Time `json:"assigned_at" db:"assigned_at"`
}

type CreateLabelRequest struct {
	Name  string `json:"name" binding:"required,min=1,max=50"`
	Color string `json:"color" binding:"required,len=7"`
}

type UpdateLabelRequest struct {
	Name  string `json:"name" binding:"omitempty,min=1,max=50"`
	Color string `json:"color" binding:"omitempty,len=7"`
}

type AddTaskLabelRequest struct {
	LabelID string `json:"label_id" binding:"required"`
}
