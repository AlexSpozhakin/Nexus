package models

import (
	"time"

	"github.com/google/uuid"
)

type Attachment struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TaskID      *uuid.UUID `json:"task_id,omitempty" db:"task_id"`
	TeamID      *uuid.UUID `json:"team_id,omitempty" db:"team_id"`
	UploadedBy  uuid.UUID  `json:"uploaded_by" db:"uploaded_by"`
	FileName    string     `json:"file_name" db:"file_name"`
	FileSize    int64      `json:"file_size" db:"file_size"`
	MimeType    string     `json:"mime_type" db:"mime_type"`
	StoragePath string     `json:"-" db:"storage_path"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`

	// Для отображения
	UploaderName string `json:"uploader_name,omitempty" db:"uploader_name"`
}
