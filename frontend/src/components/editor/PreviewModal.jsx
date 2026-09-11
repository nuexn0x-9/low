import React, { useState } from "react";
import { X, Smartphone, RotateCcw, ChevronLeft } from "lucide-react";
import { FRAME } from "@/data/storage";
import NodeView from "@/components/editor/NodeView";

const resolveTarget = (frames, node) => {
  const p = node.prototype;
  if (!p || p.trigger === "none") return null;
  if ((p.action === "navigate" || p.action === "overlay") && p.target) {
    const byId = frames.find((f) => f.id === p.target);
    if (byId) return byId.id;
    const byName = frames.find((f) => f.name.toLowerCase() === String(p.target).toLowerCase());
    if (byName) return byName.id;
  }
  return null;
};

export default function PreviewModal({ frames, startFrameId, onClose }) {
  const scale = 0.82;
  const [stack, setStack] = useState([startFrameId || frames[0]?.id]);
  const [anim, setAnim] = useState("");
  const [overlay, setOverlay] = useState(null); // { targetId, overlayType, dismissOnOutsideClick, transition }
  const currentId = stack[stack.length - 1];
  const frame = frames.find((f) => f.id === currentId) || frames[0];
  const overlayFrame = overlay ? frames.find((f) => f.id === overlay.targetId) : null;

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
    if (node.prototype?.action === "overlay") {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/70 p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden rounded-lg border border-[#3f3f46] bg-[#1c1c1f]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 items-center justify-between border-b border-[#3f3f46] px-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <Smartphone size={14} />
            Preview — {frame?.name}
          </div>
          <div className="flex items-center gap-1">
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
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center p-8">
          <div style={{ width: FRAME.width * scale, height: FRAME.height * scale }}>
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
              className="relative overflow-hidden rounded-[26px] border-[6px] border-[#0f0f10] bg-white"
            >
              <div
                key={currentId}
                className={`relative overflow-hidden ${anim}`}
                style={{ width: FRAME.width, height: FRAME.height }}
              >
                <div className="flex h-10 items-center justify-between px-6 text-[12px] font-semibold text-[#18181b]">
                  <span>9:41</span>
                  <span className="tracking-widest text-[#a1a1aa]">• • •</span>
                </div>
                {frame?.nodes.map((node) => {
                  const clickable = !!resolveTarget(frames, node) || node.prototype?.action === "back";
                  return (
                    <div
                      key={node.id}
                      onClick={() => onNodeClick(node)}
                      style={{ cursor: clickable ? "pointer" : "default" }}
                    >
                      <NodeView node={node} />
                    </div>
                  );
                })}

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
                    } ${overlay.transition === "fade" ? "low-anim-fade" : "low-anim-slide"}`}
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
                        {overlayFrame.nodes.map((node) => {
                          const clickable = !!resolveTarget(frames, node) || node.prototype?.action === "back";
                          return (
                            <div
                              key={node.id}
                              onClick={() => onNodeClick(node)}
                              style={{ cursor: clickable ? "pointer" : "default" }}
                            >
                              <NodeView node={node} />
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

        <div className="border-t border-[#3f3f46] px-4 py-2 text-center text-[10px] text-[#a1a1aa]">
          Tap linked elements to navigate between screens
        </div>
      </div>
    </div>
  );
}
