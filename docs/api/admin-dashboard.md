# Admin Dashboard API

Base URL: `/api`

---

## GET /admin-dashboard/stats

Aggregated KPIs for the admin dashboard.

**Permissions**: `dashboard.view`

**Response (200)**:
```json
{
  "total_students": 1200,
  "total_staff": 85,
  "total_courses": 25,
  "total_units": 180,
  "active_sessions": 3,
  "attendance_rate_today": 87.5,
  "outstanding_fees": 1500000,
  "total_collected_this_month": 450000,
  "recent_enrolments": 45,
  "open_support_requests": 12
}
```

---

## GET /admin-dashboard/chart-data

Time-series data for dashboard charts.

**Query Parameters**: `period` (today, week, month, year), `chart_type` (enrolments, attendance, fees)

**Response (200)**:
```json
{
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "datasets": [
    {
      "label": "Enrolments",
      "data": [45, 52, 38, 60, 55, 70]
    },
    {
      "label": "Payments (KES)",
      "data": [300000, 450000, 380000, 500000, 420000, 600000]
    }
  ]
}
```

---

## GET /admin-dashboard/recent-activity

Recent system activity.

**Response**:
```json
{
  "data": [
    {
      "type": "enrolment",
      "description": "John Doe enrolled in ICT101",
      "icon": "user-plus",
      "time": "5 minutes ago"
    }
  ]
}
```
