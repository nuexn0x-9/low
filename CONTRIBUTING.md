# Contributing to LOW

Thank you for your interest in contributing to **LOW (Lowcode Oriented Wireframe)**! We welcome contributions ranging from bug fixes, documentation improvements, and tests, to new UI components and AI provider bridges.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 2. Architecture & Design Principles

Before submitting code, please ensure your changes adhere to LOW's core architectural philosophies:

1. **Monochrome Minimalist Aesthetic**:
   - Palette strictly adheres to zinc neutral tones (`#18181b`, `#27272a`, `#3f3f46`, `#71717a`, `#a1a1aa`, `#d4d4d8`, `#e4e4e7`, `#f4f4f5`, `#ffffff`).
   - Clean, lightweight, typography-driven UI without heavy graphics or unnecessary animations.
2. **Open Document Format (`.low.json`)**:
   - All designs must serialize to clean, predictable JSON with no vendor lock-in.
3. **Self-Hostable & Lightweight**:
   - Zero heavy binary rendering dependencies (no Puppeteer, Cairo, or headless Chrome requirements on the backend).
4. **Universal Agent Connect & AI Safety**:
   - All mutations must be validated against schema allowlists.
   - All mutating agent actions must be atomic and reversible via audit logs.

---

## 3. Getting Started with Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Setup Steps
```bash
# 1. Clone repository
git clone https://github.com/your-username/low.git
cd low

# 2. Setup backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed.py

# 3. Setup frontend
cd ../frontend
npm install
```

### Running Locally
```bash
# In backend terminal:
python -m uvicorn app.main:app --reload --port 8000

# In frontend terminal:
npm start
```

---

## 4. Testing Requirements

All Pull Requests must pass automated tests before being merged:

```bash
# Backend pytest suite (must pass 36/36 tests):
cd backend && python -m pytest -v

# Frontend jest suite:
cd frontend && npm test -- --watchAll=false

# Production build test:
cd frontend && npm run build
```

---

## 5. Submitting a Pull Request

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-cool-enhancement
   ```
2. Write clean code with descriptive commit messages.
3. Verify all tests pass locally.
4. Push to your fork and submit a Pull Request following the PR template.
5. Participate constructively in code review.
