package postgres

import (
	"database/sql"
	"errors"

	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TeamRepository struct {
	db *sqlx.DB
}

func NewTeamRepository(db *sqlx.DB) *TeamRepository {
	return &TeamRepository{db: db}
}

func (r *TeamRepository) Create(team *models.Team) error {
	query := `
		INSERT INTO teams (name, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(query, team.Name, team.Description, team.OwnerID).
		Scan(&team.ID, &team.CreatedAt, &team.UpdatedAt)
}

func (r *TeamRepository) GetByID(id uuid.UUID) (*models.Team, error) {
	var team models.Team
	query := `SELECT * FROM teams WHERE id = $1`
	err := r.db.Get(&team, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &team, err
}

func (r *TeamRepository) GetUserTeams(userID uuid.UUID) ([]models.Team, error) {
	var teams []models.Team
	query := `
		SELECT t.* FROM teams t
		INNER JOIN team_members tm ON t.id = tm.team_id
		WHERE tm.user_id = $1
		ORDER BY t.created_at DESC
	`
	err := r.db.Select(&teams, query, userID)
	return teams, err
}

func (r *TeamRepository) Update(team *models.Team) error {
	query := `
		UPDATE teams 
		SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	_, err := r.db.Exec(query, team.Name, team.Description, team.ID)
	return err
}

func (r *TeamRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM teams WHERE id = $1`, id)
	return err
}

func (r *TeamRepository) AddMember(member *models.TeamMember) error {
	query := `
		INSERT INTO team_members (team_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING id, joined_at
	`
	return r.db.QueryRow(query, member.TeamID, member.UserID, member.Role).
		Scan(&member.ID, &member.JoinedAt)
}

func (r *TeamRepository) RemoveMember(teamID, userID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`, teamID, userID)
	return err
}

func (r *TeamRepository) GetMembers(teamID uuid.UUID) ([]models.TeamMemberWithUser, error) {
	var members []models.TeamMemberWithUser
	query := `
		SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at, u.username, u.email
		FROM team_members tm
		JOIN users u ON tm.user_id = u.id
		WHERE tm.team_id = $1
		ORDER BY tm.joined_at ASC
	`
	err := r.db.Select(&members, query, teamID)
	return members, err
}

func (r *TeamRepository) GetMember(teamID, userID uuid.UUID) (*models.TeamMember, error) {
	var member models.TeamMember
	query := `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`
	err := r.db.Get(&member, query, teamID, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &member, err
}

func (r *TeamRepository) UpdateMemberRole(teamID, userID uuid.UUID, newRole string) error {
	_, err := r.db.Exec(
		`UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3`,
		newRole, teamID, userID,
	)
	return err
}
