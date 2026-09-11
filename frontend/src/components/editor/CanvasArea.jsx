import React, { useRef } from "react";
import { FRAME } from "@/data/storage";
import NodeView from "@/components/editor/NodeView";

const HANDLES = ["nw", "ne", "sw", "se"];

export default function CanvasArea({
  frames,
  activeFrameId,
  selectFrame,
  selectedId,
  setSelectedId,
  updateNodeLive,
  beginTransaction,
  endTransaction,
  onDropItem,
  zoom,
  mode,
  snappingEnabled = true,
}) {
  const drag = useRef(null);
  const frameRefs = useRef({});
  const [guides, setGuides] = React.useState([]); // [{ type: 'v'|'h', pos: number }]

  const activeFrame = frames.find((f) => f.id === activeFrameId);

  const computeSnapping = (nodeId, x, y, width, height) => {
    if (!snappingEnabled || !activeFrame) return { snappedX: x, snappedY: y, newGuides: [] };
    const THRESHOLD = 5;
    const newGuides = [];

    // Frame targets
    const vTargets = [0, FRAME.width / 2, FRAME.width];
    const hTargets = [0, FRAME.height / 2, FRAME.height];

    // Sibling targets
    const siblings = (activeFrame.nodes || []).filter((n) => n.id !== nodeId);
    for (const sib of siblings) {
      vTargets.push(sib.x, sib.x + sib.width / 2, sib.x + sib.width);
      hTargets.push(sib.y, sib.y + sib.height / 2, sib.y + sib.height);
    }

    let snappedX = x;
    let snappedY = y;

    // Check X snap points: left edge, center, right edge
    const xEdges = [
      { edge: x, offset: 0 },
      { edge: x + width / 2, offset: width / 2 },
      { edge: x + width, offset: width },
    ];
    let minDiffX = THRESHOLD + 1;
    let bestSnapX = null;
    let guideX = null;

    for (const target of vTargets) {
      for (const { edge, offset } of xEdges) {
        const diff = Math.abs(edge - target);
        if (diff <= THRESHOLD && diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = target - offset;
          guideX = target;
        }
      }
    }
    if (bestSnapX !== null) {
      snappedX = bestSnapX;
      newGuides.push({ type: "v", pos: guideX });
    }

    // Check Y snap points: top edge, center, bottom edge
    const yEdges = [
      { edge: y, offset: 0 },
      { edge: y + height / 2, offset: height / 2 },
      { edge: y + height, offset: height },
    ];
    let minDiffY = THRESHOLD + 1;
    let bestSnapY = null;
    let guideY = null;

    for (const target of hTargets) {
      for (const { edge, offset } of yEdges) {
        const diff = Math.abs(edge - target);
        if (diff <= THRESHOLD && diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = target - offset;
          guideY = target;
        }
      }
    }
    if (bestSnapY !== null) {
      snappedY = bestSnapY;
      newGuides.push({ type: "h", pos: guideY });
    }

    return { snappedX, snappedY, newGuides };
  };

  const startMove = (e, node) => {
    e.stopPropagation();
    setSelectedId(node.id);
    beginTransaction();
    drag.current = {
      mode: "move",
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      width: node.width,
      height: node.height,
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (e, node, handle) => {
    e.stopPropagation();
    setSelectedId(node.id);
    beginTransaction();
    drag.current = {
      mode: "resize",
      handle,
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      origW: node.width,
      origH: node.height,
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    if (d.mode === "move") {
      const rawX = Math.round(d.origX + dx);
      const rawY = Math.round(d.origY + dy);
      const { snappedX, snappedY, newGuides } = computeSnapping(d.id, rawX, rawY, d.width, d.height);
      setGuides(newGuides);
      updateNodeLive(d.id, { x: Math.round(snappedX), y: Math.round(snappedY) });
    } else {
      let { origX: x, origY: y, origW: w, origH: h } = d;
      if (d.handle.includes("e")) w = Math.max(8, d.origW + dx);
      if (d.handle.includes("s")) h = Math.max(8, d.origH + dy);
      if (d.handle.includes("w")) {
        w = Math.max(8, d.origW - dx);
        x = d.origX + dx;
      }
      if (d.handle.includes("n")) {
        h = Math.max(8, d.origH - dy);
        y = d.origY + dy;
      }
      setGuides([]);
      updateNodeLive(d.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
    }
  };

  const onUp = () => {
    if (drag.current) endTransaction();
    drag.current = null;
    setGuides([]);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  const readPayload = (e) => {
    try {
      const raw = e.dataTransfer.getData("application/low") || e.dataTransfer.getData("text/plain");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const handleDrop = (e, frame) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readPayload(e);
    if (!payload) return;
    const rect = frameRefs.current[frame.id]?.getBoundingClientRect();
    const pos = rect
      ? { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
      : { x: 100, y: 100 };
    onDropItem(frame.id, payload, pos);
  };

  return (
    <main
      data-testid="canvas-area"
      onMouseDown={() => setSelectedId(null)}
      className="low-scroll dot-grid low-select-none relative flex-1 overflow-auto"
    >
      <div className="flex min-h-full items-start p-16">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} className="flex items-start gap-16">
          {frames.map((frame) => {
            const isActive = frame.id === activeFrameId;
            const selected = isActive ? frame.nodes.find((n) => n.id === selectedId) : null;
            return (
              <div key={frame.id} className="flex flex-col">
                <button
                  data-testid={`frame-tab-${frame.id}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    selectFrame(frame.id);
                  }}
                  className={`mb-2 flex items-center gap-2 self-start rounded px-1 text-left transition-colors ${
                    isActive ? "text-[#18181b]" : "text-[#a1a1aa] hover:text-[#3f3f46]"
                  }`}
                >
                  <span className="text-[13px] font-medium">{frame.name}</span>
                  <span className="text-[12px] text-[#a1a1aa]">
                    {FRAME.width} × {FRAME.height}
                  </span>
                </button>

                <div
                  data-testid={`mobile-frame-${frame.id}`}
                  ref={(el) => (frameRefs.current[frame.id] = el)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!isActive) selectFrame(frame.id);
                    else setSelectedId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => handleDrop(e, frame)}
                  className={`relative overflow-hidden rounded-[14px] bg-white transition-shadow ${
                    isActive ? "border-2 border-[#2563eb]" : "border border-[#d4d4d8]"
                  }`}
                  style={{ width: FRAME.width, height: FRAME.height }}
                >
                  <div className="flex h-10 items-center justify-between px-6 text-[12px] font-semibold text-[#18181b]">
                    <span>9:41</span>
                    <span className="tracking-widest text-[#a1a1aa]">• • •</span>
                  </div>

                  {frame.nodes.map((node) => (
                    <div
                      key={node.id}
                      onMouseDown={(e) => {
                        if (!isActive) {
                          e.stopPropagation();
                          selectFrame(frame.id);
                          return;
                        }
                        startMove(e, node);
                      }}
                      style={{ position: "absolute", left: 0, top: 0, cursor: isActive ? "move" : "default" }}
                    >
                      <div data-testid={`canvas-node-${node.id}`}>
                        <NodeView node={node} />
                      </div>
                    </div>
                  ))}

                  {selected && (
                    <div
                      data-testid="selection-outline"
                      className="pointer-events-none absolute"
                      style={{ left: selected.x, top: selected.y, width: selected.width, height: selected.height, outline: "1.5px solid #2563eb", outlineOffset: 0 }}
                    >
                      {HANDLES.map((h) => (
                        <div
                          key={h}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            startResize(e, selected, h);
                          }}
                          className="pointer-events-auto absolute h-2 w-2 rounded-[2px] border border-[#2563eb] bg-white"
                          style={{
                            cursor: `${h}-resize`,
                            left: h.includes("w") ? -4 : undefined,
                            right: h.includes("e") ? -4 : undefined,
                            top: h.includes("n") ? -4 : undefined,
                            bottom: h.includes("s") ? -4 : undefined,
                          }}
                        />
                      ))}
                      <div className="absolute -top-5 left-0 rounded-[3px] bg-[#2563eb] px-1.5 text-[10px] font-medium text-white" style={{ whiteSpace: "nowrap" }}>
                        {selected.name}
                      </div>
                    </div>
                  )}

                  {isActive && guides.map((g, idx) => (
                    <div
                      key={idx}
                      data-testid={`snap-guide-${g.type}`}
                      className="pointer-events-none absolute z-20"
                      style={{
                        ...(g.type === "v"
                          ? { left: g.pos, top: 0, bottom: 0, width: 1, borderLeft: "1px dashed #2563eb" }
                          : { top: g.pos, left: 0, right: 0, height: 1, borderTop: "1px dashed #2563eb" }),
                        opacity: 0.75,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        data-testid="canvas-zoom-indicator"
        className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-[#e4e4e7] bg-white px-2 py-1 text-[11px] font-medium text-[#71717a]"
      >
        {Math.round(zoom * 100)}%
        <span className="ml-2 text-[#d4d4d8]">|</span>
        <span className="ml-2 capitalize">{mode}</span>
      </div>
    </main>
  );
}
