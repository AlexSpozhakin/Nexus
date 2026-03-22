package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"task-manager/internal/models"
	"task-manager/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MilestoneHandler struct {
	service *services.MilestoneService
}

func NewMilestoneHandler(service *services.MilestoneService) *MilestoneHandler {
	return &MilestoneHandler{service: service}
}

// GET /teams/:id/milestones/active
func (h *MilestoneHandler) GetActive(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	milestone, err := h.service.GetActiveMilestone(teamID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusOK, nil)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, milestone)
}

// GET /teams/:id/milestones
func (h *MilestoneHandler) GetAll(c *gin.Context) {
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	milestones, err := h.service.GetAll(teamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, milestones)
}

// POST /teams/:id/milestones
func (h *MilestoneHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var req models.CreateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	milestone, err := h.service.Create(teamID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, milestone)
}

// PUT /teams/:id/milestones/:milestoneId
func (h *MilestoneHandler) Update(c *gin.Context) {
	milestoneID, err := uuid.Parse(c.Param("milestoneId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	var req models.UpdateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	milestone, err := h.service.Update(milestoneID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, milestone)
}

// POST /teams/:id/milestones/:milestoneId/complete
func (h *MilestoneHandler) Complete(c *gin.Context) {
	milestoneID, err := uuid.Parse(c.Param("milestoneId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	if err := h.service.Complete(milestoneID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "milestone completed"})
}

// DELETE /teams/:id/milestones/:milestoneId
func (h *MilestoneHandler) Delete(c *gin.Context) {
	milestoneID, err := uuid.Parse(c.Param("milestoneId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	if err := h.service.Delete(milestoneID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
