package handlers

import (
	"net/http"

	"task-manager/internal/models"
	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LabelHandler struct {
	labelService *services.LabelService
	teamService  *services.TeamService
}

func NewLabelHandler(labelService *services.LabelService, teamService *services.TeamService) *LabelHandler {
	return &LabelHandler{labelService: labelService, teamService: teamService}
}

// GET /teams/:id/labels
func (h *LabelHandler) GetByTeam(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}
	labels, err := h.labelService.GetByTeam(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if labels == nil {
		labels = []models.Label{}
	}
	c.JSON(http.StatusOK, labels)
}

// POST /teams/:id/labels
func (h *LabelHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}
	var req models.CreateLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	label, err := h.labelService.Create(teamID, &req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, label)
}

// PUT /labels/:labelId
func (h *LabelHandler) Update(c *gin.Context) {
	labelID, err := uuid.Parse(c.Param("labelId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid label id"})
		return
	}
	var req models.UpdateLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	label, err := h.labelService.Update(labelID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, label)
}

// DELETE /labels/:labelId
func (h *LabelHandler) Delete(c *gin.Context) {
	labelID, err := uuid.Parse(c.Param("labelId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid label id"})
		return
	}
	if err := h.labelService.Delete(labelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "label deleted"})
}

// POST /tasks/:id/labels
func (h *LabelHandler) AddToTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}
	var req models.AddTaskLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	labelID, err := uuid.Parse(req.LabelID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid label id"})
		return
	}
	if err := h.labelService.AddToTask(taskID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "label added"})
}

// DELETE /tasks/:id/labels/:labelId
func (h *LabelHandler) RemoveFromTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}
	labelID, err := uuid.Parse(c.Param("labelId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid label id"})
		return
	}
	if err := h.labelService.RemoveFromTask(taskID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "label removed"})
}

// GET /tasks/:id/labels
func (h *LabelHandler) GetByTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}
	labels, err := h.labelService.GetByTask(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if labels == nil {
		labels = []models.Label{}
	}
	c.JSON(http.StatusOK, labels)
}

// GET /teams/:id/labels/stats
func (h *LabelHandler) GetStats(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}
	stats, err := h.labelService.GetLabelStats(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if stats == nil {
		stats = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, stats)
}
