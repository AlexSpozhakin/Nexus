package handlers

import (
	"net/http"
	"task-manager/internal/models"
	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TimeEntryHandler struct {
	timeService *services.TimeEntryService
}

func NewTimeEntryHandler(timeService *services.TimeEntryService) *TimeEntryHandler {
	return &TimeEntryHandler{timeService: timeService}
}

// POST /api/v1/tasks/:id/time
func (h *TimeEntryHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}
	var req models.CreateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry, err := h.timeService.Create(taskID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, entry)
}

// GET /api/v1/tasks/:id/time
func (h *TimeEntryHandler) GetByTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}
	summary, err := h.timeService.GetByTask(taskID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// DELETE /api/v1/time/:id
func (h *TimeEntryHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	entryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry id"})
		return
	}
	if err := h.timeService.Delete(entryID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
