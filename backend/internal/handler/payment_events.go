package handler

import (
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"

	"github.com/gin-gonic/gin"
)

type paymentEventRequest struct {
	Name        string   `json:"name"`
	Tab         string   `json:"tab"`
	OrderType   string   `json:"orderType"`
	PaymentType string   `json:"paymentType"`
	LaunchKind  string   `json:"launchKind"`
	Source      string   `json:"source"`
	Status      string   `json:"status"`
	Amount      *float64 `json:"amount"`
	PayAmount   *float64 `json:"payAmount"`
	FeeRate     *float64 `json:"feeRate"`
	PlanID      *int64   `json:"planId"`
	OrderID     *int64   `json:"orderId"`
	ErrorKind   string   `json:"errorKind"`
}

type paymentEventsRequest struct {
	Events []paymentEventRequest `json:"events"`
}

const maxPaymentEventsPerRequest = 20

var allowedPaymentEvents = map[string]struct{}{
	"payment_page_view":            {},
	"payment_tab_change":           {},
	"payment_amount_select":        {},
	"payment_method_select":        {},
	"payment_plan_select":          {},
	"payment_order_submit":         {},
	"payment_order_create_success": {},
	"payment_order_create_error":   {},
	"payment_launch":               {},
	"payment_success":              {},
	"payment_settled":              {},
	"payment_result_view":          {},
	"payment_result_status":        {},
}

// RecordPaymentEvents stores minimal, non-sensitive payment funnel analytics.
// POST /api/v1/payment/events
func (h *PaymentHandler) RecordPaymentEvents(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	if h.sqlDB == nil {
		response.Error(c, 503, "Payment analytics is not available")
		return
	}

	var req paymentEventsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	if len(req.Events) == 0 {
		response.BadRequest(c, "events is required")
		return
	}
	if len(req.Events) > maxPaymentEventsPerRequest {
		response.BadRequest(c, "too many events")
		return
	}

	tx, err := h.sqlDB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		response.Error(c, 500, "Failed to record payment events")
		return
	}
	defer func() { _ = tx.Rollback() }()

	inserted := 0
	for _, event := range req.Events {
		name := strings.TrimSpace(event.Name)
		if _, ok := allowedPaymentEvents[name]; !ok {
			response.BadRequest(c, "invalid payment event")
			return
		}
		if _, err := tx.ExecContext(c.Request.Context(), `
			INSERT INTO payment_events (
				user_id, event_name, tab, order_type, payment_type, launch_kind,
				source, status, amount, pay_amount, fee_rate, plan_id, order_id, error_kind
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		`,
			subject.UserID,
			name,
			paymentNullableString(event.Tab, 32),
			paymentNullableString(event.OrderType, 32),
			paymentNullableString(event.PaymentType, 32),
			paymentNullableString(event.LaunchKind, 32),
			paymentNullableString(event.Source, 32),
			paymentNullableString(event.Status, 32),
			paymentNullableNonNegativeFloat(event.Amount),
			paymentNullableNonNegativeFloat(event.PayAmount),
			paymentNullableNonNegativeFloat(event.FeeRate),
			paymentNullablePositiveInt64(event.PlanID),
			paymentNullablePositiveInt64(event.OrderID),
			paymentNullableString(event.ErrorKind, 100),
		); err != nil {
			response.Error(c, 500, "Failed to record payment events")
			return
		}
		inserted++
	}

	if err := tx.Commit(); err != nil {
		response.Error(c, 500, "Failed to record payment events")
		return
	}
	response.Success(c, gin.H{"inserted": inserted})
}

func paymentNullableString(value string, maxLen int) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	runes := []rune(trimmed)
	if maxLen > 0 && len(runes) > maxLen {
		return string(runes[:maxLen])
	}
	return trimmed
}

func paymentNullableNonNegativeFloat(value *float64) any {
	if value == nil || *value < 0 {
		return nil
	}
	return *value
}

func paymentNullablePositiveInt64(value *int64) any {
	if value == nil || *value <= 0 {
		return nil
	}
	return *value
}
