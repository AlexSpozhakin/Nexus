package handlers

import (
	"log"
	"net/http"

	"task-manager/internal/models"
	"task-manager/internal/repository/postgres"
	"task-manager/internal/services"
	"task-manager/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TeamHandler struct {
	teamService         *services.TeamService
	notificationService *services.NotificationService
	userRepo            *postgres.UserRepository
	hub                 *websocket.Hub
}

func NewTeamHandler(teamService *services.TeamService) *TeamHandler {
	return &TeamHandler{teamService: teamService}
}

func NewTeamHandlerWithNotifications(teamService *services.TeamService, notificationService *services.NotificationService, userRepo *postgres.UserRepository) *TeamHandler {
	return &TeamHandler{
		teamService:         teamService,
		notificationService: notificationService,
		userRepo:            userRepo,
	}
}

func NewTeamHandlerWithHub(teamService *services.TeamService, notificationService *services.NotificationService, userRepo *postgres.UserRepository, hub *websocket.Hub) *TeamHandler {
	return &TeamHandler{
		teamService:         teamService,
		notificationService: notificationService,
		userRepo:            userRepo,
		hub:                 hub,
	}
}

func (h *TeamHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var req models.CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team, err := h.teamService.Create(&req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, team)
}

func (h *TeamHandler) GetAll(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teams, err := h.teamService.GetUserTeams(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teams)
}

func (h *TeamHandler) GetByID(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	team, err := h.teamService.GetByID(teamID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, team)
}

func (h *TeamHandler) Update(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var req models.CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team, err := h.teamService.Update(teamID, &req, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, team)
}

func (h *TeamHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	// Получаем информацию о команде и её участниках перед удалением
	team, err := h.teamService.GetByID(teamID, userID)
	if err != nil {
		log.Printf("Error getting team: %v", err)
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	members, err := h.teamService.GetMembers(teamID, userID)
	if err != nil {
		log.Printf("Error getting members: %v", err)
	}

	if err := h.teamService.Delete(teamID, userID); err != nil {
		log.Printf("Error deleting team: %v", err)
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Отправляем уведомления всем участникам команды
	if h.notificationService != nil && h.userRepo != nil && team != nil {
		deleter, _ := h.userRepo.GetByID(userID)
		deleterName := "Someone"
		if deleter != nil {
			deleterName = deleter.Username
		}

		// Уведомляем каждого участника команды (кроме того, кто удалил)
		for _, member := range members {
			if member.UserID != userID {
				h.notificationService.NotifyTeamDeleted(member.UserID, team.Name, deleterName)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "team deleted"})
}

func (h *TeamHandler) AddMember(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var req models.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.teamService.AddMember(teamID, &req, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Отправляем уведомление новому участнику + broadcast остальным
	if h.notificationService != nil && h.userRepo != nil {
		team, _ := h.teamService.GetByID(teamID, userID)
		newMember, _ := h.userRepo.GetByEmail(req.Email)
		adder, _ := h.userRepo.GetByID(userID)

		if team != nil && newMember != nil {
			adderName := "Someone"
			if adder != nil {
				adderName = adder.Username
			}
			h.notificationService.NotifyAddedToTeam(newMember.ID, team.Name, adderName)
		}

		// Broadcast всем участникам команды для обновления списка Members в реальном времени
		members, err := h.teamService.GetMembers(teamID, userID)
		if err == nil && len(members) > 0 {
			var userIDs []uuid.UUID
			for _, m := range members {
				userIDs = append(userIDs, m.UserID)
			}
			h.notificationService.BroadcastDataUpdate(userIDs)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "member added"})
}

func (h *TeamHandler) RemoveMember(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	memberID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	// Получаем данные команды перед удалением
	// Используем memberID для получения команды, чтобы участник мог получить доступ
	var team *models.Team
	if userID == memberID {
		// Если пользователь выходит сам, получаем через его ID
		team, _ = h.teamService.GetByID(teamID, memberID)
	} else {
		// Если админ/владелец удаляет участника
		team, _ = h.teamService.GetByID(teamID, userID)
	}

	// Получаем список участников ДО удаления (чтобы знать кому слать broadcast + роль уходящего)
	var memberIDsBeforeRemoval []uuid.UUID
	leavingMemberRole := "member"
	if h.notificationService != nil && team != nil {
		membersBeforeRemoval, err := h.teamService.GetMembers(teamID, userID)
		if err == nil {
			for _, m := range membersBeforeRemoval {
				memberIDsBeforeRemoval = append(memberIDsBeforeRemoval, m.UserID)
				if m.UserID == memberID {
					leavingMemberRole = m.Role
				}
			}
		}
	}

	// Удаляем участника
	if err := h.teamService.RemoveMember(teamID, memberID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Отправляем уведомления
	if h.notificationService != nil && h.userRepo != nil && team != nil {
		actor, _ := h.userRepo.GetByID(userID)
		member, _ := h.userRepo.GetByID(memberID)

		actorName := "Someone"
		if actor != nil {
			actorName = actor.Username
		}

		memberName := "Someone"
		if member != nil {
			memberName = member.Username
		}

		// Если пользователь выходит сам (userID == memberID)
		if userID == memberID {
			// Получаем участников после удаления текущего пользователя
			// Используем первого админа/владельца для получения списка
			if team.OwnerID != memberID {
				members, err := h.teamService.GetMembers(teamID, team.OwnerID)
				if err == nil {
					// Уведомляем всех участников команды, что пользователь покинул команду
					for _, m := range members {
						h.notificationService.NotifyUserLeftTeam(m.UserID, team.Name, memberName, leavingMemberRole)
					}
				}
			}
		} else {
			// Если владелец удалил участника — уведомляем удалённого участника
			h.notificationService.NotifyRemovedFromTeam(memberID, team.Name, actorName)
		}

		// Broadcast всем участникам (включая удалённого, чтобы у него тоже обновился UI)
		// для реального обновления списка Members без перезагрузки страницы
		if len(memberIDsBeforeRemoval) > 0 {
			h.notificationService.BroadcastDataUpdate(memberIDsBeforeRemoval)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}

func (h *TeamHandler) GetMembers(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	members, err := h.teamService.GetMembers(teamID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, members)
}

func (h *TeamHandler) UpdateMemberRole(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	memberID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required,oneof=admin member"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.teamService.UpdateMemberRole(teamID, memberID, userID, req.Role); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	// Уведомляем участника об изменении роли + broadcast всем для обновления UI
	if h.notificationService != nil && h.userRepo != nil {
		team, _ := h.teamService.GetByID(teamID, userID)
		changer, _ := h.userRepo.GetByID(userID)
		changerName := "Someone"
		if changer != nil {
			changerName = changer.Username
		}
		if team != nil {
			h.notificationService.NotifyRoleChanged(memberID, team.Name, req.Role, changerName)
		}

		members, err := h.teamService.GetMembers(teamID, userID)
		if err == nil && len(members) > 0 {
			var userIDs []uuid.UUID
			for _, m := range members {
				userIDs = append(userIDs, m.UserID)
			}
			h.notificationService.BroadcastDataUpdate(userIDs)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "role updated"})
}

func (h *TeamHandler) GetOnlineStatus(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	teamID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	// Проверяем, что пользователь является участником команды
	_, err = h.teamService.GetMembers(teamID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	if h.hub == nil {
		c.JSON(http.StatusOK, gin.H{"online_user_ids": []string{}})
		return
	}

	onlineIDs := h.hub.GetOnlineUserIDs()
	result := make([]string, 0, len(onlineIDs))
	for _, id := range onlineIDs {
		result = append(result, id.String())
	}

	c.JSON(http.StatusOK, gin.H{"online_user_ids": result})
}
