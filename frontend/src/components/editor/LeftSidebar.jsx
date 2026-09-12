import React, { useState } from "react";
import {
  Layers,
  FileStack,
  Component as ComponentIcon,
  LayoutTemplate,
  Upload,
  Download,
  Type,
  Square,
  Frame,
  MousePointer2,
  ChevronRight,
  FileJson,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Bot,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Folder,
  Sliders,
  Palette,
} from "lucide-react";
import { dummyTemplates, importOptions } from "@/data/dummyTemplates";
import { dummyComponents } from "@/data/dummyComponents";
import AgentPanel from "@/components/editor/AgentPanel";
import AiImportPanel from "@/components/editor/AiImportPanel";
import { DEFAULT_DESIGN_TOKENS } from "@/data/storage";

const tabs = [
  { id: "pages", label: "Pages", icon: FileStack },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "components", label: "Components", icon: ComponentIcon },
  { id: "tokens", label: "Tokens", icon: Sliders },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "import", label: "Import", icon: Upload },
  { id: "ai", label: "AI Import", icon: Sparkles },
  { id: "agent", label: "Agent", icon: Bot },
];

const layerIcon = (type) => {
  switch (type) {
    case "text":
    case "link":
      return Type;
    case "input":
    case "rectangle":
    case "image":
      return Square;
    case "button":
      return MousePointer2;
    case "group":
      return Folder;
    case "frame":
      return Frame;
    case "componentInstance":
      return ComponentIcon;
    default:
      return ComponentIcon;
  }
};

const SectionHead = ({ children }) => (
  <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
    {children}
  </div>
);

const setDrag = (e, payload) => {
  const json = JSON.stringify(payload);
  e.dataTransfer.setData("application/low", json);
  e.dataTransfer.setData("text/plain", json);
  e.dataTransfer.effectAllowed = "copy";
};

function ImportTab({ onExport, onImportClick, onImportFile, onOpenAiImport }) {
  const [dragOver, setDragOver] = useState(false);
  const icons = { imp_json: FileJson, imp_svg: ImageIcon, imp_ai: Sparkles };
  return (
    <div className="p-3">
      <h3 className="mb-0.5 text-sm font-semibold">Import to LOW</h3>
      <p className="mb-3 text-[11px] text-[#a1a1aa]">
        Bring elements, components & templates into LOW.
      </p>

      <div
        data-testid="import-dropzone"
        onClick={onImportClick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onImportFile(file);
        }}
        className={`mb-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed py-7 text-center transition-colors ${
          dragOver ? "border-[#18181b] bg-[#f4f4f5]" : "border-[#d4d4d8] bg-white hover:border-[#a1a1aa]"
        }`}
      >
        <Upload size={22} className="mb-2 text-[#71717a]" />
        <span className="text-xs font-medium text-[#18181b]">Click or drag .low.json here</span>
        <span className="mt-1 text-[11px] text-[#a1a1aa]">Supports official LOW JSON format</span>
      </div>

      <button
        data-testid="export-json-btn"
        onClick={onExport}
        className="mb-4 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
      >
        <Download size={13} />
        <span>Export project as .low.json</span>
      </button>

      <SectionHead>Import Options</SectionHead>
      <div className="space-y-1.5">
        {importOptions.map((opt) => {
          const Icon = icons[opt.id] || Upload;
          return (
            <div
              key={opt.id}
              data-testid={`import-opt-${opt.id}`}
              onClick={() => {
                if (opt.id === "imp_ai") {
                  onOpenAiImport && onOpenAiImport();
                } else {
                  onImportClick && onImportClick();
                }
              }}
              className="flex cursor-pointer items-center justify-between rounded-md border border-[#e4e4e7] bg-white p-2 text-xs transition-colors hover:border-[#a1a1aa]"
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-[#71717a]" />
                <div>
                  <p className="font-medium text-[#18181b]">{opt.name}</p>
                  <p className="text-[10px] text-[#a1a1aa]">{opt.hint}</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-[#a1a1aa]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeftSidebar({
  tab,
  setTab,
  frames,
  activeFrameId,
  selectFrame,
  addScreen,
  deleteFrame,
  onRenameFrame,
  nodes,
  selectedId,
  selectedIds = [],
  setSelectedId,
  setSelectedIds,
  onToggleLock,
  onToggleHide,
  onExport,
  onImportClick,
  onImportFile,
  projectId,
  onApplyAiPatch,
  agent,
  components = [],
  onCreateComponentFromSelection,
  onInsertComponentInstance,
  designTokens = DEFAULT_DESIGN_TOKENS,
  onUpdateDesignTokens,
  onApplyTokenToSelected,
}) {
  const [editingFrameId, setEditingFrameId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [newComponentName, setNewComponentName] = useState("");

  const effectiveSelectedIds =
    selectedIds && selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];

  const handleLayerClick = (e, nodeId) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (setSelectedIds) {
        if (effectiveSelectedIds.includes(nodeId)) {
          setSelectedIds(effectiveSelectedIds.filter((id) => id !== nodeId));
        } else {
          setSelectedIds([...effectiveSelectedIds, nodeId]);
        }
      }
    } else {
      if (setSelectedIds) setSelectedIds([nodeId]);
      if (setSelectedId) setSelectedId(nodeId);
    }
  };

  const tokens = designTokens || DEFAULT_DESIGN_TOKENS;

  return (
    <aside
      data-testid="left-sidebar"
      className="flex w-72 shrink-0 border-r border-[#e4e4e7] bg-white select-none"
    >
      <nav className="flex w-12 shrink-0 flex-col items-center border-r border-[#e4e4e7] py-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              title={t.label}
              className={`relative mb-1 flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                active ? "bg-[#18181b] text-white" : "text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b]"
              }`}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </nav>

      {tab === "agent" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <AgentPanel {...agent} />
        </div>
      ) : (
      <div className="low-scroll flex-1 overflow-auto">
        {tab === "pages" && (
          <div className="py-1">
            <div className="flex items-center justify-between px-3 py-2">
              <SectionHead>Screens</SectionHead>
              <button
                data-testid="add-screen-btn"
                onClick={addScreen}
                title="Add screen"
                className="flex h-6 w-6 items-center justify-center rounded text-[#3f3f46] hover:bg-[#f4f4f5]"
              >
                <Plus size={14} />
              </button>
            </div>
            {frames.map((f) => {
              const active = f.id === activeFrameId;
              const isEditing = editingFrameId === f.id;
              return (
                <div
                  key={f.id}
                  data-testid={`frame-item-${f.id}`}
                  onClick={() => selectFrame(f.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingFrameId(f.id);
                    setEditingName(f.name);
                  }}
                  className={`group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    active ? "bg-[#f4f4f5] font-medium text-[#18181b]" : "text-[#3f3f46] hover:bg-[#fafafa]"
                  }`}
                >
                  <Frame size={13} className={active ? "text-[#18181b]" : "text-[#a1a1aa]"} />
                  {isEditing ? (
                    <input
                      data-testid={`frame-rename-input-${f.id}`}
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          const trimmed = editingName.trim();
                          if (trimmed && onRenameFrame) {
                            onRenameFrame(f.id, trimmed);
                          }
                          setEditingFrameId(null);
                        } else if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditingFrameId(null);
                        }
                      }}
                      onBlur={() => {
                        const trimmed = editingName.trim();
                        if (trimmed && onRenameFrame) {
                          onRenameFrame(f.id, trimmed);
                        }
                        setEditingFrameId(null);
                      }}
                      className="h-5 flex-1 rounded border border-[#18181b] bg-white px-1 text-xs text-[#18181b] outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate">{f.name}</span>
                  )}
                  {!isEditing && (
                    <button
                      data-testid={`frame-delete-${f.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFrame(f.id);
                      }}
                      title="Delete screen"
                      className="rounded p-0.5 text-[#a1a1aa] opacity-0 hover:text-[#18181b] group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "layers" && (
          <div className="py-1">
            <SectionHead>Layers ({nodes.length})</SectionHead>
            {nodes.slice().reverse().map((n) => {
              const Icon = layerIcon(n.type);
              const selected = effectiveSelectedIds.includes(n.id);
              const isGroup = n.type === "group";
              const isInstance = n.type === "componentInstance";
              return (
                <div
                  key={n.id}
                  data-testid={`layer-node-${n.id}`}
                  onClick={(e) => handleLayerClick(e, n.id)}
                  className={`group flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                    selected ? "bg-[#f4f4f5] font-medium text-[#18181b]" : "text-[#3f3f46] hover:bg-[#fafafa]"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Icon size={13} className={selected ? "text-[#18181b]" : "text-[#a1a1aa]"} />
                    <span className="truncate">{n.name}</span>
                    {isGroup && (
                      <span className="rounded bg-[#e4e4e7] px-1 py-0.2 text-[9px] text-[#71717a]">
                        {n.children?.length || 0}
                      </span>
                    )}
                    {isInstance && (
                      <span
                        data-testid={`instance-badge-${n.id}`}
                        className="rounded border border-[#d4d4d8] bg-[#f4f4f5] px-1 py-0.2 text-[9px] text-[#18181b] font-medium"
                      >
                        Instance
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      data-testid={`lock-node-${n.id}`}
                      title={n.locked ? "Unlock layer" : "Lock layer"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock && onToggleLock(n.id);
                      }}
                      className={`rounded p-0.5 transition-colors ${
                        n.locked
                          ? "text-[#18181b] opacity-100"
                          : "text-[#a1a1aa] opacity-0 hover:text-[#18181b] group-hover:opacity-100"
                      }`}
                    >
                      {n.locked ? <Lock size={11} /> : <Unlock size={11} />}
                    </button>
                    <button
                      data-testid={`hide-node-${n.id}`}
                      title={n.hidden ? "Show layer" : "Hide layer"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHide && onToggleHide(n.id);
                      }}
                      className={`rounded p-0.5 transition-colors ${
                        n.hidden
                          ? "text-[#18181b] opacity-100"
                          : "text-[#a1a1aa] opacity-0 hover:text-[#18181b] group-hover:opacity-100"
                      }`}
                    >
                      {n.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                </div>
              );
            })}
            {nodes.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-[#a1a1aa]">Empty screen.</p>
            )}
          </div>
        )}

        {tab === "components" && (
          <div className="p-3">
            {/* Create Component Section */}
            <div className="mb-3 rounded-md border border-[#e4e4e7] bg-[#fafafa] p-2.5">
              <p className="text-xs font-semibold text-[#18181b]">Create Component</p>
              <p className="mb-2 text-[10px] text-[#a1a1aa]">
                Convert current canvas selection into a reusable component.
              </p>
              <input
                data-testid="new-component-name-input"
                type="text"
                value={newComponentName}
                placeholder="Component name..."
                onChange={(e) => setNewComponentName(e.target.value)}
                className="mb-2 h-7 w-full rounded border border-[#d4d4d8] bg-white px-2 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              />
              <button
                data-testid="create-component-from-selection-btn"
                disabled={!effectiveSelectedIds || effectiveSelectedIds.length === 0}
                onClick={() => {
                  if (onCreateComponentFromSelection) {
                    onCreateComponentFromSelection(newComponentName.trim() || "Component");
                    setNewComponentName("");
                  }
                }}
                className={`flex h-7 w-full items-center justify-center gap-1.5 rounded text-xs font-medium transition-colors ${
                  effectiveSelectedIds && effectiveSelectedIds.length > 0
                    ? "bg-[#18181b] text-white hover:bg-[#27272a]"
                    : "cursor-not-allowed bg-[#e4e4e7] text-[#a1a1aa]"
                }`}
              >
                <Plus size={13} />
                <span>Create from Selection ({effectiveSelectedIds.length})</span>
              </button>
            </div>

            {/* Custom Project Components */}
            {components && components.length > 0 && (
              <div className="mb-3">
                <SectionHead>Project Components ({components.length})</SectionHead>
                <div className="space-y-1.5 mt-1">
                  {components.map((comp) => (
                    <div
                      key={comp.id}
                      data-testid={`custom-component-${comp.id}`}
                      className="flex items-center justify-between rounded-md border border-[#e4e4e7] bg-white p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ComponentIcon size={14} className="text-[#18181b] shrink-0" />
                        <span className="truncate font-medium text-[#18181b]">{comp.name}</span>
                      </div>
                      <button
                        data-testid={`insert-instance-${comp.id}`}
                        onClick={() => onInsertComponentInstance && onInsertComponentInstance(comp.id)}
                        className="rounded border border-[#d4d4d8] bg-white px-2 py-0.5 text-[11px] font-medium text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
                      >
                        Insert
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SectionHead>Default Components</SectionHead>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {dummyComponents.map((c) => (
                <div
                  key={c.id}
                  data-testid={`component-${c.id}`}
                  draggable
                  onDragStart={(e) => setDrag(e, { kind: "component", id: c.id, name: c.name })}
                  className="cursor-grab rounded-md border border-[#e4e4e7] bg-white p-2 transition-colors hover:border-[#a1a1aa] active:cursor-grabbing"
                >
                  <div className="mb-1.5 flex h-10 items-center justify-center rounded border border-dashed border-[#e4e4e7] bg-[#fafafa]">
                    <div className="h-4 w-4/5 rounded-sm bg-[#e4e4e7]" />
                  </div>
                  <p className="flex items-center gap-1 truncate text-[11px] font-medium">
                    <GripVertical size={10} className="text-[#d4d4d8]" />
                    {c.name}
                  </p>
                  <p className="truncate text-[10px] text-[#a1a1aa]">{c.hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Design Tokens Tab */}
        {tab === "tokens" && (
          <div data-testid="tokens-panel" className="p-3">
            <h3 className="mb-0.5 text-sm font-semibold">Design Tokens</h3>
            <p className="mb-3 text-[11px] text-[#a1a1aa]">
              Consistent colors, radius & spacing tokens across your project. Click any token to apply it to selected layer.
            </p>

            {/* Colors Section */}
            <SectionHead>Colors</SectionHead>
            <div className="space-y-1.5 mt-1">
              {tokens.colors &&
                Object.entries(tokens.colors).map(([name, hex]) => (
                  <div
                    key={name}
                    data-testid={`token-color-${name}`}
                    onClick={() => {
                      if (onApplyTokenToSelected) onApplyTokenToSelected("color", hex);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-[#e4e4e7] bg-white p-1.5 text-xs hover:border-[#a1a1aa] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded border border-[#d4d4d8]"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="font-medium text-[#18181b] capitalize">{name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#71717a]">{hex}</span>
                  </div>
                ))}
            </div>

            {/* Radius Section */}
            <div className="mt-4">
              <SectionHead>Radius</SectionHead>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {tokens.radius &&
                  Object.entries(tokens.radius).map(([name, rad]) => (
                    <button
                      key={name}
                      data-testid={`token-radius-${name}`}
                      onClick={() => {
                        if (onApplyTokenToSelected) onApplyTokenToSelected("radius", rad);
                      }}
                      className="flex flex-col items-center justify-center rounded-md border border-[#e4e4e7] bg-white p-2 text-xs hover:border-[#a1a1aa] transition-colors"
                    >
                      <span className="text-[10px] text-[#a1a1aa] uppercase">{name}</span>
                      <span className="font-semibold text-[#18181b]">{`${rad}px`}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Spacing Section */}
            <div className="mt-4">
              <SectionHead>Spacing</SectionHead>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {tokens.spacing &&
                  Object.entries(tokens.spacing).map(([name, sp]) => (
                    <div
                      key={name}
                      data-testid={`token-spacing-${name}`}
                      className="flex flex-col items-center justify-center rounded-md border border-[#e4e4e7] bg-[#fafafa] p-2 text-xs"
                    >
                      <span className="text-[10px] text-[#a1a1aa] uppercase">{name}</span>
                      <span className="font-semibold text-[#18181b]">{`${sp}px`}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div className="p-3">
            <p className="mb-2 text-[10px] text-[#a1a1aa]">Drag a template to add it as a new screen.</p>
            <div className="grid grid-cols-2 gap-2">
              {dummyTemplates.map((t) => (
                <div
                  key={t.id}
                  data-testid={`template-${t.id}`}
                  draggable
                  onDragStart={(e) =>
                    setDrag(e, { kind: "template", preset: t.name.toLowerCase(), name: t.name })
                  }
                  className="cursor-grab rounded-md border border-[#e4e4e7] bg-white p-2 text-center transition-colors hover:border-[#a1a1aa] active:cursor-grabbing"
                >
                  <div className="mb-1.5 flex h-14 items-center justify-center rounded border border-dashed border-[#e4e4e7] bg-[#fafafa]">
                    <LayoutTemplate size={18} className="text-[#a1a1aa]" />
                  </div>
                  <p className="truncate text-[11px] font-medium">{t.name}</p>
                  <p className="text-[10px] text-[#a1a1aa]">{t.screens} screens</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "import" && (
          <ImportTab
            onExport={onExport}
            onImportClick={onImportClick}
            onImportFile={onImportFile}
            onOpenAiImport={() => setTab("ai")}
          />
        )}

        {tab === "ai" && (
          <AiImportPanel
            projectId={projectId}
            onApplyPatch={onApplyAiPatch}
          />
        )}
      </div>
      )}
    </aside>
  );
}
