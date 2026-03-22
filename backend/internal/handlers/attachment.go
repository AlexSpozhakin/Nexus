package handlers

import (
	"net/http"
	"path/filepath"

	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AttachmentHandler struct {
	attachmentService *services.AttachmentService
}

func NewAttachmentHandler(attachmentService *services.AttachmentService) *AttachmentHandler {
	return &AttachmentHandler{attachmentService: attachmentService}
}

// UploadToTask POST /tasks/:id/attachments
func (h *AttachmentHandler) UploadToTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	attachment, err := h.attachmentService.Upload(file, header, &taskID, nil, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

// UploadToTeam POST /teams/:id/attachments
func (h *AttachmentHandler) UploadToTeam(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	attachment, err := h.attachmentService.Upload(file, header, nil, &teamID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

// GetByTask GET /tasks/:id/attachments
func (h *AttachmentHandler) GetByTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	attachments, err := h.attachmentService.GetByTaskID(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attachments)
}

// GetByTeam GET /teams/:id/attachments
func (h *AttachmentHandler) GetByTeam(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	attachments, err := h.attachmentService.GetByTeamID(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attachments)
}

// Download GET /attachments/:id/download — скачать файл
func (h *AttachmentHandler) Download(c *gin.Context) {
	attachmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	attachment, err := h.attachmentService.GetFile(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", `attachment; filename="`+filepath.Base(attachment.FileName)+`"`)
	c.Header("Content-Type", attachment.MimeType)
	c.File(attachment.StoragePath)
}

// Preview GET /attachments/:id/preview — открыть файл в браузере (inline)
func (h *AttachmentHandler) Preview(c *gin.Context) {
	attachmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	attachment, err := h.attachmentService.GetFile(attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", `inline; filename="`+filepath.Base(attachment.FileName)+`"`)
	c.Header("Content-Type", attachment.MimeType)
	c.Header("Cache-Control", "private, max-age=3600")
	c.File(attachment.StoragePath)
}

// Delete DELETE /attachments/:id
func (h *AttachmentHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	attachmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	if err := h.attachmentService.Delete(attachmentID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "attachment deleted"})
}
