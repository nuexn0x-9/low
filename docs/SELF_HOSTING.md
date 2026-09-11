# LOW Self-Hosting & Production Guide

This guide covers deploying **LOW** on your own Linux virtual private server (VPS), homelab server, or cloud instance.

---

## 1. Architecture Overview

```
[Internet]
    |
    v
[Reverse Proxy (Caddy / Nginx / Cloudflare)]  --> TLS Termination (HTTPS:443)
    |
    +---> :3000 (React Frontend SPA served via Nginx)
    +---> :8000 (FastAPI Backend API + WebSocket/HTTP)
             |
             +---> SQLite Database (/app/data/low.db with WAL mode)
             +---> File Upload Storage (/app/data/uploads)
```

---

## 2. Docker Compose in Production

### Step 1: Clone and Configure
```bash
# Clone the repository
git clone https://github.com/nuexn0x-9/low.git /opt/low
cd /opt/low

cp .env.example .env
```

### Step 2: Set Strong Production Environment Variables
Edit `/opt/low/.env`:
```env
APP_NAME=LOW
APP_ENV=production

# Generate a strong 32+ character key:
JWT_SECRET=super-secret-random-production-key-32-chars-long

# Bind CORS to your production domain:
CORS_ORIGINS=https://low.yourdomain.com

# AI Provider setup:
AI_PROVIDER=mock  # or openai
OPENAI_API_KEY=sk-...
```

### Step 3: Run Containers
```bash
docker compose up -d
```

---

## 3. Reverse Proxy & SSL Configuration

### Option A: Caddy (Recommended — Automatic HTTPS)
Add this to your `/etc/caddy/Caddyfile`:

```caddy
low.yourdomain.com {
    # Proxy API requests to backend
    handle /api/* {
        reverse_proxy localhost:8000
    }

    # Proxy all other requests to frontend
    handle {
        reverse_proxy localhost:3000
    }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### Option B: Nginx + Certbot
```nginx
server {
    listen 80;
    server_name low.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name low.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/low.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/low.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. SQLite Optimization for Production

LOW uses SQLite with `aiosqlite`. For best performance under concurrent access, enable Write-Ahead Logging (WAL):

```bash
sqlite3 /opt/low/data/low.db "PRAGMA journal_mode=WAL;"
```
WAL mode allows multiple concurrent readers while a write is in progress.

---

## 5. Automated Backups via Cron

Add a daily cron job to run the backup script:

```bash
sudo crontab -e
```
Add:
```cron
0 2 * * * cd /opt/low && docker compose exec -T backend python -c "import sqlite3; s=sqlite3.connect('/app/data/low.db'); d=sqlite3.connect(f'/app/data/backup_{import_time}.db'); s.backup(d); s.close(); d.close()"
```
Or use the provided host script:
```cron
0 2 * * * cd /opt/low && python backend/scripts/backup.py
```
