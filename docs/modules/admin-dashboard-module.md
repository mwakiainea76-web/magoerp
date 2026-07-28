# Admin Dashboard Module

Provides aggregated KPIs, chart data, and recent activity for the admin landing page.

---

## Architecture

Read-only dashboard module — data is aggregated from multiple other modules (students, staff, finance, attendance, support). No dedicated models; relies entirely on queries across existing tables.

---

## Backend Structure

```
app/Http/Controllers/Api/AdminDashboardController.php
```

### Route Registration

```php
Route::get('admin-dashboard/stats', [AdminDashboardController::class, 'stats']);
Route::get('admin-dashboard/chart-data', [AdminDashboardController::class, 'chartData']);
Route::get('admin-dashboard/recent-activity', [AdminDashboardController::class, 'recentActivity']);
```

### Key Business Logic

- Stats are computed from live queries (no cached aggregation).
- Chart data accepts `period` and `chart_type` parameters to serve specific chart configurations.
- Recent activity pulls from multiple sources (security events, enrolment timestamps, support request updates).

---

## Frontend Structure

```
frontend/src/views/admin-dashboard/
  AdminDashboardPage.jsx
```

### Components

- **AdminDashboardPage**: Dashboard layout with stat cards, charts, and recent activity feed.
  - StatCardsRow: Total students, staff, courses, outstanding fees, attendance rate, open support requests.
  - ChartSection: Time-series chart configurable by period (today/week/month/year) and type (enrolments/attendance/fees).
  - RecentActivityFeed: Scrolling list of recent system events.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin-dashboard/stats` | Aggregated KPIs |
| GET | `/api/admin-dashboard/chart-data` | Chart time-series data |
| GET | `/api/admin-dashboard/recent-activity` | Recent system activity |
