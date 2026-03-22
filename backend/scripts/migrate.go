package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/lib/pq"
	"task-manager/internal/config"
)

func main() {
	cfg := config.Load()
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	log.Println("✅ Connected to database")

	// Создаём таблицу для отслеживания миграций
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ DEFAULT NOW()
	)`)
	if err != nil {
		log.Fatalf("Failed to create migrations table: %v", err)
	}

	// Получаем все .up.sql файлы
	files, err := filepath.Glob(filepath.Join("migrations", "*.up.sql"))
	if err != nil {
		log.Fatalf("Failed to read migrations dir: %v", err)
	}
	sort.Strings(files)

	for _, file := range files {
		version := strings.TrimSuffix(filepath.Base(file), ".up.sql")

		// Проверяем применена ли уже
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = $1", version).Scan(&count)
		if err != nil {
			log.Fatalf("Failed to check migration %s: %v", version, err)
		}
		if count > 0 {
			log.Printf("⏭️  Skipping %s (already applied)", version)
			continue
		}

		// Применяем миграцию
		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read %s: %v", file, err)
		}

		_, err = db.Exec(string(sqlBytes))
		if err != nil {
			log.Fatalf("Failed to apply migration %s: %v", version, err)
		}

		// Записываем как применённую
		_, err = db.Exec("INSERT INTO schema_migrations (version) VALUES ($1)", version)
		if err != nil {
			log.Fatalf("Failed to record migration %s: %v", version, err)
		}

		log.Printf("✅ Applied %s", version)
	}

	log.Println("✅ All migrations applied successfully")
}
