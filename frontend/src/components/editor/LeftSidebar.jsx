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
} from "lucide-react";
import { dummyTemplates, importOptions } from "@/data/dummyTemplates";
import { dummyComponents } from "@/data/dummyComponents";
import AgentPanel from "@/components/editor/AgentPanel";
import AiImportPanel from "@/components/editor/AiImportPanel";

const tabs = [
  { id: "pages", label: "Pages", icon: FileStack },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "components", label: "Components", icon: ComponentIcon },
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
    case "frame":
      return Frame;
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
        <Upload size={18} className="mb-1.5 text-[#a1a1aa]" />
        <p className="text-xs font-medium text-[#3f3f46]">Drag & drop a .low.json file</p>
        <p className="mt-0.5 text-[10px] text-[#a1a1aa]">or click to browse</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          data-testid="import-json-btn"
          onClick={onImportClick}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
        >
          <Upload size={13} /> Import
        </button>
        <button
          data-testid="export-json-btn"
          onClick={onExport}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#18181b] bg-[#18181b] text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
        >
          <Download size={13} /> Export
        </button>
      </div>

      <div className="space-y-1">
        {importOptions.map((o) => {
          const Icon = icons[o.id] || Upload;
          const isJson = o.id === "imp_json";
          const isAi = o.id === "imp_ai";
          const handleClick = isJson ? onImportClick : isAi ? onOpenAiImport : undefined;
          return (
            <button
              key={o.id}
              data-testid={`import-option-${o.id}`}
              onClick={handleClick}
              className="flex w-full items-center gap-2.5 rounded-md border border-[#e4e4e7] bg-white px-2.5 py-2 text-left transition-colors hover:border-[#a1a1aa]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded border border-[#e4e4e7] text-[#3f3f46]">
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{o.name}</p>
                <p className="text-[10px] text-[#a1a1aa]">{o.hint}</p>
              </div>
              <ChevronRight size={13} className="text-[#d4d4d8]" />
            </button>
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
  setSelectedId,
  onExport,
  onImportClick,
  onImportFile,
  agent,
  projectId,
  onApplyAiPatch,
}) {
  const [editingFrameId, setEditingFrameId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const activeFrame = frames.find((f) => f.id === activeFrameId);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#e4e4e7] bg-white">
      <nav className="flex shrink-0 border-b border-[#e4e4e7]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              data-testid={`sidebar-tab-${t.id}`}
              title={t.label}
              onClick={() => setTab(t.id)}
              className={`flex h-9 flex-1 items-center justify-center border-b-2 transition-colors ${
                active
                  ? "border-[#18181b] text-[#18181b]"
                  : "border-transparent text-[#a1a1aa] hover:text-[#3f3f46]"
              }`}
            >
              <Icon size={15} />
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
                      className="rounded p-0.5 text-[#a1a1aa] opacity-0 hover:text-[#18181b] group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "layers" && (
          <div className="py-1">
            <SectionHead>{activeFrame?.name || "Screen"}</SectionHead>
            {nodes.map((n) => {
              const Icon = layerIcon(n.type);
              const active = n.id === selectedId;
              return (
                <button
                  key={n.id}
                  data-testid={`layer-${n.id}`}
                  onClick={() => setSelectedId(n.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                    active ? "bg-[#f4f4f5] font-medium text-[#18181b]" : "text-[#3f3f46] hover:bg-[#fafafa]"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[#18181b]" : "text-[#a1a1aa]"} />
                  <span className="truncate">{n.name}</span>
                </button>
              );
            })}
            {nodes.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-[#a1a1aa]">Empty screen.</p>
            )}
          </div>
        )}

        {tab === "components" && (
          <div className="p-3">
            <p className="mb-2 text-[10px] text-[#a1a1aa]">Drag a component onto the canvas.</p>
            <div className="grid grid-cols-2 gap-2">
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
                  className="cursor-grab overflow-hidden rounded-md border border-[#e4e4e7] bg-white transition-colors hover:border-[#a1a1aa] active:cursor-grabbing"
                >
                  <div className="dot-grid flex h-20 items-center justify-center">
                    <div className="h-16 w-9 rounded-[4px] border border-[#d4d4d8] bg-white" />
                  </div>
                  <p className="truncate border-t border-[#e4e4e7] px-2 py-1.5 text-[11px] font-medium">
                    {t.name}
                  </p>
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
          <AiImportPanel projectId={projectId} onApplyPatch={onApplyAiPatch} />
        )}
      </div>
      )}
    </aside>
  );
}
