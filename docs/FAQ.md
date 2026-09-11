# Frequently Asked Questions (FAQ)

### What is LOW?
LOW (Lowcode Oriented Wireframe) is a lightweight, open-source mobile UI/UX wireframing tool built with FastAPI and React 19. It focuses on clean typography, open `.low.json` documents, zero vendor lock-in, and full AI agent control.

---

### How is LOW different from Figma or Penpot?
1. **Mobile-First & Monochrome**: LOW is intentionally focused on mobile wireframing with a disciplined monochrome palette (`#18181b`, `#f4f4f5`). It eliminates visual distractions during early product ideation.
2. **Built for AI Agents**: While traditional design tools have AI plugins, LOW includes **Universal Agent Connect** natively — an open HTTP protocol with scoped tokens, atomic batch updates, dry-runs, and reversible audit logs designed for AI agents like Cursor, Claude, and Codex.
3. **Lightweight & Self-Hostable**: LOW runs on a modest 1-core VPS or Docker container with SQLite. No heavy cluster requirements.

---

### Does LOW require paid AI subscriptions?
**No.** Out of the box, LOW runs with an offline, deterministic **Mock AI Provider** that costs \$0 and requires no internet access or API keys. If you want live LLM generations, you can optionally supply an OpenAI API key in `.env`.

---

### Can I export my designs to code?
Yes! LOW designs are saved as standard `.low.json` files. You can export them at any time, feed them to external code generation LLMs (like Claude or Cursor), or write automated scripts to convert them into React Native, Flutter, or HTML components.

---

### How do I backup my database?
Run `python backend/scripts/backup.py` or take a snapshot with `docker compose exec backend python scripts/backup.py`. Backups are saved safely as uncorrupted SQLite files in `backups/`.

---

### Can I run LOW without Docker?
Yes. See [`docs/INSTALLATION.md`](INSTALLATION.md) for step-by-step instructions on running the FastAPI backend and React frontend directly using Python and Node.js.
