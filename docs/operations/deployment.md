# Operations: Deployment

---

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+ / npm
- MySQL 8.0+ (or MariaDB 10.6+)
- Web server (Nginx or Apache)

---

## Backend Deployment

### 1. Install Dependencies

```bash
cd backend
composer install --optimize-autoloader --no-dev
```

### 2. Environment Configuration

```bash
cp .env.example .env
php artisan key:generate
```

### 3. Database Setup

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoDataSeeder  # optional demo data
```

### 4. Cache Configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 5. Storage Link

```bash
php artisan storage:link
```

### 6. Queue Worker (if using queues)

```bash
php artisan queue:work --daemon
```

---

## Frontend Deployment

### 1. Install Dependencies

```bash
cd frontend
npm ci
```

### 2. Build

```bash
npm run build
```

Output is in `frontend/dist/`. Serve this directory from your web server.

### 3. Environment

Create `frontend/.env.production`:
```
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_NAME=Mago ERP
```

---

## Web Server Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
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

### Apache

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/magoerp/backend/public

    <Directory /var/www/magoerp/backend/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Frontend SPA Routing

For the frontend (served separately or from `public/`):

```nginx
location /app {
    alias /var/www/magoerp/frontend/dist;
    try_files $uri $uri/ /app/index.html;
}
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Application environment | `production` |
| `APP_DEBUG` | Debug mode | `false` |
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_DATABASE` | Database name | `magoerp` |
| `DB_USERNAME` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `CACHE_DRIVER` | Cache backend | `file` |
| `SESSION_DRIVER` | Session backend | `file` |
| `FILESYSTEM_DISK` | File storage | `local` |
| `SANCTUM_STATEFUL_DOMAINS` | CORS allowed domains | — |

---

## Health Checks

- `GET /api/health` — returns `{ "status": "ok", "timestamp": "..." }`
- Checks database connection, cache reachability, and queue health
