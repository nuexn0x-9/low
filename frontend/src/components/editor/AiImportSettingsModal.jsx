import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  Trash2,
  Shield,
  Sliders,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAiImportSettings,
  updateAiImportSettings,
  testAiConnection,
  clearAiApiKey,
} from "@/data/settingsApi";

export default function AiImportSettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form states
  const [provider, setProvider] = useState("mock");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [endpointPath, setEndpointPath] = useState("/v1/chat/completions");
  const [model, setModel] = useState("gpt-4o-mini");
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [maxRetries, setMaxRetries] = useState(2);
  const [maxOutputTokens, setMaxOutputTokens] = useState(4096);

  // Rules & limits
  const [defaultResultType, setDefaultResultType] = useState("screen");
  const [framePreset, setFramePreset] = useState("390x844");
  const [monochromeOutput, setMonochromeOutput] = useState(true);
  const [strictValidation, setStrictValidation] = useState(true);
  const [autoPreview, setAutoPreview] = useState(true);
  const [saveDraftHistory, setSaveDraftHistory] = useState(true);
  const [maxFrames, setMaxFrames] = useState(5);
  const [maxNodesPerFrame, setMaxNodesPerFrame] = useState(150);
  const [rejectExternalAssetUrls, setRejectExternalAssetUrls] = useState(false);
  const [rejectRawHtmlScript, setRejectRawHtmlScript] = useState(true);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAiImportSettings();
      setSettings(data);
      setProvider(data.provider || "mock");
      setBaseUrl(data.baseUrl || "");
      setEndpointPath(data.endpointPath || "/v1/chat/completions");
      setModel(data.model || "gpt-4o-mini");
      setTimeoutSeconds(data.timeoutSeconds ?? 30);
      setMaxRetries(data.maxRetries ?? 2);
      setMaxOutputTokens(data.maxOutputTokens ?? 4096);
      setDefaultResultType(data.defaultResultType || "screen");
      setFramePreset(data.framePreset || "390x844");
      setMonochromeOutput(data.monochromeOutput ?? true);
      setStrictValidation(data.strictValidation ?? true);
      setAutoPreview(data.autoPreview ?? true);
      setSaveDraftHistory(data.saveDraftHistory ?? true);
      setMaxFrames(data.maxFrames ?? 5);
      setMaxNodesPerFrame(data.maxNodesPerFrame ?? 150);
      setRejectExternalAssetUrls(data.rejectExternalAssetUrls ?? false);
      setRejectRawHtmlScript(data.rejectRawHtmlScript ?? true);
      setApiKeyInput("");
    } catch (err) {
      toast.error("Failed to load AI settings");
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

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        provider,
        baseUrl: baseUrl.trim(),
        endpointPath: endpointPath.trim(),
        model: model.trim(),
        timeoutSeconds: Number(timeoutSeconds),
        maxRetries: Number(maxRetries),
        maxOutputTokens: Number(maxOutputTokens),
        defaultResultType,
        framePreset,
        monochromeOutput,
        strictValidation,
        autoPreview,
        saveDraftHistory,
        maxFrames: Number(maxFrames),
        maxNodesPerFrame: Number(maxNodesPerFrame),
        rejectExternalAssetUrls,
        rejectRawHtmlScript,
      };
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }
      const updated = await updateAiImportSettings(payload);
      setSettings(updated);
      setApiKeyInput("");
      toast.success("AI Import settings saved");
      if (onSettingsUpdated) onSettingsUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {
        provider,
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        endpointPath: endpointPath.trim(),
      };
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }
      const res = await testAiConnection(payload);
      setTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.error || res.message);
      }
    } catch (err) {
      const errRes = { ok: false, error: err.message, message: "Connection failed" };
      setTestResult(errRes);
      toast.error(err.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!window.confirm("Are you sure you want to clear the stored API key?")) return;
    try {
      await clearAiApiKey();
      setSettings((prev) => (prev ? { ...prev, configured: false } : prev));
      setApiKeyInput("");
      toast.success("API key cleared");
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error("Failed to clear API key");
    }
  };

  return (
    <div
      data-testid="ai-settings-modal"
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
              <h2 className="text-sm font-semibold text-[#18181b]">AI Import Settings</h2>
              <p className="text-[11px] text-[#71717a]">Configure provider, models, and generation rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-ai-settings-btn"
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
              {/* Section 1: Provider Setup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                    <Cpu size={14} /> Provider
                  </span>
                  <div
                    data-testid="ai-status-indicator"
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        settings?.configured ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="font-medium text-[#52525b]">
                      {settings?.configured ? "Configured" : "Not Configured"}
                    </span>
                    {settings?.providerMode && (
                      <span className="rounded bg-[#f4f4f5] px-1.5 py-0.5 text-[10px] text-[#71717a]">
                        {settings.providerMode === "env_managed" ? "env" : "db"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "mock", label: "Mock Provider", desc: "Fast, offline UI generation" },
                    { id: "openai", label: "OpenAI", desc: "Official API (GPT-4o mini, etc.)" },
                    { id: "openai_compatible", label: "OpenAI Compatible", desc: "Ollama, vLLM, DeepSeek" },
                    { id: "custom", label: "Custom Endpoint", desc: "Custom REST proxy" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`provider-option-${p.id}`}
                      onClick={() => setProvider(p.id)}
                      className={`flex flex-col items-start rounded-lg border p-2 text-left transition-colors ${
                        provider === p.id
                          ? "border-[#18181b] bg-[#f4f4f5]"
                          : "border-[#e4e4e7] bg-white hover:border-[#d4d4d8]"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#18181b]">{p.label}</span>
                      <span className="text-[10px] text-[#71717a]">{p.desc}</span>
                    </button>
                  ))}
                </div>

                {provider !== "mock" && (
                  <div className="rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-[#18181b]">API Key</label>
                        {settings?.configured && (
                          <button
                            type="button"
                            onClick={handleClearApiKey}
                            data-testid="clear-api-key-btn"
                            className="flex items-center gap-1 text-[10px] text-red-600 hover:underline"
                          >
                            <Trash2 size={11} /> Clear stored key
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showApiKey ? "text" : "password"}
                          data-testid="ai-api-key-input"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder={
                            settings?.configured
                              ? "•••••••••••••••• (Key configured in server)"
                              : "Enter sk-..."
                          }
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 pr-8 font-mono text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 text-[#71717a] hover:text-[#18181b]"
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {(provider === "openai_compatible" || provider === "custom") && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                            Base URL
                          </label>
                          <input
                            type="text"
                            data-testid="ai-base-url-input"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com"
                            className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 font-mono text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                            Endpoint Path
                          </label>
                          <input
                            type="text"
                            value={endpointPath}
                            onChange={(e) => setEndpointPath(e.target.value)}
                            placeholder="/v1/chat/completions"
                            className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 font-mono text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          data-testid="ai-model-input"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="gpt-4o-mini"
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 font-mono text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                          Timeout (s)
                        </label>
                        <input
                          type="number"
                          value={timeoutSeconds}
                          onChange={(e) => setTimeoutSeconds(e.target.value)}
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                          Max Retries
                        </label>
                        <input
                          type="number"
                          value={maxRetries}
                          onChange={(e) => setMaxRetries(e.target.value)}
                          className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Connection Button & Result */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    data-testid="test-ai-connection-btn"
                    className="flex items-center gap-1.5 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] px-2.5 py-1.5 text-xs font-medium text-[#18181b] hover:bg-[#e4e4e7] disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                    Test Connection
                  </button>

                  {testResult && (
                    <div
                      data-testid="ai-test-result"
                      className={`flex items-center gap-1.5 text-xs ${
                        testResult.ok ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span className="font-mono text-[11px]">
                        {testResult.ok ? `${testResult.latencyMs}ms OK` : testResult.error || "Failed"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-[#e4e4e7]" />

              {/* Section 2: Output Rules */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                  <Sliders size={14} /> Output Rules
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Default Result Type
                    </label>
                    <select
                      value={defaultResultType}
                      onChange={(e) => setDefaultResultType(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                    >
                      <option value="screen">Screen</option>
                      <option value="component">Component</option>
                      <option value="template">Template</option>
                      <option value="prototype_flow">Prototype Flow</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Default Frame Preset
                    </label>
                    <select
                      value={framePreset}
                      onChange={(e) => setFramePreset(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b] focus:border-[#18181b] focus:outline-none"
                    >
                      <option value="390x844">iPhone 14 / 15 (390 × 844)</option>
                      <option value="414x896">iPhone 11 / XR (414 × 896)</option>
                      <option value="360x800">Android Standard (360 × 800)</option>
                      <option value="393x852">iPhone 16 Pro (393 × 852)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[#18181b]">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={monochromeOutput}
                      onChange={(e) => setMonochromeOutput(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Enforce Monochrome</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={strictValidation}
                      onChange={(e) => setStrictValidation(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Strict Validation</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoPreview}
                      onChange={(e) => setAutoPreview(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Auto-preview Drafts</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={saveDraftHistory}
                      onChange={(e) => setSaveDraftHistory(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Save Draft History</span>
                  </label>
                </div>
              </div>

              <hr className="border-[#e4e4e7]" />

              {/* Section 3: Safety Limits */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
                  <Shield size={14} /> Safety Limits
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Max Frames / Request
                    </label>
                    <input
                      type="number"
                      value={maxFrames}
                      onChange={(e) => setMaxFrames(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#18181b] mb-1">
                      Max Nodes / Frame
                    </label>
                    <input
                      type="number"
                      value={maxNodesPerFrame}
                      onChange={(e) => setMaxNodesPerFrame(e.target.value)}
                      className="w-full rounded-md border border-[#e4e4e7] bg-white px-2 py-1.5 text-xs text-[#18181b]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs text-[#18181b]">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rejectExternalAssetUrls}
                      onChange={(e) => setRejectExternalAssetUrls(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Reject external asset URLs</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rejectRawHtmlScript}
                      onChange={(e) => setRejectRawHtmlScript(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8] text-[#18181b]"
                    />
                    <span>Reject raw HTML & JavaScript payloads</span>
                  </label>
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
            data-testid="save-ai-settings-btn"
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
