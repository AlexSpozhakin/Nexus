package models

import (
	"time"

	"github.com/google/uuid"
)

type Task struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	TeamID           uuid.UUID  `json:"team_id" db:"team_id"`
	Title            string     `json:"title" db:"title"`
	Description      string     `json:"description" db:"description"`
	Status           string     `json:"status" db:"status"`
	Priority         string     `json:"priority" db:"priority"`
	AssigneeID       *uuid.UUID `json:"assignee_id" db:"assignee_id"`
	CreatorID        uuid.UUID  `json:"creator_id" db:"creator_id"`
	DueDate          *time.Time `json:"due_date" db:"due_date"`
	CompletedAt      *time.Time `json:"completed_at" db:"completed_at"`
	ParentTaskID     *uuid.UUID `json:"parent_task_id" db:"parent_task_id"`
	DeadlineNotified bool       `json:"deadline_notified" db:"deadline_notified"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`

	// Для отображения
	AssigneeName string          `json:"assignee_name,omitempty" db:"-"`
	CreatorName  string          `json:"creator_name,omitempty" db:"-"`
	Subtasks     []Task          `json:"subtasks,omitempty" db:"-"`
	Assignees    []TaskAssignee  `json:"assignees,omitempty" db:"-"`
	Labels       []Label         `json:"labels,omitempty" db:"-"`
}

type TaskAssignee struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	TaskID     uuid.UUID  `json:"task_id" db:"task_id"`
	UserID     uuid.UUID  `json:"user_id" db:"user_id"`
	Role       string     `json:"role" db:"role"` // 'owner', 'assignee', 'watcher'
	AssignedAt time.Time  `json:"assigned_at" db:"assigned_at"`
	AssignedBy *uuid.UUID `json:"assigned_by" db:"assigned_by"`

	// Для отображения
	UserName  string `json:"user_name,omitempty" db:"user_name"`
	UserEmail string `json:"user_email,omitempty" db:"user_email"`
}

type AssigneeInput struct {
	UserID string `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"required,oneof=owner assignee watcher"`
}

type CreateTaskRequest struct {
	Title        string          `json:"title" binding:"required,min=1,max=200"`
	Description  string          `json:"description" binding:"max=2000"`
	Priority     string          `json:"priority" binding:"required,oneof=low medium high"`
	AssigneeID   string          `json:"assignee_id"` // Сохраняем для обратной совместимости
	Assignees    []AssigneeInput `json:"assignees"`   // Новое поле для множественного назначения
	DueDate      string          `json:"due_date"`
	ParentTaskID string          `json:"parent_task_id"`
}

type UpdateTaskRequest struct {
	Title       string          `json:"title" binding:"max=200"`
	Description string          `json:"description" binding:"max=2000"`
	Status      string          `json:"status" binding:"omitempty,oneof=todo in_progress done"`
	Priority    string          `json:"priority" binding:"omitempty,oneof=low medium high"`
	AssigneeID  string          `json:"assignee_id"` // Сохраняем для обратной совместимости
	Assignees   []AssigneeInput `json:"assignees"`   // Новое поле для множественного назначения
	DueDate     string          `json:"due_date"`
}
