import React from "react";
import {
  MousePointer2,
  Frame,
  Square,
  Type,
  Image as ImageIcon,
  Component,
  Play,
  ChevronLeft,
  Undo2,
  Redo2,
  HelpCircle,
} from "lucide-react";
import { Segmented } from "@/components/primitives/Input";
import Button from "@/components/primitives/Button";

const tools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "frame", label: "Frame", icon: Frame },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "component", label: "Component", icon: Component },
];

const ToolButton = ({ tool, active, onClick }) => {
  const Icon = tool.icon;
  return (
    <button
      data-testid={`tool-${tool.id}`}
      title={tool.label}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
        active
          ? "bg-[#18181b] text-white"
          : "text-[#3f3f46] hover:bg-[#f4f4f5]"
      }`}
    >
      <Icon size={15} />
      <span className="hidden lg:inline">{tool.label}</span>
    </button>
  );
};

export default function TopToolbar({
  activeTool,
  onToolClick,
  mode,
  setMode,
  onPreview,
  onExit,
  projectName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenShortcuts,
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#e4e4e7] bg-white px-3">
      <div className="flex items-center gap-2">
        <button
          data-testid="exit-editor-btn"
          onClick={onExit}
          className="flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b]"
        >
          <ChevronLeft size={16} />
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#18181b] text-[10px] font-bold text-white">
            L
          </div>
        </button>
        <div className="mx-1 h-5 w-px bg-[#e4e4e7]" />
        <div className="flex items-center gap-0.5">
          {tools.map((t) => (
            <ToolButton
              key={t.id}
              tool={t}
              active={activeTool === t.id}
              onClick={() => onToolClick(t.id)}
            />
          ))}
        </div>
        <div className="mx-1 h-5 w-px bg-[#e4e4e7]" />
        <div className="flex items-center gap-0.5">
          <button
            data-testid="undo-btn"
            title="Undo (Ctrl+Z)"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#3f3f46] transition-colors hover:bg-[#f4f4f5] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 size={15} />
          </button>
          <button
            data-testid="redo-btn"
            title="Redo (Ctrl+Shift+Z)"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#3f3f46] transition-colors hover:bg-[#f4f4f5] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      <div className="hidden items-center gap-1 text-xs font-medium text-[#3f3f46] md:flex">
        {projectName}
      </div>

      <div className="flex items-center gap-2">
        {onOpenShortcuts && (
          <button
            data-testid="shortcuts-btn"
            title="Keyboard Shortcuts (?)"
            onClick={onOpenShortcuts}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#71717a] transition-colors hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            <HelpCircle size={15} />
          </button>
        )}
        <Segmented
          testid="mode-switch"
          value={mode}
          onChange={setMode}
          options={[
            { value: "design", label: "Design" },
            { value: "prototype", label: "Prototype" },
          ]}
        />
        <Button variant="primary" data-testid="preview-btn" onClick={onPreview}>
          <Play size={13} /> Preview
        </Button>
      </div>
    </header>
  );
}
