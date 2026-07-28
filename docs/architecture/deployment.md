# Deployment Guide

## Prerequisites

- PHP 8.2+
- Composer 2.x
- Node.js 18+ (npm 9+)
- MySQL 8.0+ or MariaDB 10.6+
- Web server (Apache/Nginx) or Laravel Valet for development

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url> magoerp
cd magoerp
```

### 2. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Environment configuration
cp .env.example .env
php artisan key:generate

# Configure database in .env:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=magoerp
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations and seeders
php artisan migrate --seed

# Storage link (for file uploads)
php artisan storage:link
```

### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Environment configuration
cp .env.example .env
# Configure:
# VITE_API_URL=http://127.0.0.1:8000/api

# Start development server
npm run dev
```

### 4. Start Backend Server

```bash
# From the backend directory
php artisan serve
```

The application is now accessible at:
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend API: `http://127.0.0.1:8000/api`

---

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|---|---|---|
| `APP_ENV` | Application environment | `local`, `production` |
| `APP_DEBUG` | Enable debug mode | `true`, `false` |
| `DB_CONNECTION` | Database driver | `mysql` |
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port | `3306` |
| `DB_DATABASE` | Database name | `magoerp` |
| `DB_USERNAME` | Database user | `root` |
| `DB_PASSWORD` | Database password | |
| `CACHE_DRIVER` | Cache backend | `file`, `redis` |
| `SESSION_DRIVER` | Session backend | `file`, `redis` |
| `SANCTUM_STATEFUL_DOMAINS` | SPA domains for Sanctum | `localhost:5173` |
| `SESSION_LIFETIME_MINUTES` | Session timeout | `1440` |
| `SECURITY_RISK_SCORE_THRESHOLD` | Risk score block threshold | `50` |
| `SECURITY_FAILED_LOGIN_THRESHOLD` | Login attempts before flagging | `5` |

### Frontend (.env)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://127.0.0.1:8000/api` |
| `VITE_AUTH_API_URL` | Auth API base URL (falls back to API_URL) | |
| `VITE_AUTH_API_RETRIES` | Axios retry count | `0` |

---

## Production Build

### Backend

```bash
cd backend

# Optimize Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Disable debug
# APP_DEBUG=false in .env
```

### Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

Serve the `dist/` directory via your web server, or serve it from Laravel's `public/` directory.

---

## Web Server Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name magoerp.example.com;
    root /var/www/magoerp/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

For the frontend SPA served separately:

```nginx
server {
    listen 80;
    server_name app.magoerp.example.com;
    root /var/www/magoerp/frontend/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName magoerp.example.com
    DocumentRoot /var/www/magoerp/backend/public

    <Directory /var/www/magoerp/backend/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/magoerp-error.log
    CustomLog ${APACHE_LOG_DIR}/magoerp-access.log combined
</VirtualHost>
```

---

## CORS Configuration

Laravel's `config/cors.php` (or `bootstrap/app.php` in Laravel 11) must allow the frontend origin:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
];
```

Sanctum stateful domains must include the frontend URL:

```
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

---

## Database Migrations

Run all migrations:

```bash
php artisan migrate
```

Rollback (with caution in production):

```bash
php artisan migrate:rollback --step=1
```

Seed fresh database:

```bash
php artisan migrate:fresh --seed
```

---

## Testing

### Backend Tests

```bash
cd backend
php artisan test
```

Currently, there are tests for:
- `FinanceReportsTest` — tests finance dashboard endpoint
- `FinanceIntegrityTest` — tests finance data integrity checks

No frontend test suite is configured.

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---|---|
| `Target class [xxxController] does not exist` | Run `composer dump-autoload` |
| SQLSTATE[HY000] [1045] Access denied | Check `DB_USERNAME` / `DB_PASSWORD` in `.env` |
| 401 on all API requests | Verify Sanctum token is being sent in Authorization header |
| CORS errors in browser | Check `SANCTUM_STATEFUL_DOMAINS` and CORS config |
| Vite HMR not working | Ensure `VITE_API_URL` points to correct backend URL |
| File uploads failing | Run `php artisan storage:link` |
