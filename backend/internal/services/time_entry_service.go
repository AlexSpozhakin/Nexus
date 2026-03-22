package services

import (
	"errors"
	"time"
	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type TimeEntryService struct {
	timeRepo *postgres.TimeEntryRepository
	taskRepo *postgres.TaskRepository
	teamRepo *postgres.TeamRepository
}

func NewTimeEntryService(timeRepo *postgres.TimeEntryRepository, taskRepo *postgres.TaskRepository, teamRepo *postgres.TeamRepository) *TimeEntryService {
	return &TimeEntryService{timeRepo: timeRepo, taskRepo: taskRepo, teamRepo: teamRepo}
}

func (s *TimeEntryService) Create(taskID uuid.UUID, userID uuid.UUID, req *models.CreateTimeEntryRequest) (*models.TimeEntry, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil || task == nil {
		return nil, errors.New("task not found")
	}
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil || member == nil {
		return nil, errors.New("access denied")
	}

	startedAt, err := time.Parse(time.RFC3339, req.StartedAt)
	if err != nil {
		startedAt = time.Now().UTC()
	}

	entry := &models.TimeEntry{
		TaskID:          taskID,
		UserID:          userID,
		StartedAt:       startedAt,
		DurationSeconds: req.DurationSeconds,
		Note:            req.Note,
	}
	if err := s.timeRepo.Create(entry); err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *TimeEntryService) GetByTask(taskID uuid.UUID, userID uuid.UUID) (*models.TimeEntrySummary, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil || task == nil {
		return nil, errors.New("task not found")
	}
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil || member == nil {
		return nil, errors.New("access denied")
	}
	entries, err := s.timeRepo.GetByTask(taskID)
	if err != nil {
		return nil, err
	}
	total, _ := s.timeRepo.GetTotalSeconds(taskID)
	return &models.TimeEntrySummary{Entries: entries, TotalSeconds: total}, nil
}

func (s *TimeEntryService) Delete(entryID uuid.UUID, userID uuid.UUID) error {
	return s.timeRepo.Delete(entryID, userID)
}
