package services

import (
	"errors"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type NoteService struct {
	noteRepo *postgres.NoteRepository
	teamRepo *postgres.TeamRepository
}

func NewNoteService(noteRepo *postgres.NoteRepository, teamRepo *postgres.TeamRepository) *NoteService {
	return &NoteService{
		noteRepo: noteRepo,
		teamRepo: teamRepo,
	}
}

func (s *NoteService) Create(teamID uuid.UUID, req *models.CreateNoteRequest, userID uuid.UUID) (*models.Note, error) {
	// Проверяем доступ к команде
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	note := &models.Note{
		TeamID:   teamID,
		AuthorID: userID,
		Title:    req.Title,
		Content:  req.Content,
		IsShared: req.IsShared,
	}

	if err := s.noteRepo.Create(note); err != nil {
		return nil, err
	}

	return note, nil
}

func (s *NoteService) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Note, error) {
	note, err := s.noteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if note == nil {
		return nil, errors.New("note not found")
	}

	// Проверяем доступ
	member, err := s.teamRepo.GetMember(note.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	// Приватные заметки видит только автор
	if !note.IsShared && note.AuthorID != userID {
		return nil, errors.New("access denied")
	}

	return note, nil
}

func (s *NoteService) GetByTeamID(teamID uuid.UUID, userID uuid.UUID) ([]models.Note, error) {
	// Проверяем доступ
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	return s.noteRepo.GetByTeamID(teamID, userID)
}

func (s *NoteService) Update(id uuid.UUID, req *models.UpdateNoteRequest, userID uuid.UUID) (*models.Note, error) {
	note, err := s.noteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if note == nil {
		return nil, errors.New("note not found")
	}

	// Только автор может редактировать заметку
	if note.AuthorID != userID {
		return nil, errors.New("only author can edit note")
	}

	// Обновляем поля
	if req.Title != "" {
		note.Title = req.Title
	}
	if req.Content != "" {
		note.Content = req.Content
	}
	if req.IsShared != nil {
		note.IsShared = *req.IsShared
	}

	if err := s.noteRepo.Update(note); err != nil {
		return nil, err
	}

	return note, nil
}

func (s *NoteService) Delete(id uuid.UUID, userID uuid.UUID) error {
	note, err := s.noteRepo.GetByID(id)
	if err != nil {
		return err
	}
	if note == nil {
		return errors.New("note not found")
	}

	// Только автор может удалить заметку
	if note.AuthorID != userID {
		return errors.New("only author can delete note")
	}

	return s.noteRepo.Delete(id)
}
