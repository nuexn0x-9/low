import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Layers,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  History,
  Check,
  Code,
  Clock,
  Zap,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateAiImport,
  validateAiImport,
  getAiProviders,
  getAiDraftHistory,
  getAiDraftById,
  regenerateAiDraft,
  applyAiDraft,
} from "@/data/aiApi";
import { saveComponentApi, saveTemplateApi } from "@/data/storage/apiStorage";
import AiImportSettingsModal from "@/components/editor/AiImportSettingsModal";


export default function AiImportPanel({ projectId, onApplyPatch }) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("screen");
  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState(null);
  const [activeView, setActiveView] = useState("summary"); // 'summary' | 'json' | 'history'
  const [showSettings, setShowSettings] = useState(false);

  // Provider info & status
  const [activeProvider, setActiveProvider] = useState("mock");
  const [providers, setProviders] = useState([]);

  // History
  const [historyDrafts, setHistoryDrafts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Editable JSON state
  const [jsonText, setJsonText] = useState("");
  const [validatingJson, setValidatingJson] = useState(false);

  const examples = [
    { label: "Fintech Login", type: "screen", text: "Buatkan halaman login aplikasi fintech." },
    { label: "3-Screen Onboarding", type: "screen", text: "Buatkan onboarding 3 screen untuk aplikasi marketplace jasa." },
    { label: "Bottom Navigation", type: "component", text: "Buatkan bottom navigation aplikasi makanan dengan 5 menu." },
    { label: "Product Filter Sheet", type: "component", text: "Buatkan bottom sheet filter produk." },
    { label: "Login to Home Flow", type: "prototype_flow", text: "Buatkan flow login ke home dengan transisi slide." },
  ];

  // Fetch providers on mount
  useEffect(() => {
    getAiProviders()
      .then((data) => {
        if (data && data.active_provider) {
          setActiveProvider(data.active_provider);
          setProviders(data.providers || []);
        }
      })
      .catch(() => {
        setActiveProvider("mock");
      });
  }, []);

  // Fetch draft history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await getAiDraftHistory(projectId, 10);
      setHistoryDrafts(list || []);
    } catch {
      // offline or silent fail
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Synchronize JSON string with current draftResult
  useEffect(() => {
    if (draftResult?.documentPatch) {
      setJsonText(JSON.stringify(draftResult.documentPatch, null, 2));
    } else {
      setJsonText("");
    }
  }, [draftResult]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    setLoading(true);
    setDraftResult(null);
    try {
      const data = await generateAiImport(type, prompt.trim(), projectId);
      setDraftResult(data);
      if (!data.validation?.valid) {
        const msg = data.validation?.errors?.[0] || "Invalid output from AI";
        toast.error(msg);
      } else {
        toast.success("AI Draft generated!");
      }
      loadHistory();
    } catch (err) {
      toast.error(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (draftResult?.draftId) {
      setLoading(true);
      try {
        const data = await regenerateAiDraft(draftResult.draftId);
        setDraftResult(data);
        if (!data.validation?.valid) {
          toast.error(data.validation?.errors?.[0] || "Regenerated draft is invalid");
        } else {
          toast.success("Regenerated draft successfully!");
        }
        loadHistory();
      } catch (err) {
        toast.error(err.message || "Regenerate failed");
      } finally {
        setLoading(false);
      }
    } else {
      handleGenerate();
    }
  };

  const handleValidateJson = async () => {
    setValidatingJson(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        const validation = {
          valid: false,
          errors: [`JSON Syntax Error: ${parseErr.message}`],
          warnings: [],
        };
        setDraftResult((prev) => ({
          ...prev,
          validation,
        }));
        toast.error("Invalid JSON syntax");
        return;
      }

      const valRes = await validateAiImport(draftResult?.resultType || type, parsed);
      setDraftResult((prev) => ({
        ...prev,
        documentPatch: parsed,
        validation: {
          valid: valRes.valid,
          errors: valRes.errors || [],
          warnings: valRes.warnings || [],
        },
      }));

      if (valRes.valid) {
        toast.success("Document patch is valid!");
      } else {
        toast.error(valRes.errors?.[0] || "Validation failed");
      }
    } catch (err) {
      toast.error(err.message || "Validation failed");
    } finally {
      setValidatingJson(false);
    }
  };

  const handleApplyToCanvas = () => {
    if (!draftResult || !draftResult.documentPatch) return;
    if (onApplyPatch) {
      onApplyPatch(draftResult.documentPatch, draftResult.resultType || type);
    }
  };

  const handleSaveComponent = async () => {
    if (!draftResult || !draftResult.documentPatch) return;
    try {
      const frame = draftResult.documentPatch.frames?.[0];
      const nodes = frame?.nodes || [];
      const content = nodes.length === 1 ? nodes[0] : { type: "frame", nodes };
      await saveComponentApi((draftResult.resultType || "component") + " COMP", "Generated", content, projectId);
      toast.success("Saved to Component Library!");
    } catch {
      toast.error("Failed to save component");
    }
  };

  const handleSaveTemplate = async () => {
    if (!draftResult || !draftResult.documentPatch) return;
    try {
      const frames = draftResult.documentPatch.frames || [];
      await saveTemplateApi("AI Template", "Generated", frames);
      toast.success("Saved to Template Library!");
    } catch {
      toast.error("Failed to save template");
    }
  };

  const selectHistoryDraft = async (draft) => {
    try {
      setLoading(true);
      const detail = await getAiDraftById(draft.id);
      let parsedPatch = detail.draft_json || detail.documentPatch || (detail.frames ? { frames: detail.frames } : {});
      let parsedVal = detail.validation_json || detail.validation || { valid: true, errors: [], warnings: [] };
      if (typeof parsedPatch === "string") {
        try { parsedPatch = JSON.parse(parsedPatch); } catch {}
      }
      if (typeof parsedVal === "string") {
        try { parsedVal = JSON.parse(parsedVal); } catch {}
      }

      setDraftResult({
        draftId: detail.id,
        status: detail.status,
        resultType: detail.result_type,
        documentPatch: parsedPatch,
        validation: parsedVal,
        provider: detail.provider,
        model: detail.model,
        durationMs: detail.duration_ms,
        tokenUsage: detail.token_usage,
      });
      setType(detail.result_type || "screen");
      setPrompt(detail.prompt || "");
      setActiveView("summary");
      toast.message(`Loaded draft from ${detail.provider}`);
    } catch (err) {
      toast.error(err.message || "Failed to load draft details");
    } finally {
      setLoading(false);
    }
  };

  const frames = draftResult?.documentPatch?.frames || [];
  const totalNodes = frames.reduce((acc, f) => acc + (f.nodes?.length || 0), 0);
  const isValid = draftResult?.validation?.valid;

  return (
    <div data-testid="ai-import-panel" className="space-y-3 p-3">
      {/* Header & Provider badge */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles size={16} className="text-[#18181b]" />
            AI Import Engine
          </h3>
          <p className="text-[11px] text-[#a1a1aa]">
            Generate mobile screens & components via prompt.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            data-testid="ai-provider-badge"
            className="flex items-center gap-1 rounded border border-[#e4e4e7] bg-[#fafafa] px-1.5 py-0.5 text-[10px] font-medium text-[#52525b]"
            title={`Active Provider: ${activeProvider}`}
          >
            <Zap size={10} className="text-[#18181b]" />
            <span>{activeProvider.toUpperCase()}</span>
          </div>
          <button
            type="button"
            data-testid="ai-settings-gear-btn"
            onClick={() => setShowSettings(true)}
            title="Configure AI Import Engine"
            className="flex h-6 w-6 items-center justify-center rounded border border-[#e4e4e7] bg-white text-[#71717a] hover:border-[#18181b] hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>


      {/* Form Controls */}
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Output Type
          </label>
          <select
            data-testid="ai-output-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 w-full rounded-md border border-[#d4d4d8] bg-white px-2 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
          >
            <option value="screen">Screen</option>
            <option value="component">Component</option>
            <option value="template">Template</option>
            <option value="prototype_flow">Prototype Flow</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Describe what you want
          </label>
          <textarea
            data-testid="ai-prompt-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Buatkan halaman login aplikasi fintech..."
            className="w-full resize-none rounded-md border border-[#d4d4d8] bg-white p-2 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
          />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-medium text-[#a1a1aa]">Example Prompts:</p>
          <div className="flex flex-wrap gap-1">
            {examples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setType(ex.type);
                  setPrompt(ex.text);
                }}
                className="rounded border border-[#e4e4e7] bg-[#f4f4f5] px-1.5 py-0.5 text-[10px] text-[#3f3f46] hover:bg-[#e4e4e7]"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <button
            data-testid="ai-generate-btn"
            onClick={handleGenerate}
            disabled={loading}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[#18181b] bg-[#18181b] text-xs font-medium text-white transition-colors hover:bg-[#27272a] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={13} /> Generate JSON
              </>
            )}
          </button>
          {draftResult && (
            <button
              data-testid="ai-regenerate-btn"
              onClick={handleRegenerate}
              disabled={loading}
              title="Regenerate from prompt"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5] disabled:opacity-50"
            >
              <RotateCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Preview / JSON Edit / History */}
      <div className="flex items-center justify-between border-b border-[#e4e4e7] pt-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView("summary")}
            className={`flex items-center gap-1 border-b-2 px-2 py-1 text-[11px] font-medium transition-colors ${
              activeView === "summary"
                ? "border-[#18181b] text-[#18181b]"
                : "border-transparent text-[#a1a1aa] hover:text-[#52525b]"
            }`}
          >
            <Layers size={11} /> Summary
          </button>
          <button
            onClick={() => setActiveView("json")}
            className={`flex items-center gap-1 border-b-2 px-2 py-1 text-[11px] font-medium transition-colors ${
              activeView === "json"
                ? "border-[#18181b] text-[#18181b]"
                : "border-transparent text-[#a1a1aa] hover:text-[#52525b]"
            }`}
          >
            <Code size={11} /> Edit JSON
          </button>
          <button
            data-testid="ai-history-tab-btn"
            onClick={() => {
              setActiveView("history");
              loadHistory();
            }}
            className={`flex items-center gap-1 border-b-2 px-2 py-1 text-[11px] font-medium transition-colors ${
              activeView === "history"
                ? "border-[#18181b] text-[#18181b]"
                : "border-transparent text-[#a1a1aa] hover:text-[#52525b]"
            }`}
          >
            <History size={11} /> History ({historyDrafts.length})
          </button>
        </div>
      </div>

      {/* VIEW: Summary Preview */}
      {activeView === "summary" && (
        <>
          {draftResult ? (
            <div data-testid="ai-preview-area" className="space-y-2 rounded-md border border-[#e4e4e7] bg-white p-2.5">
              <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-1.5">
                <div className="flex items-center gap-1.5">
                  {isValid ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={13} className="text-red-500" />
                  )}
                  <span className="text-[11px] font-semibold text-[#18181b]">
                    {isValid ? "Valid Draft" : "Validation Issues"}
                  </span>
                </div>
                {draftResult.durationMs !== undefined && (
                  <span className="flex items-center gap-1 text-[10px] text-[#a1a1aa]">
                    <Clock size={10} /> {draftResult.durationMs}ms
                  </span>
                )}
              </div>

              {/* Metadata Info */}
              <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                <span>Screens: {frames.length}</span>
                <span>Layers: {totalNodes}</span>
                {draftResult.model && <span>{draftResult.model}</span>}
              </div>

              {/* Frames List */}
              <div className="max-h-28 overflow-auto rounded border border-[#e4e4e7] bg-[#fafafa] p-1.5">
                {frames.length > 0 ? (
                  frames.map((f, i) => (
                    <div key={f.id || i} className="mb-1 last:mb-0">
                      <p className="text-[11px] font-medium text-[#18181b]">{f.name}</p>
                      <p className="text-[10px] text-[#a1a1aa]">{f.nodes?.length || 0} layers</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-[#a1a1aa]">No frames generated</p>
                )}
              </div>

              {/* Warnings */}
              {draftResult.validation?.warnings?.length > 0 && (
                <div className="rounded bg-amber-50 p-1.5 text-[10px] text-amber-800">
                  <p className="font-semibold">Warnings:</p>
                  {draftResult.validation.warnings.map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}

              {/* Errors */}
              {draftResult.validation?.errors?.length > 0 && (
                <div className="rounded bg-red-50 p-1.5 text-[10px] text-red-700">
                  <p className="font-semibold">Errors:</p>
                  {draftResult.validation.errors.map((e, idx) => (
                    <p key={idx}>• {e}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-[#e4e4e7] text-[11px] text-[#a1a1aa]">
              No draft generated yet.
            </div>
          )}
        </>
      )}

      {/* VIEW: JSON Editor & Validate Again */}
      {activeView === "json" && (
        <div className="space-y-2 rounded-md border border-[#e4e4e7] bg-white p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#18181b]">Edit Patch JSON</span>
            <button
              data-testid="ai-validate-again-btn"
              onClick={handleValidateJson}
              disabled={validatingJson}
              className="flex h-6 items-center gap-1 rounded border border-[#d4d4d8] bg-white px-2 text-[10px] font-medium text-[#18181b] hover:bg-[#f4f4f5] disabled:opacity-50"
            >
              {validatingJson ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Check size={10} />
              )}
              Validate Again
            </button>
          </div>
          <textarea
            data-testid="ai-json-editor"
            rows={8}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full font-mono text-[10px] leading-relaxed rounded border border-[#e4e4e7] bg-[#fafafa] p-1.5 text-[#3f3f46] outline-none focus:border-[#18181b]"
          />
        </div>
      )}

      {/* VIEW: Draft History */}
      {activeView === "history" && (
        <div data-testid="ai-history-list" className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#18181b]">Recent AI Drafts</span>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-[10px] text-[#71717a] hover:text-[#18181b]"
            >
              {loadingHistory ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-auto">
            {historyDrafts.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-[#a1a1aa]">No draft history found.</p>
            ) : (
              historyDrafts.map((d) => (
                <div
                  key={d.id}
                  data-testid={`history-draft-${d.id}`}
                  onClick={() => selectHistoryDraft(d)}
                  className="cursor-pointer rounded border border-[#e4e4e7] bg-white p-2 transition-colors hover:border-[#18181b]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#18181b] truncate max-w-[150px]">
                      {d.prompt || "Untitled"}
                    </span>
                    <span
                      className={`rounded px-1 py-0.2 text-[9px] font-semibold uppercase ${
                        d.status === "applied"
                          ? "bg-emerald-50 text-emerald-700"
                          : d.status === "invalid"
                          ? "bg-red-50 text-red-700"
                          : "bg-[#f4f4f5] text-[#71717a]"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#a1a1aa]">
                    <span>{d.result_type} • {d.provider}</span>
                    <span>{d.duration_ms}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Actions: Add to Canvas / Save Component / Save Template */}
      {draftResult && (
        <div className="space-y-1.5 border-t border-[#e4e4e7] pt-2">
          <button
            data-testid="ai-apply-btn"
            onClick={handleApplyToCanvas}
            disabled={!isValid}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#18181b] text-xs font-medium text-white hover:bg-[#27272a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Layers size={13} /> Add to Canvas
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              data-testid="ai-save-comp-btn"
              onClick={handleSaveComponent}
              disabled={!isValid}
              className="flex h-7 items-center justify-center gap-1 rounded-md border border-[#d4d4d8] bg-white text-[11px] font-medium hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Component
            </button>
            <button
              data-testid="ai-save-tpl-btn"
              onClick={handleSaveTemplate}
              disabled={!isValid}
              className="flex h-7 items-center justify-center gap-1 rounded-md border border-[#d4d4d8] bg-white text-[11px] font-medium hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AiImportSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsUpdated={(newSettings) => {
          if (newSettings?.provider) {
            setActiveProvider(newSettings.provider);
          }
          getAiProviders().then((data) => {
            if (data?.active_provider) setActiveProvider(data.active_provider);
          }).catch(() => {});
        }}
      />
    </div>
  );
}

