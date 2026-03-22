package services

import (
	"strings"
	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type SearchService struct {
	searchRepo *postgres.SearchRepository
}

func NewSearchService(searchRepo *postgres.SearchRepository) *SearchService {
	return &SearchService{searchRepo: searchRepo}
}

func (s *SearchService) Search(userID uuid.UUID, query string) (*models.SearchResponse, error) {
	query = strings.TrimSpace(query)
	if len(query) < 2 {
		return &models.SearchResponse{Tasks: []models.SearchResultItem{}, Notes: []models.SearchResultItem{}, Total: 0}, nil
	}

	tasks, err := s.searchRepo.SearchTasks(userID, query)
	if err != nil {
		return nil, err
	}

	notes, err := s.searchRepo.SearchNotes(userID, query)
	if err != nil {
		return nil, err
	}

	return &models.SearchResponse{
		Tasks: tasks,
		Notes: notes,
		Total: len(tasks) + len(notes),
	}, nil
}
