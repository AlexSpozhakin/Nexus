package services

import (
	"errors"
	"time"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type MilestoneService struct {
	milestoneRepo *postgres.MilestoneRepository
}

func NewMilestoneService(milestoneRepo *postgres.MilestoneRepository) *MilestoneService {
	return &MilestoneService{milestoneRepo: milestoneRepo}
}

func (s *MilestoneService) GetActiveMilestone(teamID uuid.UUID) (*models.Milestone, error) {
	return s.milestoneRepo.GetActiveMilestone(teamID)
}

func (s *MilestoneService) GetAll(teamID uuid.UUID) ([]models.Milestone, error) {
	return s.milestoneRepo.GetAll(teamID)
}

func (s *MilestoneService) Create(teamID uuid.UUID, createdBy uuid.UUID, req *models.CreateMilestoneRequest) (*models.Milestone, error) {
	dueDate, err := parseDueDate(req.DueDate)
	if err != nil {
		return nil, errors.New("invalid due_date format, use RFC3339 or YYYY-MM-DD")
	}

	m := &models.Milestone{
		TeamID:      teamID,
		Title:       req.Title,
		Description: req.Description,
		DueDate:     dueDate,
		Status:      "active",
		CreatedBy:   &createdBy,
	}
	if err := s.milestoneRepo.Create(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *MilestoneService) Update(milestoneID uuid.UUID, req *models.UpdateMilestoneRequest) (*models.Milestone, error) {
	existing, err := s.milestoneRepo.GetByID(milestoneID)
	if err != nil {
		return nil, errors.New("milestone not found")
	}

	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Status != "" {
		existing.Status = req.Status
	}
	if req.DueDate != "" {
		dueDate, err := parseDueDate(req.DueDate)
		if err != nil {
			return nil, errors.New("invalid due_date format, use RFC3339 or YYYY-MM-DD")
		}
		existing.DueDate = dueDate
	}

	if err := s.milestoneRepo.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *MilestoneService) Complete(milestoneID uuid.UUID) error {
	return s.milestoneRepo.Complete(milestoneID)
}

func (s *MilestoneService) Delete(milestoneID uuid.UUID) error {
	return s.milestoneRepo.Delete(milestoneID)
}

// parseDueDate supports RFC3339 and YYYY-MM-DD formats.
func parseDueDate(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}
