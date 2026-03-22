package services

import (
	"errors"

	"task-manager/internal/config"
	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"
	"task-manager/pkg/utils"

	"github.com/google/uuid"
)

type AuthService struct {
	userRepo *postgres.UserRepository
	cfg      *config.Config
}

func NewAuthService(userRepo *postgres.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (s *AuthService) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Проверяем, существует ли пользователь
	existing, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Хешируем пароль
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Создаём пользователя
	user := &models.User{
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: hashedPassword,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Генерируем токен
	token, err := utils.GenerateToken(user.ID, user.Email, s.cfg.JWT.Secret, s.cfg.JWT.ExpireTime)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *AuthService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	// Ищем пользователя
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	// Проверяем пароль
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	// Генерируем токен
	token, err := utils.GenerateToken(user.ID, user.Email, s.cfg.JWT.Secret, s.cfg.JWT.ExpireTime)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *AuthService) GetUserByID(id uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *AuthService) UpdateProfile(userID uuid.UUID, req *models.UpdateProfileRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	if req.Username != "" && req.Username != user.Username {
		user.Username = req.Username
		if err := s.userRepo.Update(user); err != nil {
			return nil, err
		}
	}

	if req.NewPassword != "" {
		if !utils.CheckPassword(req.Password, user.PasswordHash) {
			return nil, errors.New("current password is incorrect")
		}
		newHash, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			return nil, err
		}
		if err := s.userRepo.UpdatePassword(userID, newHash); err != nil {
			return nil, err
		}
	}

	return s.userRepo.GetByID(userID)
}
