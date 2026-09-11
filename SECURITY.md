# Security Policy

## 1. Supported Versions

We release security patches for the following versions of LOW:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability within LOW, please send a report to **security@low.design** or create a private security advisory via GitHub.

**Please do not report security vulnerabilities through public GitHub issues.**

Include the following information in your report:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, authentication bypass)
- Detailed steps to reproduce the vulnerability
- Proof of concept or exploit payload if available
- Any potential impact on users or data

We acknowledge receipt of reports within 48 hours and aim to provide a timeline for resolution within 7 days.

---

## 3. Production Security Checklist

When deploying LOW to a public server or self-hosting in production:

1. **Change `JWT_SECRET`**:
   - Never use the default dev secret. Set a high-entropy secret key:
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
2. **Reverse Proxy & TLS/HTTPS**:
   - Always run LOW behind an HTTPS-terminating reverse proxy (such as Caddy, Nginx, or Traefik).
   - Never expose port 8000 directly to the public internet without proper TLS.
3. **Restrict `CORS_ORIGINS`**:
   - In production, change `CORS_ORIGINS=*` to your specific domain (e.g., `https://low.yourdomain.com`).
4. **Agent Connect Tokens**:
   - Agent tokens are shown only once upon creation.
   - Tokens are stored as salted SHA-256 hashes in SQLite.
   - Revoke stale agent sessions regularly or set `AGENT_SESSION_EXPIRE_MINUTES`.
5. **AI API Key Privacy**:
   - OpenAI or external AI keys are kept strictly on the backend server in `.env`.
   - Keys are never transmitted to frontend clients or exposed to agent sessions.
6. **Database Backups**:
   - Take regular backups using `python backend/scripts/backup.py` or SQLite online backup CLI.
   - Keep backup files in encrypted offsite storage.
