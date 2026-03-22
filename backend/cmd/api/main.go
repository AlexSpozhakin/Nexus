package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"task-manager/internal/config"
	"task-manager/internal/handlers"
	"task-manager/internal/middleware"
	"task-manager/internal/repository/postgres"
	"task-manager/internal/scheduler"
	"task-manager/internal/services"
	"task-manager/internal/websocket"
	"task-manager/pkg/utils"
)

func main() {
	// Загружаем конфигурацию
	cfg := config.Load()

	// Подключение к PostgreSQL
	db, err := utils.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}
	defer db.Close()

	// Подключение к Redis
	redisClient, err := utils.NewRedisClient(cfg.Redis)
	if err != nil {
		log.Fatalf("❌ Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Подключение к Kafka (опционально)
	kafkaProducer, err := utils.NewKafkaProducer(cfg.Kafka)
	if err != nil {
		log.Printf("⚠️ Kafka not available: %v", err)
	} else {
		defer kafkaProducer.Close()
	}

	// Инициализация WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("✅ WebSocket Hub started")

	// Инициализация репозиториев
	userRepo := postgres.NewUserRepository(db)
	teamRepo := postgres.NewTeamRepository(db)
	taskRepo := postgres.NewTaskRepository(db)
	taskAssigneeRepo := postgres.NewTaskAssigneeRepository(db)
	labelRepo := postgres.NewLabelRepository(db)
	noteRepo := postgres.NewNoteRepository(db)
	commentRepo := postgres.NewCommentRepository(db)
	attachmentRepo := postgres.NewAttachmentRepository(db)
	searchRepo := postgres.NewSearchRepository(db)
	timeEntryRepo := postgres.NewTimeEntryRepository(db)
	milestoneRepo := postgres.NewMilestoneRepository(db)
	activityLogRepo := postgres.NewActivityLogRepository(db)

	// Инициализация сервиса уведомлений
	notificationService := services.NewNotificationService(hub, kafkaProducer, cfg.Kafka.Topic)

	// Запуск планировщика проверки дедлайнов
	deadlineChecker := scheduler.NewDeadlineChecker(taskRepo, teamRepo, notificationService)
	deadlineChecker.Start()
	defer deadlineChecker.Stop()

	// Инициализация сервиса activity log
	activityService := services.NewActivityService(activityLogRepo)

	// Инициализация сервисов
	authService := services.NewAuthService(userRepo, cfg)
	teamService := services.NewTeamService(teamRepo, userRepo)
	taskService := services.NewTaskService(taskRepo, teamRepo, taskAssigneeRepo)
	taskService.SetLabelRepo(labelRepo)
	labelService := services.NewLabelService(labelRepo, teamRepo, taskRepo)
	noteService := services.NewNoteService(noteRepo, teamRepo)
	commentService := services.NewCommentService(commentRepo, taskRepo, teamRepo)
	attachmentService := services.NewAttachmentService(attachmentRepo, taskRepo, teamRepo)
	searchService := services.NewSearchService(searchRepo)
	timeEntryService := services.NewTimeEntryService(timeEntryRepo, taskRepo, teamRepo)
	milestoneService := services.NewMilestoneService(milestoneRepo)

	// Инициализация handlers
	authHandler := handlers.NewAuthHandlerWithStats(authService, taskRepo)
	teamHandler := handlers.NewTeamHandlerWithHub(teamService, notificationService, userRepo, hub)
	taskHandler := handlers.NewTaskHandlerWithNotifications(taskService, notificationService, userRepo, teamRepo, taskAssigneeRepo)
	taskHandler.SetActivityService(activityService)
	labelHandler := handlers.NewLabelHandler(labelService, teamService)
	noteHandler := handlers.NewNoteHandler(noteService)
	commentHandler := handlers.NewCommentHandlerWithNotifications(commentService, notificationService, taskRepo, userRepo, teamRepo, taskAssigneeRepo)
	commentHandler.SetActivityService(activityService)
	attachmentHandler := handlers.NewAttachmentHandler(attachmentService)
	wsHandler := handlers.NewWebSocketHandler(hub)
	searchHandler := handlers.NewSearchHandler(searchService)
	timeEntryHandler := handlers.NewTimeEntryHandler(timeEntryService)
	milestoneHandler := handlers.NewMilestoneHandler(milestoneService)

	// Настройка Gin
	router := gin.Default()

	// CORS
	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// WebSocket endpoint
	router.GET("/ws", wsHandler.HandleWebSocket)

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes (публичные)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Auth
			protected.GET("/auth/me", authHandler.Me)
			protected.PUT("/auth/profile", authHandler.UpdateProfile)
			protected.GET("/stats", authHandler.GetStats)

			// Teams CRUD
			protected.POST("/teams", teamHandler.Create)
			protected.GET("/teams", teamHandler.GetAll)
			protected.GET("/teams/:id", teamHandler.GetByID)
			protected.PUT("/teams/:id", teamHandler.Update)
			protected.DELETE("/teams/:id", teamHandler.Delete)

			// Team members
			protected.POST("/teams/:id/members", teamHandler.AddMember)
			protected.DELETE("/teams/:id/members/:userId", teamHandler.RemoveMember)
			protected.GET("/teams/:id/members", teamHandler.GetMembers)
			protected.PATCH("/teams/:id/members/:userId/role", teamHandler.UpdateMemberRole)
			protected.GET("/teams/:id/online", teamHandler.GetOnlineStatus)

			// Team tasks
			protected.POST("/teams/:id/tasks", taskHandler.Create)
			protected.GET("/teams/:id/tasks", taskHandler.GetByTeam)

			// Team notes
			protected.POST("/teams/:id/notes", noteHandler.Create)
			protected.GET("/teams/:id/notes", noteHandler.GetByTeam)

			// Tasks
			protected.GET("/tasks/my", taskHandler.GetMyTasks)
			protected.GET("/tasks/:id", taskHandler.GetByID)
			protected.GET("/tasks/:id/subtasks", taskHandler.GetSubtasks)
			protected.PUT("/tasks/:id", taskHandler.Update)
			protected.DELETE("/tasks/:id", taskHandler.Delete)
			protected.GET("/tasks/:id/activity", taskHandler.GetActivity)
			protected.POST("/tasks/:id/comments", commentHandler.Create)
			protected.GET("/tasks/:id/comments", commentHandler.GetByTask)
			protected.PUT("/tasks/:id/comments/:commentId", commentHandler.Update)
			protected.DELETE("/tasks/:id/comments/:commentId", commentHandler.Delete)

			// Notes
			protected.GET("/notes/:id", noteHandler.GetByID)
			protected.PUT("/notes/:id", noteHandler.Update)
			protected.DELETE("/notes/:id", noteHandler.Delete)

			// Attachments
			protected.POST("/tasks/:id/attachments", attachmentHandler.UploadToTask)
			protected.GET("/tasks/:id/attachments", attachmentHandler.GetByTask)
			protected.POST("/teams/:id/attachments", attachmentHandler.UploadToTeam)
			protected.GET("/teams/:id/attachments", attachmentHandler.GetByTeam)
			protected.GET("/attachments/:id/download", attachmentHandler.Download)
			protected.GET("/attachments/:id/preview", attachmentHandler.Preview)
			protected.DELETE("/attachments/:id", attachmentHandler.Delete)

			// Labels
			protected.GET("/teams/:id/labels", labelHandler.GetByTeam)
			protected.POST("/teams/:id/labels", labelHandler.Create)
			protected.GET("/teams/:id/labels/stats", labelHandler.GetStats)
			protected.PUT("/labels/:labelId", labelHandler.Update)
			protected.DELETE("/labels/:labelId", labelHandler.Delete)
			protected.GET("/tasks/:id/labels", labelHandler.GetByTask)
			protected.POST("/tasks/:id/labels", labelHandler.AddToTask)
			protected.DELETE("/tasks/:id/labels/:labelId", labelHandler.RemoveFromTask)

			// Search
			protected.GET("/search", searchHandler.Search)

			// Time tracking
			protected.POST("/tasks/:id/time", timeEntryHandler.Create)
			protected.GET("/tasks/:id/time", timeEntryHandler.GetByTask)
			protected.DELETE("/time/:id", timeEntryHandler.Delete)

			// Milestones
			protected.GET("/teams/:id/milestones/active", milestoneHandler.GetActive)
			protected.GET("/teams/:id/milestones", milestoneHandler.GetAll)
			protected.POST("/teams/:id/milestones", milestoneHandler.Create)
			protected.PUT("/teams/:id/milestones/:milestoneId", milestoneHandler.Update)
			protected.POST("/teams/:id/milestones/:milestoneId/complete", milestoneHandler.Complete)
			protected.DELETE("/teams/:id/milestones/:milestoneId", milestoneHandler.Delete)
		}
	}

	log.Println("🚀 Server starting...")
	log.Printf("📍 http://localhost:%s", cfg.Server.Port)
	log.Println("🔌 WebSocket: ws://localhost:" + cfg.Server.Port + "/ws")

	// Запуск сервера
	go func() {
		if err := router.Run(":" + cfg.Server.Port); err != nil {
			log.Fatalf("❌ Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("👋 Shutting down server...")
}
