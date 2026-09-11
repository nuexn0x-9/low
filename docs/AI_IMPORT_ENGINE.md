# LOW AI Import Engine

The **AI Import Engine** allows users and external agents to generate complete mobile screens, components, templates, and interactive prototype flows directly into valid, structured `.low.json` documents.

---

## 1. Design Principles

- **No Static Bitmaps**: The AI produces editable canvas nodes and layouts, not static images.
- **Strict Validation Guard**: Every output from any provider is audited against the `.low.json` node schema before user preview.
- **Offline Mock Provider by Default**: Always runs offline with zero API keys or external costs for instant evaluation and testing.
- **Provider-Agnostic Interface**: Supports deterministic mock, OpenAI GPT models, and future local models (Ollama, vLLM).

---

## 2. Supported Output Types

1. **`screen`**: Complete mobile screen layout with navigation headers, input forms, cards, and buttons.
2. **`component`**: Reusable component elements (e.g. styled buttons, credit card widgets, search bars).
3. **`template`**: Reusable multi-screen flows (e.g. Onboarding, Auth, Settings).
4. **`prototype`**: Multi-screen sequence connected with interactive prototype triggers (`tap`, `navigate`, `slide`).

---

## 3. Providers

### Mock Provider (Default)
Deterministic, instantaneous, zero cost, completely offline. It handles common mobile UI prompts:
- Fintech login & onboarding
- Bottom navigation flows
- Profile & settings screens
- Filter bottom sheets

### OpenAI Provider
Uses OpenAI Chat Completion API in JSON Mode with `gpt-4o-mini` (or `gpt-4o`).
- Configured via `AI_PROVIDER=openai` and `OPENAI_API_KEY=sk-...`
- Features: 30-second timeout, 2 exponential retries with backoff, response size checks (1MB limit), and strict error redaction to prevent key leakage.

---

## 4. Safety & Schema Guards

The validation guard checks:
- Node count limits (maximum 80 nodes per screen).
- Screen count limits (maximum 5 screens per generation).
- Bounding box checks (non-negative dimensions).
- Node type allowlist (`text`, `rectangle`, `input`, `button`, `link`, `image`, `bottomnav`, `component`).
- Prototype trigger & action validation.
- XSS and script tag sanitization.

---

## 5. Draft History & Versioning

Every generation creates an `AIImportDraft` row:
- Status: `valid`, `invalid`, or `applied`.
- Full token usage metadata (prompt tokens, completion tokens, duration in milliseconds).
- Pre-apply snapshot: before applying an AI patch, a document version snapshot is saved automatically so the user can roll back if needed.

---

## 6. In-App UI Settings (Gear Icon)

Users can configure AI settings directly inside the editor by clicking the **gear icon** in the AI Import panel header:
- **Active Provider Selector**: Switch between `Mock`, `OpenAI`, `OpenAI Compatible` (Ollama, vLLM, DeepSeek), or `Custom Endpoint`.
- **API Key Management**: Secure password-masked input with show/hide toggle. Plaintext keys are never echoed in GET responses or audit logs. Stored keys can be cleared with one click.
- **Connection Test**: Real-time network ping verifying endpoint latency and model availability.
- **Output Rules**: Default result type (`screen`, `component`, `template`, `prototype_flow`), default frame dimensions (`390x844`), and monochrome styling enforcement.
- **Safety Limits**: Maximum frames per request (default 5), maximum nodes per frame (default 150), external asset URL rejection, and raw script/HTML sanitization.

