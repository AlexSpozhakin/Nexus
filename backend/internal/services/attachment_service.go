package services

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

const (
	maxFileSize    = 20 * 1024 * 1024 // 20 MB
	uploadsBaseDir = "./uploads"
)

var allowedMimeTypes = map[string]bool{
	"application/pdf":                                                               true,
	"application/msword":                                                            true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":       true,
	"application/vnd.ms-excel":                                                      true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":             true,
	"application/vnd.ms-powerpoint":                                                 true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation":     true,
	"image/jpeg":  true,
	"image/png":   true,
	"image/gif":   true,
	"image/webp":  true,
	"text/plain":  true,
	"text/csv":    true,
	// Архивы
	"application/zip":              true,
	"application/x-zip-compressed": true,
	"application/x-rar-compressed": true,
	"application/x-7z-compressed":  true,
	"application/gzip":             true,
	"application/x-tar":            true,
}

type AttachmentService struct {
	attachmentRepo *postgres.AttachmentRepository
	taskRepo       *postgres.TaskRepository
	teamRepo       *postgres.TeamRepository
}

func NewAttachmentService(
	attachmentRepo *postgres.AttachmentRepository,
	taskRepo *postgres.TaskRepository,
	teamRepo *postgres.TeamRepository,
) *AttachmentService {
	return &AttachmentService{
		attachmentRepo: attachmentRepo,
		taskRepo:       taskRepo,
		teamRepo:       teamRepo,
	}
}

// Upload загружает файл и сохраняет запись в БД.
// Передать taskID или teamID (один из них, не оба).
func (s *AttachmentService) Upload(
	file multipart.File,
	header *multipart.FileHeader,
	taskID *uuid.UUID,
	teamID *uuid.UUID,
	uploaderID uuid.UUID,
) (*models.Attachment, error) {
	// Валидация размера
	if header.Size > maxFileSize {
		return nil, fmt.Errorf("file too large: max %d MB", maxFileSize/1024/1024)
	}

	// Определяем MIME-тип: сначала по расширению, потом по заголовку, потом по содержимому
	mimeType := mimeByExtension(header.Filename)
	if mimeType == "" {
		// Fallback на заголовок части formdata
		ct := header.Header.Get("Content-Type")
		if idx := strings.Index(ct, ";"); idx != -1 {
			ct = strings.TrimSpace(ct[:idx])
		}
		mimeType = ct
	}
	if mimeType == "" || mimeType == "application/octet-stream" {
		// Последний fallback — читаем первые 512 байт для детекта
		buf := make([]byte, 512)
		n, _ := file.Read(buf)
		mimeType = http.DetectContentType(buf[:n])
		// Сбрасываем позицию обратно
		file.Seek(0, 0)
		// DetectContentType может вернуть "text/plain; charset=utf-8" — нормализуем
		if idx := strings.Index(mimeType, ";"); idx != -1 {
			mimeType = strings.TrimSpace(mimeType[:idx])
		}
	}
	if !allowedMimeTypes[mimeType] {
		return nil, fmt.Errorf("file type not allowed: %s", mimeType)
	}

	// Проверяем права доступа
	if taskID != nil {
		task, err := s.taskRepo.GetByID(*taskID)
		if err != nil || task == nil {
			return nil, errors.New("task not found")
		}
	}
	if teamID != nil {
		team, err := s.teamRepo.GetByID(*teamID)
		if err != nil || team == nil {
			return nil, errors.New("team not found")
		}
	}

	// Определяем папку: uploads/tasks/<taskID>/ или uploads/teams/<teamID>/
	var subDir string
	if taskID != nil {
		subDir = filepath.Join(uploadsBaseDir, "tasks", taskID.String())
	} else {
		subDir = filepath.Join(uploadsBaseDir, "teams", teamID.String())
	}
	if err := os.MkdirAll(subDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Уникальное имя файла: <timestamp>_<uuid>_<originalname>
	safeFileName := sanitizeFileName(header.Filename)
	storageFileName := fmt.Sprintf("%d_%s_%s", time.Now().UnixNano(), uuid.New().String()[:8], safeFileName)
	storagePath := filepath.Join(subDir, storageFileName)

	// Сохраняем файл на диск
	dst, err := os.Create(storagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(storagePath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Сохраняем в БД
	attachment := &models.Attachment{
		TaskID:      taskID,
		TeamID:      teamID,
		UploadedBy:  uploaderID,
		FileName:    header.Filename,
		FileSize:    header.Size,
		MimeType:    mimeType,
		StoragePath: storagePath,
	}

	if err := s.attachmentRepo.Create(attachment); err != nil {
		os.Remove(storagePath)
		return nil, fmt.Errorf("failed to save attachment record: %w", err)
	}

	return attachment, nil
}

func (s *AttachmentService) GetByTaskID(taskID uuid.UUID) ([]models.Attachment, error) {
	return s.attachmentRepo.GetByTaskID(taskID)
}

func (s *AttachmentService) GetByTeamID(teamID uuid.UUID) ([]models.Attachment, error) {
	return s.attachmentRepo.GetByTeamID(teamID)
}

// GetFile возвращает путь к файлу и метаданные для скачивания.
func (s *AttachmentService) GetFile(attachmentID uuid.UUID) (*models.Attachment, error) {
	a, err := s.attachmentRepo.GetByID(attachmentID)
	if err != nil {
		return nil, err
	}
	if a == nil {
		return nil, errors.New("attachment not found")
	}
	// Проверяем что файл существует на диске
	if _, err := os.Stat(a.StoragePath); os.IsNotExist(err) {
		return nil, errors.New("file not found on disk")
	}
	return a, nil
}

// Delete удаляет файл с диска и запись из БД.
func (s *AttachmentService) Delete(attachmentID uuid.UUID, userID uuid.UUID) error {
	a, err := s.attachmentRepo.GetByID(attachmentID)
	if err != nil {
		return err
	}
	if a == nil {
		return errors.New("attachment not found")
	}
	// Только загрузивший может удалить
	if a.UploadedBy != userID {
		return errors.New("only the uploader can delete this attachment")
	}
	// Удаляем файл с диска
	_ = os.Remove(a.StoragePath)
	// Удаляем запись из БД
	return s.attachmentRepo.Delete(attachmentID)
}

// mimeByExtension возвращает MIME-тип по расширению файла.
func mimeByExtension(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	m := map[string]string{
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":  "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".txt":  "text/plain",
		".csv":  "text/csv",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
		".7z":   "application/x-7z-compressed",
		".gz":   "application/gzip",
		".tar":  "application/x-tar",
	}
	return m[ext]
}

// sanitizeFileName очищает имя файла от небезопасных символов.
func sanitizeFileName(name string) string {
	// Берём только базовое имя (без директорий)
	name = filepath.Base(name)
	// Заменяем пробелы и спецсимволы на _
	var sb strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '.' || r == '-' {
			sb.WriteRune(r)
		} else {
			sb.WriteRune('_')
		}
	}
	result := sb.String()
	if result == "" || result == "." {
		result = "file"
	}
	return result
}
