import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Globe,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  ExternalLink,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAgentConnectSettings,
  updateAgentConnectSettings,
  testAgentEndpoints,
} from "@/data/settingsApi";

const ALL_SCOPES = [
  { id: "document:read", label: "Read Document", desc: "View screens, elements & structure" },
  { id: "screen:write", label: "Manage Screens", desc: "Create, rename, or delete screens" },
  { id: "element:write", label: "Mutate Elements", desc: "Add, move, resize, or delete UI elements" },
  { id: "component:write", label: "Components & Templates", desc: "Save components and templates" },
  { id: "ai:import", label: "AI Import Actions", desc: "Trigger or apply AI design patches" },
  { id: "batch:execute", label: "Batch Operations", desc: "Execute atomic multi-action batches" },
];

export default function AgentConnectSettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form states
  const [publicBaseUrl, setPublicBaseUrl] = useState("http://localhost:8000");
  const [schemaEndpoint, setSchemaEndpoint] = useState("/api/agent/schema");
  const [sessionsEndpoint, setSessionsEndpoint] = useState("/api/agent/sessions");
  const [actionsEndpointPattern, setActionsEndpointPattern] = useState("/api/agent/sessions/{session_id}/actions");
  const [eventsEndpointPattern, setEventsEndpointPattern] = useState("/api/agent/sessions/{session_id}/events");
  const [instructionsEndpointPattern, setInstructionsEndpointPattern] = useState("/api/agent/sessions/{session_id}/instructions");
  const [eventPollIntervalMs, setEventPollIntervalMs] = useState(1500);
  const [maxPayloadBytes, setMaxPayloadBytes] = useState(1048576);
  const [enablePublicInstructionsUrl, setEnablePublicInstructionsUrl] = useState(true);
  const [enableCurlExamples, setEnableCurlExamples] = useState(true);

  // Security & Defaults
  const [defaultPreset, setDefaultPreset] = useState("standard");
  const [defaultExpiryMinutes, setDefaultExpiryMinutes] = useState(60);
  const [requireDryRunFirst, setRequireDryRunFirst] = useState(false);
  const [allowBatchUpdate, setAllowBatchUpdate] = useState(true);
  const [maxBatchOperations, setMaxBatchOperations] = useState(25);
  const [allowUndoAgentChanges, setAllowUndoAgentChanges] = useState(true);
  const [requireApprovalForDestructiveActions, setRequireApprovalForDestructiveActions] = useState(false);
  const [logDryRunEvents, setLogDryRunEvents] = useState(true);
  const [instructionFormat, setInstructionFormat] = useState("general_http");
  const [defaultScopes, setDefaultScopes] = useState([
    "document:read",
    "screen:write",
    "element:write",
    "component:write",
  ]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAgentConnectSettings();
      setSettings(data);
      setPublicBaseUrl(data.publicBaseUrl || "http://localhost:8000");
      setSchemaEndpoint(data.schemaEndpoint || "/api/agent/schema");
      setSessionsEndpoint(data.sessionsEndpoint || "/api/agent/sessions");
      setActionsEndpointPattern(data.actionsEndpointPattern || "/api/agent/sessions/{session_id}/actions");
      setEventsEndpointPattern(data.eventsEndpointPattern || "/api/agent/sessions/{session_id}/events");
      setInstructionsEndpointPattern(data.instructionsEndpointPattern || "/api/agent/sessions/{session_id}/instructions");
      setEventPollIntervalMs(data.eventPollIntervalMs ?? 1500);
      setMaxPayloadBytes(data.maxPayloadBytes ?? 1048576);
      setEnablePublicInstructionsUrl(data.enablePublicInstructionsUrl ?? true);
      setEnableCurlExamples(data.enableCurlExamples ?? true);

      setDefaultPreset(data.defaultPreset || "standard");
      setDefaultExpiryMinutes(data.defaultExpiryMinutes ?? 60);
      setRequireDryRunFirst(data.requireDryRunFirst ?? false);
      setAllowBatchUpdate(data.allowBatchUpdate ?? true);
      setMaxBatchOperations(data.maxBatchOperations ?? 25);
      setAllowUndoAgentChanges(data.allowUndoAgentChanges ?? true);
      setRequireApprovalForDestructiveActions(data.requireApprovalForDestructiveActions ?? false);
      setLogDryRunEvents(data.logDryRunEvents ?? true);
      setInstructionFormat(data.instructionFormat || "general_http");
      setDefaultScopes(data.defaultScopes || [
        "document:read",
        "screen:write",
        "element:write",
        "component:write",
      ]);
    } catch (err) {
      toast.error("Failed to load Agent Connect settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleScope = (scopeId) => {
    setDefaultScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        publicBaseUrl: publicBaseUrl.trim(),
        schemaEndpoint: schemaEndpoint.trim(),
        sessionsEndpoint: sessionsEndpoint.trim(),
        actionsEndpointPattern: actionsEndpointPattern.trim(),
        eventsEndpointPattern: eventsEndpointPattern.trim(),
        instructionsEndpointPattern: instructionsEndpointPattern.trim(),
        eventPollIntervalMs: Number(eventPollIntervalMs),
        maxPayloadBytes: Number(maxPayloadBytes),
        enablePublicInstructionsUrl,
        enableCurlExamples,
        defaultPreset,
        defaultExpiryMinutes: Number(defaultExpiryMinutes),
        requireDryRunFirst,
        allowBatchUpdate,
        maxBatchOperations: Number(maxBatchOperations),
        allowUndoAgentChanges,
        requireApprovalForDestructiveActions,
        logDryRunEvents,
        instructionFormat,
        defaultScopes,
      };
      const updated = await updateAgentConnectSettings(payload);
      setSettings(updated);
      toast.success("Agent Connect settings saved");
      if (onSettingsUpdated) onSettingsUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEndpoints = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {
        publicBaseUrl: publicBaseUrl.trim(),
        schemaEndpoint: schemaEndpoint.trim(),
      };
      const res = await testAgentEndpoints(payload);
      setTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.error || res.message);
      }
    } catch (err) {
      const errRes = { ok: false, error: err.message, message: "Endpoint check failed" };
      setTestResult(errRes);
      toast.error(err.message || "Endpoint check failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      data-testid="agent-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-[#e4e4e7] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4f4f5] text-[#18181b]">
              <Settings size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#18181b]">Agent Connect Settings</h2>
              <p className="text-[11px] text-[#71717a]">Configure endpoints, presets, and safety constraints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-agent-settings-btn"
            className="rounded-md p-1 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="low-scroll flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-xs text-[#71717a]">
              <Loader2 className="mb-2 animate-spin text-[#18181b]" size={20} />
              Loading configuration...
            </div>
          ) : (
            <>
              {/* Section 1: Endpoints & Discovery */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                  <Globe size={14} /> Endpoints & Discovery
                </span>

                <div>
                  <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                    Public Server Base URL
                  </label>
                  <input
                    type="text"
                    data-testid="agent-public-url-input"
                    value={publicBaseUrl}
                    onChange={(e) => setPublicBaseUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 font-mono text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[#a1a1aa]">
                    Used in copyable prompts, cURL commands, and MCP connection configs.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Event Poll Interval (ms)
                    </label>
                    <input
                      type="number"
                      value={eventPollIntervalMs}
                      onChange={(e) => setEventPollIntervalMs(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Max Payload (Bytes)
                    </label>
                    <input
                      type="number"
                      value={maxPayloadBytes}
                      onChange={(e) => setMaxPayloadBytes(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b]"
                    />
                  </div>
                </div>

                {/* Test Endpoints Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestEndpoints}
                    disabled={testing}
                    data-testid="test-agent-endpoints-btn"
                    className="flex items-center gap-1.5 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] px-2.5 py-1.5 text-xs font-medium text-[#18181b] hover:bg-[#e4e4e7] disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                    Verify Endpoints
                  </button>

                  {testResult && (
                    <div
                      data-testid="agent-test-result"
                      className={`flex items-center gap-1.5 text-xs ${
                        testResult.ok ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span className="font-mono text-[11px]">
                        {testResult.ok ? "Reachable" : testResult.error || "Failed"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-[#e4e4e7]" />

              {/* Section 2: Session Defaults & Presets */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                  <Sliders size={14} /> Session Defaults
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Default Preset
                    </label>
                    <select
                      value={defaultPreset}
                      onChange={(e) => setDefaultPreset(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                    >
                      <option value="standard">Standard (Design & Elements)</option>
                      <option value="read_only">Read Only</option>
                      <option value="full_access">Full Access</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Default Expiry (Minutes)
                    </label>
                    <input
                      type="number"
                      value={defaultExpiryMinutes}
                      onChange={(e) => setDefaultExpiryMinutes(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                    Instruction Generator Format
                  </label>
                  <select
                    value={instructionFormat}
                    onChange={(e) => setInstructionFormat(e.target.value)}
                    className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                  >
                    <option value="general_http">General HTTP / REST Prompt</option>
                    <option value="cursor">Cursor Agent Instructions</option>
                    <option value="claude">Claude Artifacts / Prompt</option>
                    <option value="codex">Codex Scripting Rules</option>
                    <option value="antigravity">Google Antigravity Agent Spec</option>
                    <option value="hermes">Hermes AI Instructions</option>
                    <option value="mcp_notes">MCP Bridge Integration Notes</option>
                  </select>
                </div>
              </div>

              <hr className="border-[#e4e4e7]" />

              {/* Section 3: Safety Guardrails & Scopes */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                  <Shield size={14} /> Security Guardrails
                </span>

                <div className="space-y-2 pt-1 text-xs text-[#18181b]">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={requireDryRunFirst}
                      onChange={(e) => setRequireDryRunFirst(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Require Dry Run before applying mutations</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowBatchUpdate}
                      onChange={(e) => setAllowBatchUpdate(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Allow atomic batch updates</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowUndoAgentChanges}
                      onChange={(e) => setAllowUndoAgentChanges(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Enable undo for agent mutations</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={logDryRunEvents}
                      onChange={(e) => setLogDryRunEvents(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Log dry run attempts to audit event stream</span>
                  </label>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-medium text-[#18181b] mb-1.5">
                    Default Permitted Scopes
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_SCOPES.map((sc) => (
                      <label
                        key={sc.id}
                        className={`flex items-start gap-2 rounded border p-2 cursor-pointer transition-colors ${
                          defaultScopes.includes(sc.id)
                            ? "border-[#18181b] bg-[#f4f4f5]"
                            : "border-[#e4e4e7] bg-white hover:border-[#d4d4d8]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={defaultScopes.includes(sc.id)}
                          onChange={() => toggleScope(sc.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-[#18181b]">{sc.label}</p>
                          <p className="text-[9px] text-[#71717a]">{sc.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#e4e4e7] bg-[#fafafa] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-medium text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            data-testid="save-agent-settings-btn"
            className="flex items-center gap-1.5 rounded-md bg-[#18181b] px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
