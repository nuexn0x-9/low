import React, { useState, useEffect } from "react";
import { X, Smartphone, RotateCcw, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";
import { FRAME } from "@/data/storage";
import NodeView from "@/components/editor/NodeView";

const resolveTarget = (frames, node) => {
  const p = node.prototype;
  if (!p || p.trigger === "none") return null;
  if ((p.action === "navigate" || p.action === "overlay" || p.action === "modal") && p.target) {
    const byId = frames.find((f) => f.id === p.target);
    if (byId) return byId.id;
    const byName = frames.find((f) => f.name.toLowerCase() === String(p.target).toLowerCase());
    if (byName) return byName.id;
  }
  return null;
};

export default function PreviewModal({ frames, startFrameId, onClose, components = [] }) {
  const [stack, setStack] = useState([startFrameId || frames[0]?.id]);
  const [anim, setAnim] = useState("");
  const [overlay, setOverlay] = useState(null); // { targetId, overlayType, dismissOnOutsideClick, transition }
  const currentId = stack[stack.length - 1];
  const frame = frames.find((f) => f.id === currentId) || frames[0];
  const overlayFrame = overlay ? frames.find((f) => f.id === overlay.targetId) : null;

  const frameW = frame?.width || FRAME.width || 390;
  const frameH = frame?.height || FRAME.height || 844;
  const phoneBorder = 6;
  const phoneW = frameW + phoneBorder * 2;
  const phoneH = frameH + phoneBorder * 2;

  // Responsive default scale based on window height so preview fits without clipping
  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") return 0.8;
    const availableH = window.innerHeight - 150;
    const fitScale = Math.min(0.85, Math.max(0.4, availableH / phoneH));
    return Math.round(fitScale * 100) / 100;
  });

  // Handle keyboard shortcuts (Esc to dismiss overlay or close preview)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (overlay) {
          closeOverlay();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overlay, onClose]);

  const navigateTo = (fid, node) => {
    setOverlay(null);
    const transition = node?.prototype?.transition || "instant";
    setAnim(transition === "slide" ? "low-anim-slide" : transition === "fade" ? "low-anim-fade" : "");
    setStack((s) => [...s, fid]);
    if (transition !== "instant") setTimeout(() => setAnim(""), 260);
  };

  const openOverlay = (fid, node) => {
    const p = node?.prototype || {};
    setOverlay({
      targetId: fid,
      overlayType: p.overlayType || "bottom-sheet",
      dismissOnOutsideClick: p.dismissOnOutsideClick !== false,
      transition: p.transition || "slide-up",
    });
  };

  const closeOverlay = () => setOverlay(null);

  const goBack = () => {
    if (overlay) {
      closeOverlay();
      return;
    }
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  const reset = () => {
    setOverlay(null);
    setStack([startFrameId || frames[0]?.id]);
  };

  const onNodeClick = (node) => {
    if (node.prototype?.action === "back") {
      goBack();
      return;
    }
    if (node.prototype?.action === "overlay" || node.prototype?.action === "modal") {
      const target = resolveTarget(frames, node);
      if (target) openOverlay(target, node);
      return;
    }
    const target = resolveTarget(frames, node);
    if (target) navigateTo(target, node);
  };

  return (
    <div
      data-testid="preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/70 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[96vh] max-w-[96vw] flex-col overflow-hidden rounded-lg border border-[#3f3f46] bg-[#1c1c1f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#3f3f46] px-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <Smartphone size={14} />
            <span>Preview — {frame?.name}</span>
            <span className="text-[11px] text-[#71717a]">
              ({frameW}×{frameH})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <button
              onClick={() => setScale((s) => Math.max(0.4, Math.round((s - 0.1) * 10) / 10))}
              disabled={scale <= 0.4}
              className="rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="min-w-[36px] text-center font-mono text-[11px] text-[#a1a1aa]">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1.2, Math.round((s + 0.1) * 10) / 10))}
              disabled={scale >= 1.2}
              className="rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <div className="mx-1 h-3 w-px bg-[#3f3f46]" />
            <button
              data-testid="preview-back-btn"
              onClick={goBack}
              disabled={stack.length <= 1 && !overlay}
              className="flex items-center gap-1 rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white disabled:opacity-30"
              title="Back"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              data-testid="preview-reset-btn"
              onClick={reset}
              className="rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white"
              title="Restart"
            >
              <RotateCcw size={14} />
            </button>
            <button
              data-testid="preview-close-btn"
              onClick={onClose}
              className="rounded p-1 text-[#a1a1aa] transition-colors hover:bg-[#3f3f46] hover:text-white"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Mockup Centering Container */}
        <div
          className="flex flex-1 items-center justify-center overflow-auto p-6"
          style={{
            maxWidth: "94vw",
            maxHeight: "calc(92vh - 84px)",
          }}
        >
          <div
            style={{
              width: Math.round(phoneW * scale),
              height: Math.round(phoneH * scale),
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: phoneW,
                height: phoneH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
              className="relative overflow-hidden rounded-[30px] border-[6px] border-[#0f0f10] bg-white shadow-2xl"
            >
              <div
                key={currentId}
                className={`relative overflow-hidden ${anim}`}
                style={{ width: frameW, height: frameH }}
              >
                {/* Status Bar */}
                <div className="pointer-events-none flex h-10 items-center justify-between px-6 text-[12px] font-semibold text-[#18181b]">
                  <span>9:41</span>
                  <span className="tracking-widest text-[#a1a1aa]">• • •</span>
                </div>

                {/* Safe Area Guide Overlay in Preview */}
                {frame?.safeArea && frame.safeArea.visible !== false && (
                  <div
                    data-testid="preview-safe-area-overlay"
                    className="pointer-events-none absolute inset-0 z-20"
                  >
                    {frame.safeArea.top > 0 && (
                      <div
                        className="absolute left-0 right-0 border-b border-dashed border-zinc-400/30"
                        style={{ top: 0, height: frame.safeArea.top }}
                      />
                    )}
                    {frame.safeArea.bottom > 0 && (
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-zinc-400/30"
                        style={{ bottom: 0, height: frame.safeArea.bottom }}
                      />
                    )}
                    {frame.safeArea.left > 0 && (
                      <div
                        className="absolute top-0 bottom-0 border-r border-dashed border-zinc-400/30"
                        style={{ left: 0, width: frame.safeArea.left }}
                      />
                    )}
                    {frame.safeArea.right > 0 && (
                      <div
                        className="absolute top-0 bottom-0 border-l border-dashed border-zinc-400/30"
                        style={{ right: 0, width: frame.safeArea.right }}
                      />
                    )}
                  </div>
                )}

                {/* Render Frame Nodes */}
                {(frame?.nodes || [])
                  .filter((node) => !node.hidden && !node.parentId)
                  .map((node) => {
                    const clickable =
                      !!resolveTarget(frames, node) ||
                      node.prototype?.action === "back";
                    return (
                      <div
                        key={node.id}
                        onClick={() => onNodeClick(node)}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          cursor: clickable ? "pointer" : "default",
                        }}
                      >
                        <NodeView
                          node={node}
                          components={components}
                          allNodes={frame?.nodes || []}
                          onNodeClick={onNodeClick}
                          frames={frames}
                        />
                      </div>
                    );
                  })}

                {/* Overlay Screen (Bottom-sheet or Centered Dialog) */}
                {overlayFrame && (
                  <div
                    data-testid="preview-overlay-backdrop"
                    onClick={() => {
                      if (overlay.dismissOnOutsideClick) closeOverlay();
                    }}
                    className={`absolute inset-0 z-30 flex bg-black/50 ${
                      overlay.overlayType === "centered-dialog"
                        ? "items-center justify-center p-6"
                        : "items-end justify-center"
                    } ${
                      overlay.transition === "fade"
                        ? "low-anim-fade"
                        : "low-anim-slide"
                    }`}
                  >
                    <div
                      data-testid="preview-overlay-content"
                      onClick={(e) => e.stopPropagation()}
                      className={`relative overflow-hidden bg-white shadow-2xl ${
                        overlay.overlayType === "centered-dialog"
                          ? "w-[320px] max-h-[500px] rounded-2xl p-4"
                          : "w-full max-h-[540px] rounded-t-2xl p-4"
                      }`}
                      style={{ minHeight: 240 }}
                    >
                      {overlay.overlayType === "bottom-sheet" && (
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d4d4d8]" />
                      )}
                      <div className="relative" style={{ minHeight: 200 }}>
                        {(overlayFrame.nodes || [])
                          .filter((node) => !node.hidden)
                          .map((node) => {
                            const clickable =
                              !!resolveTarget(frames, node) ||
                              node.prototype?.action === "back";
                            return (
                              <div
                                key={node.id}
                                onClick={() => onNodeClick(node)}
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                  cursor: clickable ? "pointer" : "default",
                                }}
                              >
                                <NodeView
                                  node={node}
                                  components={components}
                                  allNodes={overlayFrame.nodes || []}
                                  onNodeClick={onNodeClick}
                                  frames={frames}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#3f3f46] px-4 py-2 text-center text-[10px] text-[#a1a1aa]">
          Tap linked elements to navigate between screens • Esc to close
        </div>
      </div>
    </div>
  );
}
