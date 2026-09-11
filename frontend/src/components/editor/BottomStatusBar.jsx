import React from "react";
import { ZoomIn, ZoomOut, Check, Loader2 } from "lucide-react";

export default function BottomStatusBar({
  zoom,
  setZoom,
  saveStatus,
  docName,
  nodeCount,
  frameName,
  frameCount,
  snappingEnabled = true,
  onToggleSnapping,
}) {
  const clamp = (z) => Math.max(0.2, Math.min(2, Math.round(z * 100) / 100));
  const saved =
    saveStatus === "Saved" ||
    saveStatus === "Saved to server" ||
    saveStatus === "Saved locally";

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[#e4e4e7] bg-white px-3 text-[11px] text-[#71717a]">
      <div className="flex items-center gap-3">
        <span className="font-medium text-[#3f3f46]">{docName}</span>
        <span className="text-[#d4d4d8]">|</span>
        <span data-testid="active-frame-name">{frameName}</span>
        <span className="text-[#d4d4d8]">|</span>
        <span>{frameCount} screens · {nodeCount} layers</span>
      </div>

      <div className="flex items-center gap-3">
        <div
          data-testid="autosave-status"
          className={`flex items-center gap-1 ${saved ? "text-[#3f3f46]" : "text-[#a1a1aa]"}`}
        >
          {saved ? (
            <Check size={12} />
          ) : (
            <Loader2 size={12} className="animate-spin" />
          )}
          {saveStatus}
        </div>

        <button
          data-testid="snap-toggle-btn"
          onClick={onToggleSnapping}
          title={snappingEnabled ? "Snap guides enabled" : "Snap guides disabled"}
          className={`flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors ${
            snappingEnabled ? "bg-[#f4f4f5] font-medium text-[#18181b]" : "text-[#a1a1aa] hover:text-[#3f3f46]"
          }`}
        >
          Snap
        </button>

        <div className="flex items-center overflow-hidden rounded-md border border-[#e4e4e7]">
          <button
            data-testid="zoom-out-btn"
            onClick={() => setZoom(clamp(zoom - 0.1))}
            className="flex h-6 w-7 items-center justify-center hover:bg-[#f4f4f5]"
          >
            <ZoomOut size={13} />
          </button>
          <button
            data-testid="zoom-reset-btn"
            onClick={() => setZoom(1)}
            className="h-6 w-12 border-x border-[#e4e4e7] text-center font-medium text-[#3f3f46] hover:bg-[#f4f4f5]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            data-testid="zoom-in-btn"
            onClick={() => setZoom(clamp(zoom + 0.1))}
            className="flex h-6 w-7 items-center justify-center hover:bg-[#f4f4f5]"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
}
