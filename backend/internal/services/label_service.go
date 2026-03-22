package services

import (
	"errors"
	"time"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type LabelService struct {
	labelRepo *postgres.LabelRepository
	teamRepo  *postgres.TeamRepository
	taskRepo  *postgres.TaskRepository
}

func NewLabelService(labelRepo *postgres.LabelRepository, teamRepo *postgres.TeamRepository, taskRepo *postgres.TaskRepository) *LabelService {
	return &LabelService{labelRepo: labelRepo, teamRepo: teamRepo, taskRepo: taskRepo}
}

func (s *LabelService) Create(teamID uuid.UUID, req *models.CreateLabelRequest, createdBy uuid.UUID) (*models.Label, error) {
	label := &models.Label{
		ID:        uuid.New(),
		TeamID:    teamID,
		Name:      req.Name,
		Color:     req.Color,
		CreatedBy: createdBy,
		CreatedAt: time.Now(),
	}
	if err := s.labelRepo.Create(label); err != nil {
		return nil, errors.New("label with this name already exists")
	}
	return label, nil
}

func (s *LabelService) GetByTeam(teamID uuid.UUID) ([]models.Label, error) {
	return s.labelRepo.GetByTeam(teamID)
}

func (s *LabelService) Update(labelID uuid.UUID, req *models.UpdateLabelRequest) (*models.Label, error) {
	label, err := s.labelRepo.GetByID(labelID)
	if err != nil {
		return nil, errors.New("label not found")
	}
	if req.Name != "" {
		label.Name = req.Name
	}
	if req.Color != "" {
		label.Color = req.Color
	}
	if err := s.labelRepo.Update(label); err != nil {
		return nil, err
	}
	return label, nil
}

func (s *LabelService) Delete(labelID uuid.UUID) error {
	return s.labelRepo.Delete(labelID)
}

func (s *LabelService) AddToTask(taskID, labelID uuid.UUID) error {
	return s.labelRepo.AddToTask(taskID, labelID)
}

func (s *LabelService) RemoveFromTask(taskID, labelID uuid.UUID) error {
	return s.labelRepo.RemoveFromTask(taskID, labelID)
}

func (s *LabelService) GetByTask(taskID uuid.UUID) ([]models.Label, error) {
	return s.labelRepo.GetByTask(taskID)
}

func (s *LabelService) GetLabelStats(teamID uuid.UUID) ([]map[string]interface{}, error) {
	return s.labelRepo.GetLabelStats(teamID)
}
