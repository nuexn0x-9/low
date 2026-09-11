import React, { useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Plug,
  Power,
  Copy,
  Zap,
  Radio,
  ChevronDown,
  ChevronRight,
  Terminal,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Code2,
  FileCode,
  Settings,
} from "lucide-react";
import AgentConnectSettingsModal from "@/components/editor/AgentConnectSettingsModal";


const AGENTS = ["Cursor", "Claude", "Codex", "Antigravity", "Hermes"];

const PRESETS = [
  {
    id: "full_editor_assistant",
    label: "Full Editor Assistant (All scopes)",
    desc: "Complete access to design, prototype, components, and AI drafts.",
    scopes: ["read_document", "write_document", "create_screen", "edit_screen", "delete_screen", "manage_components", "manage_templates", "run_ai_import", "apply_ai_import", "batch_update", "dry_run", "undo_changes"],
  },
  {
    id: "design_assistant",
    label: "Design Assistant",
    desc: "Screens, elements, components, and dry-run preview.",
    scopes: ["read_document", "write_document", "create_screen", "edit_screen", "delete_screen", "manage_components", "dry_run"],
  },
  {
    id: "prototype_assistant",
    label: "Prototype Assistant",
    desc: "Interactive navigation flows and element properties.",
    scopes: ["read_document", "write_document", "edit_screen", "dry_run"],
  },
  {
    id: "ai_import_assistant",
    label: "AI Import Assistant",
    desc: "Generate and apply AI screens and components.",
    scopes: ["read_document", "write_document", "create_screen", "run_ai_import", "apply_ai_import", "dry_run"],
  },
  {
    id: "read_only",
    label: "Read Only",
    desc: "Inspect document structure and screen elements without mutation.",
    scopes: ["read_document"],
  },
];

const actionLabel = (e) => {
  const p = e.params || {};
  switch (e.action) {
    case "create_screen":
      return `Created screen "${e.result?.name || p.name || ""}"`;
    case "duplicate_screen":
      return `Duplicated screen → "${e.result?.name || ""}"`;
    case "rename_screen":
      return `Renamed screen → "${p.name || ""}"`;
    case "delete_screen":
      return "Deleted screen";
    case "add_element":
      return `Added ${(p.element && p.element.type) || "element"}`;
    case "update_element":
      return "Updated element";
    case "move_element":
      return "Moved element";
    case "resize_element":
      return `Resized element (${e.result?.width || p.width}x${e.result?.height || p.height})`;
    case "duplicate_element":
      return `Duplicated element "${e.result?.name || ""}"`;
    case "delete_element":
      return "Deleted element";
    case "link_prototype":
      return "Linked prototype";
    case "create_component":
      return `Created component "${p.name || ""}"`;
    case "save_template":
      return `Saved template "${p.name || ""}"`;
    case "create_ai_draft":
      return `Generated AI draft (${p.resultType || "screen"})`;
    case "apply_ai_draft":
      return `Applied AI draft #${p.draftId || ""}`;
    case "batch_update":
      return `Batch update (${(p.operations || []).length} ops)`;
    case "undo_last_agent_change":
      return "Undone last agent change";
    default:
      return e.action;
  }
};

const Copyable = ({ label, value, testid }) => (
  <div className="flex items-center justify-between gap-2 rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-[#a1a1aa]">{label}</p>
      <p className="truncate font-mono text-[11px] text-[#18181b]">{value}</p>
    </div>
    <button
      data-testid={testid}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="shrink-0 rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
    >
      <Copy size={13} />
    </button>
  </div>
);

export default function AgentPanel({
  session,
  baseUrl,
  connecting,
  events = [],
  onStart,
  onStop,
  onRevoke,
  onSimulate,
  onUndoLast,
  onUndoEvent,
  dryRunMode = false,
  setDryRunMode = () => {},
  selectedPreset = "full_editor_assistant",
  setSelectedPreset = () => {},
}) {
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const connected = !!session && !session.is_revoked;
  const revoked = !!session && session.is_revoked;

  // Ensure no stale emergentagent preview URL is ever used
  const rawBase = (baseUrl || "").trim();
  const effectiveBase = (!rawBase || rawBase.includes("emergentagent.com"))
    ? (typeof window !== "undefined" && window.location.hostname === "localhost" ? `http://${window.location.hostname}:8000` : "http://localhost:8000")
    : rawBase;
  const endpoint = `${effectiveBase.replace(/\/+$/, "")}/api/agent`;

  const currentPresetObj = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];


  const promptText = session
    ? `You can control my LOW mobile design over HTTP.
Base URL: ${endpoint}
Session ID: ${session.session_id}
Auth header: X-LOW-Token: ${session.token}
Preset: ${session.preset || selectedPreset}
Granted Scopes: ${(session.scopes || currentPresetObj.scopes).join(", ")}

Discover actions:  GET  ${endpoint}/schema
Read the design:   GET  ${endpoint}/sessions/${session.session_id}/document
Perform an action: POST ${endpoint}/sessions/${session.session_id}/actions
  headers: { "X-LOW-Token": "${session.token}", "Content-Type": "application/json" }
  body:    { "action": "<action>", "params": { ... }, "dryRun": false }

Example — add a primary button:
{ "action": "add_element",
  "params": { "screenId": "<id from list_screens>",
              "element": { "type": "button", "text": "Continue", "x": 24, "y": 700, "width": 342, "height": 50 } } }

Example — batch update:
{ "action": "batch_update",
  "params": { "operations": [
    { "action": "create_screen", "params": { "name": "Checkout" } },
    { "action": "add_element", "params": { "screenId": "<id>", "element": { "type": "button", "text": "Pay" } } }
  ] } }`
    : "";

  const curlExample = session
    ? `curl -X POST "${endpoint}/sessions/${session.session_id}/actions" \\
  -H "X-LOW-Token: ${session.token}" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "add_element", "params": {"screenId": "<screen_id>", "element": {"type": "button", "text": "Continue", "x": 24, "y": 600, "width": 342, "height": 50}}}'`
    : "";

  return (
    <div className="flex h-full flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#e4e4e7] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-[#18181b]" />
          <span className="text-sm font-semibold">Agent Connect</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="agent-status"
            className={`flex items-center gap-1 text-[10px] font-medium ${
              revoked
                ? "text-red-600"
                : connected
                ? "text-[#18181b]"
                : "text-[#a1a1aa]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                revoked
                  ? "bg-red-500"
                  : connected
                  ? "bg-[#2563eb]"
                  : "bg-[#d4d4d8]"
              }`}
            />
            {revoked ? "Revoked" : connected ? "Connected" : "Offline"}
          </span>
          <button
            type="button"
            data-testid="agent-settings-gear-btn"
            onClick={() => setShowSettings(true)}
            title="Configure Agent Connect"
            className="flex h-6 w-6 items-center justify-center rounded border border-[#e4e4e7] bg-white text-[#71717a] hover:border-[#18181b] hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>


      {/* Main Content Area */}
      <div className="low-scroll flex-1 overflow-auto p-3">
        {!session ? (
          <div>
            <p className="mb-3 text-[11px] leading-relaxed text-[#71717a]">
              Let an external AI agent (Cursor, Claude, Codex, Antigravity, Hermes…) read and safely edit this design via scoped API.
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {AGENTS.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-[#e4e4e7] px-2 py-0.5 text-[10px] font-medium text-[#3f3f46]"
                >
                  {a}
                </span>
              ))}
            </div>

            {/* Scope Preset Selection */}
            <div className="mb-3 rounded-md border border-[#e4e4e7] bg-[#fafafa] p-2.5">
              <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
                <SlidersHorizontal size={11} /> Permission Preset
              </label>
              <select
                data-testid="agent-preset-select"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full rounded border border-[#d4d4d8] bg-white px-2 py-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[10px] text-[#71717a]">{currentPresetObj.desc}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {currentPresetObj.scopes.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-white border border-[#e4e4e7] px-1.5 py-0.5 font-mono text-[9px] text-[#52525b]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <button
              data-testid="agent-start-btn"
              onClick={() => onStart(selectedPreset)}
              disabled={connecting}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#18181b] text-xs font-medium text-white transition-colors hover:bg-[#27272a] disabled:opacity-50"
            >
              <Plug size={14} /> {connecting ? "Starting…" : "Start Agent Session"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Credentials */}
            <div className="space-y-1.5">
              <Copyable label="Endpoint" value={endpoint} testid="agent-copy-endpoint" />
              <Copyable label="Session ID" value={session.session_id} testid="agent-copy-session" />
              <Copyable label="Token" value={session.token} testid="agent-copy-token" />
            </div>

            {/* Active Scopes Chips */}
            <div className="rounded-md border border-[#e4e4e7] bg-[#fafafa] p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
                Granted Scopes ({session.preset || selectedPreset})
              </p>
              <div data-testid="agent-scopes-list" className="flex flex-wrap gap-1">
                {(session.scopes || currentPresetObj.scopes).map((s) => (
                  <span
                    key={s}
                    className="rounded border border-[#e4e4e7] bg-white px-1.5 py-0.5 font-mono text-[9px] text-[#27272a]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Dry Run Toggle */}
            <div className="flex items-center justify-between rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5">
              <span className="text-[11px] font-medium text-[#18181b]">Dry Run Simulation</span>
              <button
                type="button"
                data-testid="agent-dryrun-toggle"
                onClick={() => setDryRunMode(!dryRunMode)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  dryRunMode ? "bg-[#18181b]" : "bg-[#e4e4e7]"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    dryRunMode ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="agent-simulate-btn"
                onClick={onSimulate}
                disabled={revoked}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5] disabled:opacity-50"
              >
                <Zap size={13} /> {dryRunMode ? "Simulate (Dry)" : "Simulate"}
              </button>
              <button
                data-testid="agent-undo-btn"
                onClick={onUndoLast}
                disabled={revoked}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5] disabled:opacity-50"
              >
                <RotateCcw size={13} /> Undo Change
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="agent-revoke-btn"
                onClick={onRevoke}
                disabled={revoked}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <ShieldAlert size={13} /> Revoke
              </button>
              <button
                data-testid="agent-stop-btn"
                onClick={onStop}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#3f3f46] transition-colors hover:bg-[#f4f4f5]"
              >
                <Power size={13} /> Close
              </button>
            </div>

            {/* Copy Quick Toolbar */}
            <div className="space-y-1.5">
              <button
                data-testid="agent-copy-prompt"
                onClick={() => {
                  navigator.clipboard?.writeText(promptText);
                  toast.success("Agent instructions copied");
                }}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#18181b] bg-[#18181b] text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
              >
                <Terminal size={13} /> Copy Instructions
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  data-testid="agent-copy-curl"
                  onClick={() => {
                    navigator.clipboard?.writeText(curlExample);
                    toast.success("cURL example copied");
                  }}
                  className="flex h-7 items-center justify-center gap-1 rounded border border-[#e4e4e7] bg-white text-[11px] font-medium text-[#3f3f46] hover:bg-[#f4f4f5]"
                >
                  <Code2 size={12} /> Copy cURL
                </button>
                <button
                  data-testid="agent-copy-schema"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${endpoint}/schema`);
                    toast.success("Schema URL copied");
                  }}
                  className="flex h-7 items-center justify-center gap-1 rounded border border-[#e4e4e7] bg-white text-[11px] font-medium text-[#3f3f46] hover:bg-[#f4f4f5]"
                >
                  <FileCode size={12} /> Schema URL
                </button>
              </div>
            </div>

            {/* How to Connect collapsible */}
            <div>
              <button
                onClick={() => setShowConnect((v) => !v)}
                className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]"
              >
                {showConnect ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Instructions Preview
              </button>
              {showConnect && (
                <pre className="low-scroll mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-[#e4e4e7] bg-[#fafafa] p-2 font-mono text-[10px] leading-relaxed text-[#3f3f46]">
{promptText}
                </pre>
              )}
            </div>

            {/* Live Activity Stream */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
                  <Radio size={12} /> Audit Activity
                </p>
                <span className="font-mono text-[10px] text-[#a1a1aa]">{events.length} events</span>
              </div>
              <div data-testid="agent-activity" className="space-y-1.5">
                {events.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[#e4e4e7] px-2 py-3 text-center text-[11px] text-[#a1a1aa]">
                    Waiting for agent actions…
                  </p>
                ) : (
                  events
                    .slice()
                    .reverse()
                    .map((e) => (
                      <div
                        key={e.id || e.seq}
                        className={`flex flex-col gap-1 rounded-md border p-2 text-[11px] ${
                          e.status === "undone"
                            ? "border-amber-200 bg-amber-50/40 opacity-70"
                            : e.status === "failed"
                            ? "border-red-200 bg-red-50/40"
                            : "border-[#e4e4e7] bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono text-[9px] text-[#a1a1aa]">#{e.seq}</span>
                            <span
                              className={`truncate font-medium ${
                                e.status === "undone" ? "line-through text-[#71717a]" : "text-[#18181b]"
                              }`}
                            >
                              {actionLabel(e)}
                            </span>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                              e.dry_run
                                ? "border border-blue-200 bg-blue-50 text-blue-700"
                                : e.status === "undone"
                                ? "border border-amber-200 bg-amber-100 text-amber-800"
                                : e.status === "failed"
                                ? "border border-red-200 bg-red-100 text-red-800"
                                : "border border-[#e4e4e7] bg-[#f4f4f5] text-[#3f3f46]"
                            }`}
                          >
                            {e.dry_run ? "simulated" : e.status || "applied"}
                          </span>
                        </div>

                        {/* Inline undo button for applied mutating events */}
                        {e.status === "applied" && !e.dry_run && onUndoEvent && (
                          <div className="flex justify-end">
                            <button
                              data-testid={`undo-event-${e.seq}`}
                              onClick={() => onUndoEvent(e.id)}
                              className="text-[10px] text-[#71717a] hover:text-[#18181b] hover:underline"
                            >
                              Undo this action
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <AgentConnectSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsUpdated={(newSettings) => {
          if (newSettings?.defaultPreset) {
            setSelectedPreset(newSettings.defaultPreset);
          }
          if (newSettings?.requireDryRunFirst !== undefined) {
            setDryRunMode(newSettings.requireDryRunFirst);
          }
        }}
      />
    </div>
  );
}

