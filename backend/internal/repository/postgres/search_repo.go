package postgres

import (
	"task-manager/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SearchRepository struct {
	db *sqlx.DB
}

func NewSearchRepository(db *sqlx.DB) *SearchRepository {
	return &SearchRepository{db: db}
}

func (r *SearchRepository) SearchTasks(userID uuid.UUID, query string) ([]models.SearchResultItem, error) {
	q := "%" + query + "%"
	var results []models.SearchResultItem
	err := r.db.Select(&results, `
		SELECT DISTINCT
			t.id, 'task' as type, t.title,
			LEFT(COALESCE(t.description, ''), 120) as excerpt,
			t.team_id, te.name as team_name,
			t.status, t.priority, t.created_at
		FROM tasks t
		JOIN teams te ON t.team_id = te.id
		JOIN team_members tm ON te.id = tm.team_id
		WHERE tm.user_id = $1
		  AND (t.title ILIKE $2 OR t.description ILIKE $2)
		ORDER BY t.created_at DESC
		LIMIT 15
	`, userID, q)
	if results == nil {
		results = []models.SearchResultItem{}
	}
	return results, err
}

func (r *SearchRepository) SearchNotes(userID uuid.UUID, query string) ([]models.SearchResultItem, error) {
	q := "%" + query + "%"
	var results []models.SearchResultItem
	err := r.db.Select(&results, `
		SELECT DISTINCT
			n.id, 'note' as type, n.title,
			LEFT(COALESCE(n.content, ''), 120) as excerpt,
			n.team_id, te.name as team_name,
			'' as status, '' as priority, n.created_at
		FROM notes n
		JOIN teams te ON n.team_id = te.id
		JOIN team_members tm ON te.id = tm.team_id
		WHERE tm.user_id = $1
		  AND (n.is_shared = true OR n.author_id = $1)
		  AND (n.title ILIKE $2 OR n.content ILIKE $2)
		ORDER BY n.created_at DESC
		LIMIT 10
	`, userID, q)
	if results == nil {
		results = []models.SearchResultItem{}
	}
	return results, err
}
