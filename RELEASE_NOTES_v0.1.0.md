# LOW v0.1.0 — Public MVP Release Notes

We are thrilled to announce the first public release of **LOW (Lowcode Oriented Wireframe)**!

**LOW** is a distraction-free, self-hostable mobile UI/UX design tool built with **FastAPI**, **SQLite (WAL Mode)**, and **React 19**. It is designed to be a lightweight, transparent alternative to proprietary cloud design tools, built specifically for the era of AI agentic pair-programming.

---

## Highlights & Key Capabilities

- **Monochrome Minimalist Canvas**: Mobile-first wireframe design environment focused on UX hierarchy, typography, and flow without visual noise.
- **Open `.low.json` Format**: 100% data ownership. Human-readable JSON schema, zero vendor lock-in, and optimistic revision tracking.
- **Auto Layout & Responsive Containers (`Shift + A`)**: Flexbox direction, configurable padding and gap, alignment, justification, and child sizing (`fill`, `hug`, `fixed`).
- **Responsive Constraints & Screen Presets**: Horizontal and vertical constraints with instant layout recalculation across screen presets (`iPhone 15`, `iPhone SE`, `Android Compact`, `Android Large`, and custom dimensions).
- **Safe Area Insets & Scroll Areas**: Visual guides for mobile device notches/home bars and dedicated scrollable containers.
- **Component System & Design Tokens**: Master component symbols, instance overrides with detach capability, 11 style presets, and design tokens (colors, radii, spacing).
- **Developer Inspect Mode (`Design | Prototype | Inspect`)**: Non-destructive read-only canvas inspection with deep box-model metrics, auto layout hierarchy, and typography inspection.
- **Instant Code & Token Generators**: 1-click CSS snippet generator, Tailwind utility class generator, JSON schema exporter, and CSS custom variables (`:root { --low-... }`).
- **In-Browser Asset Export**: Zero-dependency vector SVG export and client-side high-resolution PNG rasterization for screens and selected components.
- **Standalone Offline Prototype Package (`prototype.zip`)**: Download a self-contained offline interactive mobile prototype with a zero-dependency HTML viewer (`index.html`) playable in any browser.
- **AI Import Engine**: Natural language prompt-to-wireframe generator supporting offline mock mode and OpenAI GPT JSON mode.
- **Universal Agent Connect (v2.4.0)**: Scoped HTTP API empowering external AI agents (Cursor, Claude, Codex, Antigravity, Hermes) with 33 atomic actions, simulation dry-runs, atomic batch operations, and 1-click snapshot rollback.
- **First-Run Onboarding & Sample Pack**: Built-in sample projects in `examples/` (`fintech-login`, `onboarding-flow`, `marketplace-home`, and `agent-generated-flow`).

---

## Quick Install (Docker Compose)

```bash
git clone https://github.com/nuexn0x-9/low.git
cd low
cp .env.example .env
docker compose up -d --build
```

Access the application:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Quick Install (Windows 1-Click)

On Windows, double-click **`run.bat`** in the root folder. It will configure `.env`, seed the database, launch the backend and frontend, and open your browser automatically.

---

## Documentation & Links

- **Documentation**: [`docs/`](docs/)
- **Sample Projects**: [`examples/`](examples/)
- **Roadmap**: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **License**: AGPL-3.0
