package services

import (
	"errors"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type CommentService struct {
	commentRepo *postgres.CommentRepository
	taskRepo    *postgres.TaskRepository
	teamRepo    *postgres.TeamRepository
}

func NewCommentService(commentRepo *postgres.CommentRepository, taskRepo *postgres.TaskRepository, teamRepo *postgres.TeamRepository) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		taskRepo:    taskRepo,
		teamRepo:    teamRepo,
	}
}

func (s *CommentService) Create(taskID uuid.UUID, req *models.CreateCommentRequest, userID uuid.UUID) (*models.Comment, error) {
	// Проверяем существование задачи
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	// Проверяем доступ к команде
	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	comment := &models.Comment{
		TaskID:  taskID,
		UserID:  userID,
		Content: req.Content,
	}

	if err := s.commentRepo.Create(comment); err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *CommentService) GetByTaskID(taskID uuid.UUID, userID uuid.UUID) ([]models.Comment, error) {
	task, err := s.taskRepo.GetByID(taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("task not found")
	}

	member, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	return s.commentRepo.GetByTaskID(taskID)
}

func (s *CommentService) Update(commentID uuid.UUID, req *models.UpdateCommentRequest, userID uuid.UUID) (*models.Comment, error) {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("comment not found")
	}

	// Только автор может редактировать
	if comment.UserID != userID {
		return nil, errors.New("you can only edit your own comments")
	}

	return s.commentRepo.Update(commentID, req.Content)
}

// Delete удаляет комментарий с проверкой прав:
// - автор может удалить свой комментарий
// - owner команды может удалить любой
// - admin может удалить комментарий только member (не admin/owner)
func (s *CommentService) Delete(commentID uuid.UUID, userID uuid.UUID) (*models.Comment, error) {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("comment not found")
	}

	// Автор всегда может удалить свой комментарий
	if comment.UserID == userID {
		if err := s.commentRepo.Delete(commentID); err != nil {
			return nil, err
		}
		return comment, nil
	}

	// Проверяем роль в команде
	task, err := s.taskRepo.GetByID(comment.TaskID)
	if err != nil || task == nil {
		return nil, errors.New("task not found")
	}

	actorMember, err := s.teamRepo.GetMember(task.TeamID, userID)
	if err != nil || actorMember == nil {
		return nil, errors.New("access denied")
	}

	// Получаем роль автора комментария
	authorMember, err := s.teamRepo.GetMember(task.TeamID, comment.UserID)
	if err != nil || authorMember == nil {
		// Автор мог покинуть команду — owner может удалить
		if actorMember.Role == "owner" {
			if err := s.commentRepo.Delete(commentID); err != nil {
				return nil, err
			}
			return comment, nil
		}
		return nil, errors.New("access denied")
	}

	// Owner может удалить любой комментарий
	if actorMember.Role == "owner" {
		if err := s.commentRepo.Delete(commentID); err != nil {
			return nil, err
		}
		return comment, nil
	}

	// Admin может удалить только комментарии member (не admin и не owner)
	if actorMember.Role == "admin" && authorMember.Role == "member" {
		if err := s.commentRepo.Delete(commentID); err != nil {
			return nil, err
		}
		return comment, nil
	}

	return nil, errors.New("you don't have permission to delete this comment")
}
