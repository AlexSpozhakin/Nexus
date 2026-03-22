package scheduler

import (
	"log"
	"time"

	"task-manager/internal/repository/postgres"
	"task-manager/internal/services"

	"github.com/google/uuid"
)

type DeadlineChecker struct {
	taskRepo            *postgres.TaskRepository
	teamRepo            *postgres.TeamRepository
	notificationService *services.NotificationService
	stopChan            chan bool
}

func NewDeadlineChecker(taskRepo *postgres.TaskRepository, teamRepo *postgres.TeamRepository, notificationService *services.NotificationService) *DeadlineChecker {
	return &DeadlineChecker{
		taskRepo:            taskRepo,
		teamRepo:            teamRepo,
		notificationService: notificationService,
		stopChan:            make(chan bool),
	}
}

func (dc *DeadlineChecker) Start() {
	ticker := time.NewTicker(1 * time.Minute) // Проверка каждую минуту
	log.Println("⏰ Deadline checker started")

	go func() {
		for {
			select {
			case <-ticker.C:
				dc.checkOverdueTasks()
			case <-dc.stopChan:
				ticker.Stop()
				log.Println("⏰ Deadline checker stopped")
				return
			}
		}
	}()
}

func (dc *DeadlineChecker) Stop() {
	dc.stopChan <- true
}

func (dc *DeadlineChecker) checkOverdueTasks() {
	// Получаем все просроченные задачи
	tasks, err := dc.taskRepo.GetOverdueTasks()
	if err != nil {
		log.Printf("Error checking overdue tasks: %v", err)
		return
	}

	if len(tasks) > 0 {
		log.Printf("⏰ Found %d overdue tasks to check", len(tasks))
	}

	now := time.Now()
	for _, task := range tasks {
		// Проверяем, что дедлайн действительно просрочен и задача не завершена
		if task.DueDate != nil && task.DueDate.Before(now) && task.Status != "done" {
			log.Printf("📢 Processing overdue task: %s (ID: %s)", task.Title, task.ID)

			// Уведомляем создателя задачи
			dc.notificationService.NotifyTaskOverdue(task.CreatorID, task.Title)

			// Уведомляем исполнителя
			if task.AssigneeID != nil && *task.AssigneeID != task.CreatorID {
				dc.notificationService.NotifyTaskOverdue(*task.AssigneeID, task.Title)
			}

			// Помечаем задачу как уведомленную
			if err := dc.taskRepo.MarkDeadlineNotified(task.ID); err != nil {
				log.Printf("Error marking task as notified: %v", err)
			} else {
				log.Printf("✅ Sent overdue notification for task: %s", task.Title)
			}

			// Broadcast события обновления всем участникам команды для мгновенного визуального обновления
			if dc.teamRepo != nil {
				members, err := dc.teamRepo.GetMembers(task.TeamID)
				if err == nil && len(members) > 0 {
					var userIDs []uuid.UUID
					for _, member := range members {
						userIDs = append(userIDs, member.UserID)
					}
					dc.notificationService.BroadcastDataUpdate(userIDs)
					log.Printf("🔄 Broadcast data-update to %d team members for task: %s", len(userIDs), task.Title)
				}
			}
		}
	}
}
