package services

import (
	"encoding/json"
	"log"

	ws "task-manager/internal/websocket"

	"github.com/IBM/sarama"
	"github.com/google/uuid"
)

type NotificationService struct {
	hub           *ws.Hub
	kafkaProducer sarama.SyncProducer
	kafkaTopic    string
}

type Notification struct {
	ID        string      `json:"id"`
	UserID    string      `json:"user_id"`
	Type      string      `json:"type"`
	Title     string      `json:"title"`
	Content   string      `json:"content"`
	Data      interface{} `json:"data,omitempty"`
	Read      bool        `json:"read"`
	CreatedAt string      `json:"created_at"`
}

func NewNotificationService(hub *ws.Hub, kafkaProducer sarama.SyncProducer, kafkaTopic string) *NotificationService {
	return &NotificationService{
		hub:           hub,
		kafkaProducer: kafkaProducer,
		kafkaTopic:    kafkaTopic,
	}
}

// Отправить уведомление пользователю
func (s *NotificationService) Notify(userID uuid.UUID, notifType, title, content string, data interface{}) {
	// Отправляем через WebSocket (real-time)
	s.hub.SendToUser(userID, notifType, title, content, data)

	// Отправляем в Kafka (для сохранения и обработки)
	if s.kafkaProducer != nil {
		notification := Notification{
			ID:      uuid.New().String(),
			UserID:  userID.String(),
			Type:    notifType,
			Title:   title,
			Content: content,
			Data:    data,
			Read:    false,
		}

		jsonData, err := json.Marshal(notification)
		if err != nil {
			log.Printf("Error marshaling notification: %v", err)
			return
		}

		msg := &sarama.ProducerMessage{
			Topic: s.kafkaTopic,
			Value: sarama.StringEncoder(jsonData),
		}

		_, _, err = s.kafkaProducer.SendMessage(msg)
		if err != nil {
			log.Printf("Error sending to Kafka: %v", err)
		}
	}
}

// Уведомление о назначении задачи (только если это не тот же пользователь)
func (s *NotificationService) NotifyTaskAssigned(assigneeID uuid.UUID, taskTitle, assignerName string, assignerID uuid.UUID) {
	// Не отправляем уведомление, если пользователь назначил сам себя
	if assigneeID == assignerID {
		return
	}

	s.Notify(
		assigneeID,
		"task_assigned",
		"New Task Assigned",
		assignerName+" assigned you to task: "+taskTitle,
		nil,
	)
}

// Уведомление о новом комментарии (только если это не сам комментатор)
func (s *NotificationService) NotifyNewComment(userID uuid.UUID, taskTitle, commenterName, comment string, commenterID uuid.UUID) {
	// Не отправляем уведомление, если пользователь комментирует сам себе
	if userID == commenterID {
		return
	}

	s.Notify(
		userID,
		"new_comment",
		"New Comment",
		commenterName+" commented on "+taskTitle+": "+comment,
		nil,
	)
}

// Уведомление об изменении статуса задачи (только если это не сам изменитель)
func (s *NotificationService) NotifyTaskStatusChanged(userID uuid.UUID, taskTitle, newStatus, changerName string, changerID uuid.UUID) {
	// Не отправляем уведомление, если пользователь изменил статус сам
	if userID == changerID {
		return
	}

	s.Notify(
		userID,
		"task_status_changed",
		"Task Status Changed",
		changerName+" changed status of "+taskTitle+" to "+newStatus,
		nil,
	)
}

// Уведомление о новом участнике команды
func (s *NotificationService) NotifyNewTeamMember(userID uuid.UUID, teamName, newMemberName string) {
	s.Notify(
		userID,
		"new_team_member",
		"New Team Member",
		newMemberName+" joined team "+teamName,
		nil,
	)
}

// Уведомление о добавлении в команду
func (s *NotificationService) NotifyAddedToTeam(userID uuid.UUID, teamName, adderName string) {
	s.Notify(
		userID,
		"added_to_team",
		"Added to Team",
		adderName+" added you to team: "+teamName,
		nil,
	)
}

// Уведомление об удалении из команды
func (s *NotificationService) NotifyRemovedFromTeam(userID uuid.UUID, teamName, removerName string) {
	s.Notify(
		userID,
		"removed_from_team",
		"Removed from Team",
		removerName+" removed you from team: "+teamName,
		map[string]interface{}{"action": "team_removed"},
	)
}

// Уведомление о просроченной задаче
func (s *NotificationService) NotifyTaskOverdue(userID uuid.UUID, taskTitle string) {
	s.Notify(
		userID,
		"task_overdue",
		"Task Overdue",
		"Task "+taskTitle+" is overdue!",
		nil,
	)
}

// Уведомление об удалении задачи (только если это не сам удалитель)
func (s *NotificationService) NotifyTaskDeleted(userID uuid.UUID, taskTitle, deleterName string, deleterID uuid.UUID) {
	// Не отправляем уведомление, если пользователь удалил задачу сам
	if userID == deleterID {
		return
	}

	s.Notify(
		userID,
		"task_deleted",
		"Task Deleted",
		deleterName+" deleted task: "+taskTitle,
		nil,
	)
}

// Уведомление об удалении команды
func (s *NotificationService) NotifyTeamDeleted(userID uuid.UUID, teamName, deleterName string) {
	s.Notify(
		userID,
		"team_deleted",
		"Team Deleted",
		deleterName+" deleted team: "+teamName,
		map[string]interface{}{"action": "team_deleted"},
	)
}

// Уведомление об изменении роли участника
func (s *NotificationService) NotifyRoleChanged(userID uuid.UUID, teamName, newRole, changerName string) {
	s.Notify(
		userID,
		"role_changed",
		"Your Role Changed",
		changerName+" changed your role to "+newRole+" in team: "+teamName,
		map[string]interface{}{"new_role": newRole},
	)
}

// Уведомление о том, что пользователь покинул команду (memberRole — "Admin", "Member" и т.д.)
func (s *NotificationService) NotifyUserLeftTeam(userID uuid.UUID, teamName, memberName, memberRole string) {
	roleLabel := "Member"
	switch memberRole {
	case "admin":
		roleLabel = "Admin"
	case "owner":
		roleLabel = "Owner"
	}
	s.Notify(
		userID,
		"user_left_team",
		"Member Left Team",
		roleLabel+" "+memberName+" left the team: "+teamName,
		nil,
	)
}

// Уведомление всем участникам команды (для синхронизации)
func (s *NotificationService) NotifyTeamUpdate(userIDs []uuid.UUID, updateType string, excludeUserID uuid.UUID) {
	for _, userID := range userIDs {
		if userID != excludeUserID {
			s.hub.SendToUser(userID, "team_update", "Data Updated", updateType, nil)
		}
	}
}

// Уведомление всем участникам команды об обновлении задачи (для real-time синхронизации)
func (s *NotificationService) NotifyTaskUpdate(userIDs []uuid.UUID, taskID uuid.UUID, updateType string) {
	data := map[string]interface{}{
		"task_id":     taskID.String(),
		"update_type": updateType,
	}

	for _, userID := range userIDs {
		s.hub.SendToUser(userID, "task_update", "Task Updated", updateType, data)
	}
}

// Broadcast события обновления данных для автообновления интерфейса
func (s *NotificationService) BroadcastDataUpdate(userIDs []uuid.UUID) {
	s.hub.BroadcastToUsers(userIDs, "data-update", "Data Updated", "refresh")
}

// Умное уведомление для задач - отправляет только релевантным людям
// notifyType: "task_assigned", "task_status_changed", "task_deleted", "new_comment"
// excludeUserID: ID пользователя, который выполнил действие (не получит уведомление)
// taskAssignees: список всех людей, назначенных на задачу с их ролями
func (s *NotificationService) NotifyTaskRelevantUsers(
	notifyType string,
	title string,
	content string,
	taskCreatorID uuid.UUID,
	taskAssignees []struct {
		UserID uuid.UUID
		Role   string
	},
	excludeUserID uuid.UUID,
) {
	// Собираем всех релевантных пользователей
	notifiedUsers := make(map[uuid.UUID]bool)

	// Всегда уведомляем создателя задачи (если это не тот, кто совершил действие)
	if taskCreatorID != excludeUserID {
		s.Notify(taskCreatorID, notifyType, title, content, nil)
		notifiedUsers[taskCreatorID] = true
	}

	// Уведомляем всех assignees (owner, assignee) - watchers тоже получают уведомления, но с меньшим приоритетом
	for _, assignee := range taskAssignees {
		// Пропускаем того, кто совершил действие
		if assignee.UserID == excludeUserID {
			continue
		}

		// Пропускаем, если уже уведомили (например, создатель может быть и assignee)
		if notifiedUsers[assignee.UserID] {
			continue
		}

		// Уведомляем в зависимости от типа действия и роли
		switch notifyType {
		case "task_assigned":
			// Все роли получают уведомление о назначении
			s.Notify(assignee.UserID, notifyType, title, content, nil)
			notifiedUsers[assignee.UserID] = true

		case "task_status_changed", "task_deleted":
			// Owners и Assignees получают уведомление, Watchers - тоже
			s.Notify(assignee.UserID, notifyType, title, content, nil)
			notifiedUsers[assignee.UserID] = true

		case "new_comment":
			// Все роли получают уведомления о комментариях
			s.Notify(assignee.UserID, notifyType, title, content, nil)
			notifiedUsers[assignee.UserID] = true
		}
	}
}
