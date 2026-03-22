package services

import (
	"errors"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"

	"github.com/google/uuid"
)

type TeamService struct {
	teamRepo *postgres.TeamRepository
	userRepo *postgres.UserRepository
}

func NewTeamService(teamRepo *postgres.TeamRepository, userRepo *postgres.UserRepository) *TeamService {
	return &TeamService{
		teamRepo: teamRepo,
		userRepo: userRepo,
	}
}

func (s *TeamService) Create(req *models.CreateTeamRequest, ownerID uuid.UUID) (*models.Team, error) {
	team := &models.Team{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     ownerID,
	}

	if err := s.teamRepo.Create(team); err != nil {
		return nil, err
	}

	member := &models.TeamMember{
		TeamID: team.ID,
		UserID: ownerID,
		Role:   "owner",
	}

	if err := s.teamRepo.AddMember(member); err != nil {
		return nil, err
	}

	return team, nil
}

func (s *TeamService) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Team, error) {
	member, err := s.teamRepo.GetMember(id, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	return s.teamRepo.GetByID(id)
}

func (s *TeamService) GetUserTeams(userID uuid.UUID) ([]models.Team, error) {
	return s.teamRepo.GetUserTeams(userID)
}

func (s *TeamService) Update(id uuid.UUID, req *models.CreateTeamRequest, userID uuid.UUID) (*models.Team, error) {
	member, err := s.teamRepo.GetMember(id, userID)
	if err != nil {
		return nil, err
	}
	if member == nil || (member.Role != "owner" && member.Role != "admin") {
		return nil, errors.New("access denied")
	}

	team, err := s.teamRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	team.Name = req.Name
	team.Description = req.Description

	if err := s.teamRepo.Update(team); err != nil {
		return nil, err
	}

	return team, nil
}

func (s *TeamService) Delete(id uuid.UUID, userID uuid.UUID) error {
	team, err := s.teamRepo.GetByID(id)
	if err != nil {
		return err
	}
	if team == nil {
		return errors.New("team not found")
	}
	if team.OwnerID != userID {
		return errors.New("only owner can delete team")
	}

	return s.teamRepo.Delete(id)
}

func (s *TeamService) AddMember(teamID uuid.UUID, req *models.AddMemberRequest, userID uuid.UUID) error {
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return err
	}
	if member == nil || (member.Role != "owner" && member.Role != "admin") {
		return errors.New("access denied")
	}

	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	existing, _ := s.teamRepo.GetMember(teamID, user.ID)
	if existing != nil {
		return errors.New("user is already a member")
	}

	newMember := &models.TeamMember{
		TeamID: teamID,
		UserID: user.ID,
		Role:   req.Role,
	}

	return s.teamRepo.AddMember(newMember)
}

func (s *TeamService) RemoveMember(teamID, memberUserID, userID uuid.UUID) error {
	// Если пользователь удаляет сам себя (выход из команды)
	if userID == memberUserID {
		// Проверяем, что он не владелец (владелец не может выйти, только удалить команду)
		team, _ := s.teamRepo.GetByID(teamID)
		if team != nil && team.OwnerID == memberUserID {
			return errors.New("team owner cannot leave team, delete team instead")
		}
		return s.teamRepo.RemoveMember(teamID, memberUserID)
	}

	// Если пользователь удаляет другого участника
	actor, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return err
	}
	if actor == nil || (actor.Role != "owner" && actor.Role != "admin") {
		return errors.New("access denied")
	}

	// Нельзя удалить owner
	team, _ := s.teamRepo.GetByID(teamID)
	if team != nil && team.OwnerID == memberUserID {
		return errors.New("cannot remove team owner")
	}

	// Admin не может удалить другого admin — только owner может
	target, err := s.teamRepo.GetMember(teamID, memberUserID)
	if err != nil {
		return err
	}
	if target != nil && target.Role == "admin" && actor.Role != "owner" {
		return errors.New("only owner can remove admin")
	}

	return s.teamRepo.RemoveMember(teamID, memberUserID)
}

// UpdateMemberRole — смена роли участника (только owner)
func (s *TeamService) UpdateMemberRole(teamID, memberUserID, userID uuid.UUID, newRole string) error {
	// Только owner может менять роли
	actor, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return err
	}
	if actor == nil || actor.Role != "owner" {
		return errors.New("only owner can change member roles")
	}

	// Нельзя менять роль самому себе (owner всегда owner)
	if userID == memberUserID {
		return errors.New("cannot change your own role")
	}

	// Нельзя назначить роль owner через этот endpoint
	if newRole == "owner" {
		return errors.New("cannot assign owner role")
	}

	target, err := s.teamRepo.GetMember(teamID, memberUserID)
	if err != nil {
		return err
	}
	if target == nil {
		return errors.New("member not found")
	}
	// Нельзя менять роль owner
	if target.Role == "owner" {
		return errors.New("cannot change owner role")
	}

	return s.teamRepo.UpdateMemberRole(teamID, memberUserID, newRole)
}

func (s *TeamService) GetMembers(teamID, userID uuid.UUID) ([]models.TeamMemberWithUser, error) {
	member, err := s.teamRepo.GetMember(teamID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied")
	}

	return s.teamRepo.GetMembers(teamID)
}
