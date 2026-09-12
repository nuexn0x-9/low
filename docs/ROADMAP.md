# LOW Product Roadmap

This roadmap outlines achieved milestones and future directions for **LOW (Lowcode Oriented Wireframe)**.

---

## Current Status: v0.1.0 (Public MVP) :white_check_mark:

- [x] **Monochrome Minimalist Canvas**: Mobile-first focused UI wireframing environment without color distraction.
- [x] **Open `.low.json` Document Format**: Human-readable, transparent document ownership without vendor lock-in.
- [x] **FastAPI + SQLite WAL Backend**: Lightweight, asynchronous, self-hosted architecture with optimistic concurrency control.
- [x] **Multi-Select & Workflow Tools**: Marquee selection, `Shift+Click`, grouping (`Ctrl+G`), alignment tools, and distribute spacing.
- [x] **Typography & Design System**: Full typography controls, 11 style presets, and design tokens (colors, radii, spacing).
- [x] **Component System**: Reusable master components and instance overrides with detach capability.
- [x] **Responsive Layout & Auto Layout**: Flexbox containers (`autoLayout`), directional stack, padding, gap, sizing modes (`fixed`, `fill`, `hug`), and responsive constraints.
- [x] **Device Presets & Safe Area**: Presets (`iPhone 15`, `iPhone SE`, `Android Compact/Large`) and safe area insets.
- [x] **AI Import Engine**: Generate full mobile screens from natural language prompts using Mock (offline) or OpenAI providers.
- [x] **Universal Agent Connect (v2.4.0)**: Scoped HTTP protocol empowering external AI agents (Cursor, Claude, Codex, Antigravity) with 33 atomic actions, dry-run simulation, and 1-click snapshot rollback.
- [x] **Developer Inspect & Code Generator**: Read-only inspect mode, live CSS snippets, Tailwind classes, JSON schema copy, and design tokens export.
- [x] **Export Engine**: In-browser vector SVG export, PNG rasterization, tokens (`.json` and `.css`), and offline standalone interactive prototype bundles (`prototype.zip`).
- [x] **First-Run Onboarding & Sample Pack**: Built-in samples (`fintech-login`, `onboarding-flow`, `marketplace-home`, `agent-generated-flow`).

---

## Near-Term: v0.2.0 (Q4 2026)

- [ ] **Official MCP Server (`low-mcp`)**: Native Model Context Protocol server for seamless 1-click registration in Claude Desktop and Cursor.
- [ ] **Local AI Providers**: Integrated Ollama & LocalAI support for 100% offline, private prompt-to-wireframe generations.
- [ ] **Direct PDF Flow Export**: Generate multipage clickable prototype PDF documentation for client presentations.
- [ ] **Custom Monochrome Themes**: Pure OLED black, classic zinc, slate, and warm paper themes.

---

## Mid-Term: v0.3.0 (Q1 2027)

- [ ] **Component Variants & Interaction States**: Hover, active, pressed, and disabled states.
- [ ] **Realtime Presence Indicators**: Lightweight peer-to-peer presence showing who is viewing which screen.
- [ ] **Code Export Plugins**: 1-click code export to React Native StyleSheet and Flutter widgets.

---

## Long-Term Vision

- [ ] **Autonomous Agent Pair-Designer**: AI agents actively auditing wireframes for accessibility (WCAG contrast, touch target sizes) and recommending responsive layout adjustments in real time.
- [ ] **Community Template Hub**: Open decentralized registry for sharing `.low.json` component kits.

