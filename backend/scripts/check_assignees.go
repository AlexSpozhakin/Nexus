package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func CheckAssignees() {
	connStr := "host=localhost port=5432 user=postgres password=postgres dbname=task_manager_db sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Проверяем задачи
	fmt.Println("=== Checking tasks ===")
	rows, err := db.Query(`
		SELECT t.id, t.title, COUNT(ta.id) as assignee_count
		FROM tasks t
		LEFT JOIN task_assignees ta ON t.id = ta.task_id
		WHERE t.parent_task_id IS NULL
		GROUP BY t.id, t.title
		ORDER BY t.created_at DESC
		LIMIT 5
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, title string
		var count int
		if err := rows.Scan(&id, &title, &count); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("Task: %s (ID: %s) - Assignees: %d\n", title, id, count)
	}

	// Проверяем все assignees
	fmt.Println("\n=== All task assignees ===")
	rows2, err := db.Query(`
		SELECT ta.task_id, ta.user_id, ta.role, u.username, u.email
		FROM task_assignees ta
		JOIN users u ON ta.user_id = u.id
		ORDER BY ta.assigned_at DESC
		LIMIT 10
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows2.Close()

	for rows2.Next() {
		var taskID, userID, role, username, email string
		if err := rows2.Scan(&taskID, &userID, &role, &username, &email); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("Task: %s - User: %s (%s) - Role: %s\n", taskID[:8], username, email, role)
	}
}
