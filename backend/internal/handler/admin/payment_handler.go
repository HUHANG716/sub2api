package admin

import (
	"database/sql"
	"errors"
	"strconv"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// PaymentHandler handles admin payment management.
type PaymentHandler struct {
	paymentService *service.PaymentService
	configService  *service.PaymentConfigService
	sqlDB          *sql.DB
}

// NewPaymentHandler creates a new admin PaymentHandler.
func NewPaymentHandler(paymentService *service.PaymentService, configService *service.PaymentConfigService, sqlDBs ...*sql.DB) *PaymentHandler {
	var sqlDB *sql.DB
	if len(sqlDBs) > 0 {
		sqlDB = sqlDBs[0]
	}
	return &PaymentHandler{
		paymentService: paymentService,
		configService:  configService,
		sqlDB:          sqlDB,
	}
}

func ProvidePaymentHandler(paymentService *service.PaymentService, configService *service.PaymentConfigService, sqlDB *sql.DB) *PaymentHandler {
	return NewPaymentHandler(paymentService, configService, sqlDB)
}

// --- Dashboard ---

// GetDashboard returns payment dashboard statistics.
// GET /api/v1/admin/payment/dashboard
func (h *PaymentHandler) GetDashboard(c *gin.Context) {
	days := 30
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil && v > 0 {
			days = v
		}
	}
	stats, err := h.paymentService.GetDashboardStats(c.Request.Context(), days)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, stats)
}

type PaymentAnalyticsStep struct {
	Name        string `json:"name"`
	Count       int64  `json:"count"`
	UniqueUsers int64  `json:"unique_users"`
}

type PaymentAnalyticsMethod struct {
	PaymentType string `json:"payment_type"`
	EventName   string `json:"event_name"`
	Count       int64  `json:"count"`
}

type PaymentAnalyticsRecentEvent struct {
	Name        string     `json:"name"`
	Tab         *string    `json:"tab,omitempty"`
	OrderType   *string    `json:"order_type,omitempty"`
	PaymentType *string    `json:"payment_type,omitempty"`
	LaunchKind  *string    `json:"launch_kind,omitempty"`
	Source      *string    `json:"source,omitempty"`
	Status      *string    `json:"status,omitempty"`
	Amount      *float64   `json:"amount,omitempty"`
	PayAmount   *float64   `json:"pay_amount,omitempty"`
	PlanID      *int64     `json:"plan_id,omitempty"`
	OrderID     *int64     `json:"order_id,omitempty"`
	ErrorKind   *string    `json:"error_kind,omitempty"`
	CreatedAt   *time.Time `json:"created_at,omitempty"`
}

type PaymentAnalyticsResponse struct {
	Steps         []PaymentAnalyticsStep        `json:"steps"`
	Methods       []PaymentAnalyticsMethod      `json:"methods"`
	RecentEvents  []PaymentAnalyticsRecentEvent `json:"recent_events"`
	WindowDays    int                           `json:"window_days"`
	EventsMissing bool                          `json:"events_missing"`
}

// GetAnalytics returns payment funnel analytics from payment_events.
// GET /api/v1/admin/payment/analytics
func (h *PaymentHandler) GetAnalytics(c *gin.Context) {
	if h.sqlDB == nil {
		response.Success(c, PaymentAnalyticsResponse{WindowDays: parsePaymentAnalyticsDays(c), EventsMissing: true})
		return
	}

	days := parsePaymentAnalyticsDays(c)
	since := time.Now().AddDate(0, 0, -days)
	result := PaymentAnalyticsResponse{WindowDays: days}

	steps, err := h.queryPaymentAnalyticsSteps(c, since)
	if err != nil {
		if isMissingPaymentEventsTable(err) {
			result.EventsMissing = true
			response.Success(c, result)
			return
		}
		response.ErrorFrom(c, err)
		return
	}
	methods, err := h.queryPaymentAnalyticsMethods(c, since)
	if err != nil {
		if isMissingPaymentEventsTable(err) {
			result.EventsMissing = true
			response.Success(c, result)
			return
		}
		response.ErrorFrom(c, err)
		return
	}
	recentEvents, err := h.queryPaymentAnalyticsRecentEvents(c, since)
	if err != nil {
		if isMissingPaymentEventsTable(err) {
			result.EventsMissing = true
			response.Success(c, result)
			return
		}
		response.ErrorFrom(c, err)
		return
	}

	result.Steps = steps
	result.Methods = methods
	result.RecentEvents = recentEvents
	response.Success(c, result)
}

func isMissingPaymentEventsTable(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "42P01"
}

func parsePaymentAnalyticsDays(c *gin.Context) int {
	days := 30
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil && v > 0 {
			days = v
		}
	}
	if days > 180 {
		days = 180
	}
	return days
}

func (h *PaymentHandler) queryPaymentAnalyticsSteps(c *gin.Context, since time.Time) ([]PaymentAnalyticsStep, error) {
	rows, err := h.sqlDB.QueryContext(c.Request.Context(), `
		SELECT event_name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS unique_users
		FROM payment_events
		WHERE created_at >= $1
		GROUP BY event_name
		UNION ALL
		SELECT 'payment_result_success' AS event_name,
		       COUNT(DISTINCT COALESCE(order_id::text, id::text)) AS count,
		       COUNT(DISTINCT user_id) AS unique_users
		FROM payment_events
		WHERE created_at >= $1
		  AND (
		    event_name IN ('payment_success', 'payment_settled')
		    OR (
		      event_name = 'payment_result_status'
		      AND status IN ('COMPLETED', 'PAID', 'RECHARGING')
		    )
		  )
		ORDER BY event_name
	`, since)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	steps := make([]PaymentAnalyticsStep, 0)
	for rows.Next() {
		var step PaymentAnalyticsStep
		if err := rows.Scan(&step.Name, &step.Count, &step.UniqueUsers); err != nil {
			return nil, err
		}
		steps = append(steps, step)
	}
	return steps, rows.Err()
}

func (h *PaymentHandler) queryPaymentAnalyticsMethods(c *gin.Context, since time.Time) ([]PaymentAnalyticsMethod, error) {
	rows, err := h.sqlDB.QueryContext(c.Request.Context(), `
		SELECT COALESCE(payment_type, ''), event_name, COUNT(*) AS count
		FROM payment_events
		WHERE created_at >= $1
		  AND COALESCE(payment_type, '') <> ''
		  AND event_name = 'payment_order_submit'
		GROUP BY payment_type, event_name
		UNION ALL
		SELECT COALESCE(payment_type, ''), 'payment_result_status' AS event_name,
		       COUNT(DISTINCT COALESCE(order_id::text, id::text)) AS count
		FROM payment_events
		WHERE created_at >= $1
		  AND COALESCE(payment_type, '') <> ''
		  AND (
		    event_name IN ('payment_success', 'payment_settled')
		    OR (
		      event_name = 'payment_result_status'
		      AND status IN ('COMPLETED', 'PAID', 'RECHARGING')
		    )
		  )
		GROUP BY payment_type
		ORDER BY payment_type, event_name
	`, since)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	methods := make([]PaymentAnalyticsMethod, 0)
	for rows.Next() {
		var item PaymentAnalyticsMethod
		if err := rows.Scan(&item.PaymentType, &item.EventName, &item.Count); err != nil {
			return nil, err
		}
		methods = append(methods, item)
	}
	return methods, rows.Err()
}

func (h *PaymentHandler) queryPaymentAnalyticsRecentEvents(c *gin.Context, since time.Time) ([]PaymentAnalyticsRecentEvent, error) {
	rows, err := h.sqlDB.QueryContext(c.Request.Context(), `
		SELECT event_name, tab, order_type, payment_type, launch_kind, source, status,
		       amount, pay_amount, plan_id, order_id, error_kind, created_at
		FROM payment_events
		WHERE created_at >= $1
		ORDER BY created_at DESC
		LIMIT 20
	`, since)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	events := make([]PaymentAnalyticsRecentEvent, 0)
	for rows.Next() {
		var event PaymentAnalyticsRecentEvent
		if err := rows.Scan(
			&event.Name,
			&event.Tab,
			&event.OrderType,
			&event.PaymentType,
			&event.LaunchKind,
			&event.Source,
			&event.Status,
			&event.Amount,
			&event.PayAmount,
			&event.PlanID,
			&event.OrderID,
			&event.ErrorKind,
			&event.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

// --- Orders ---

// ListOrders returns a paginated list of all payment orders.
// GET /api/v1/admin/payment/orders
func (h *PaymentHandler) ListOrders(c *gin.Context) {
	page, pageSize := response.ParsePagination(c)
	var userID int64
	if uid := c.Query("user_id"); uid != "" {
		if v, err := strconv.ParseInt(uid, 10, 64); err == nil {
			userID = v
		}
	}
	orders, total, err := h.paymentService.AdminListOrders(c.Request.Context(), userID, service.OrderListParams{
		Page:        page,
		PageSize:    pageSize,
		Status:      c.Query("status"),
		OrderType:   c.Query("order_type"),
		PaymentType: c.Query("payment_type"),
		Keyword:     c.Query("keyword"),
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Paginated(c, sanitizeAdminPaymentOrdersForResponse(orders), int64(total), page, pageSize)
}

// GetOrderDetail returns detailed information about a single order.
// GET /api/v1/admin/payment/orders/:id
func (h *PaymentHandler) GetOrderDetail(c *gin.Context) {
	orderID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	order, err := h.paymentService.GetOrderByID(c.Request.Context(), orderID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	auditLogs, _ := h.paymentService.GetOrderAuditLogs(c.Request.Context(), orderID)
	response.Success(c, gin.H{"order": sanitizeAdminPaymentOrderForResponse(order), "auditLogs": auditLogs})
}

// CancelOrder cancels a pending order (admin).
// POST /api/v1/admin/payment/orders/:id/cancel
func (h *PaymentHandler) CancelOrder(c *gin.Context) {
	orderID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	msg, err := h.paymentService.AdminCancelOrder(c.Request.Context(), orderID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": msg})
}

// RetryFulfillment retries fulfillment for a paid order.
// POST /api/v1/admin/payment/orders/:id/retry
func (h *PaymentHandler) RetryFulfillment(c *gin.Context) {
	orderID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	if err := h.paymentService.RetryFulfillment(c.Request.Context(), orderID); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "fulfillment retried"})
}

func sanitizeAdminPaymentOrdersForResponse(orders []*dbent.PaymentOrder) []*dbent.PaymentOrder {
	if len(orders) == 0 {
		return orders
	}
	out := make([]*dbent.PaymentOrder, 0, len(orders))
	for _, order := range orders {
		out = append(out, sanitizeAdminPaymentOrderForResponse(order))
	}
	return out
}

func sanitizeAdminPaymentOrderForResponse(order *dbent.PaymentOrder) *dbent.PaymentOrder {
	if order == nil {
		return nil
	}
	cloned := *order
	cloned.ProviderSnapshot = nil
	return &cloned
}

// AdminProcessRefundRequest is the request body for admin refund processing.
type AdminProcessRefundRequest struct {
	Amount        float64 `json:"amount"`
	Reason        string  `json:"reason"`
	Force         bool    `json:"force"`
	DeductBalance bool    `json:"deduct_balance"`
}

// ProcessRefund processes a refund for an order (admin).
// POST /api/v1/admin/payment/orders/:id/refund
func (h *PaymentHandler) ProcessRefund(c *gin.Context) {
	orderID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	var req AdminProcessRefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	plan, earlyResult, err := h.paymentService.PrepareRefund(c.Request.Context(), orderID, req.Amount, req.Reason, req.Force, req.DeductBalance)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if earlyResult != nil {
		response.Success(c, earlyResult)
		return
	}

	result, err := h.paymentService.ExecuteRefund(c.Request.Context(), plan)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, result)
}

// --- Subscription Plans ---

// ListPlans returns all subscription plans.
// GET /api/v1/admin/payment/plans
func (h *PaymentHandler) ListPlans(c *gin.Context) {
	plans, err := h.configService.ListPlans(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, plans)
}

// CreatePlan creates a new subscription plan.
// POST /api/v1/admin/payment/plans
func (h *PaymentHandler) CreatePlan(c *gin.Context) {
	var req service.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	plan, err := h.configService.CreatePlan(c.Request.Context(), req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Created(c, plan)
}

// UpdatePlan updates an existing subscription plan.
// PUT /api/v1/admin/payment/plans/:id
func (h *PaymentHandler) UpdatePlan(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req service.UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	plan, err := h.configService.UpdatePlan(c.Request.Context(), id, req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, plan)
}

// DeletePlan deletes a subscription plan.
// DELETE /api/v1/admin/payment/plans/:id
func (h *PaymentHandler) DeletePlan(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	if err := h.configService.DeletePlan(c.Request.Context(), id); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "deleted"})
}

// --- Provider Instances ---

// ListProviders returns all payment provider instances.
// GET /api/v1/admin/payment/providers
func (h *PaymentHandler) ListProviders(c *gin.Context) {
	providers, err := h.configService.ListProviderInstancesWithConfig(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, providers)
}

// CreateProvider creates a new payment provider instance.
// POST /api/v1/admin/payment/providers
func (h *PaymentHandler) CreateProvider(c *gin.Context) {
	var req service.CreateProviderInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	inst, err := h.configService.CreateProviderInstance(c.Request.Context(), req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	h.paymentService.RefreshProviders(c.Request.Context())
	response.Created(c, inst)
}

// UpdateProvider updates an existing payment provider instance.
// PUT /api/v1/admin/payment/providers/:id
func (h *PaymentHandler) UpdateProvider(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req service.UpdateProviderInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	inst, err := h.configService.UpdateProviderInstance(c.Request.Context(), id, req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	h.paymentService.RefreshProviders(c.Request.Context())
	response.Success(c, inst)
}

// DeleteProvider deletes a payment provider instance.
// DELETE /api/v1/admin/payment/providers/:id
func (h *PaymentHandler) DeleteProvider(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	if err := h.configService.DeleteProviderInstance(c.Request.Context(), id); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	h.paymentService.RefreshProviders(c.Request.Context())
	response.Success(c, gin.H{"message": "deleted"})
}

// parseIDParam parses an int64 path parameter.
// Returns the parsed ID and true on success; on failure it writes a BadRequest response and returns false.
func parseIDParam(c *gin.Context, paramName string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(paramName), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid "+paramName)
		return 0, false
	}
	return id, true
}

// --- Config ---

// GetConfig returns the payment configuration (admin view).
// GET /api/v1/admin/payment/config
func (h *PaymentHandler) GetConfig(c *gin.Context) {
	cfg, err := h.configService.GetPaymentConfig(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, cfg)
}

// UpdateConfig updates the payment configuration.
// PUT /api/v1/admin/payment/config
func (h *PaymentHandler) UpdateConfig(c *gin.Context) {
	var req service.UpdatePaymentConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := h.configService.UpdatePaymentConfig(c.Request.Context(), req); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "updated"})
}
