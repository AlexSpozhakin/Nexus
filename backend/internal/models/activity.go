package models

import (
	"time"

	"github.com/google/uuid"
)

type ActivityLog struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	TaskID     uuid.UUID  `db:"task_id" json:"task_id"`
	UserID     *uuid.UUID `db:"user_id" json:"user_id"`
	ActionType string     `db:"action_type" json:"action_type"`
	OldValue   *string    `db:"old_value" json:"old_value"`
	NewValue   *string    `db:"new_value" json:"new_value"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	// Joined fields
	UserName string `db:"user_name" json:"user_name"`
}
