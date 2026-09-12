import React, { useRef, useState } from "react";
import { FRAME } from "@/data/storage";
import NodeView from "@/components/editor/NodeView";

const HANDLES = ["nw", "ne", "sw", "se"];

export default function CanvasArea({
  frames,
  activeFrameId,
  selectFrame,
  selectedId,
  selectedIds = [],
  setSelectedId,
  setSelectedIds,
  updateNodeLive,
  beginTransaction,
  endTransaction,
  onDropItem,
  zoom = 1,
  mode,
  snappingEnabled = true,
  components = [],
  onCommitNodeText,
}) {
  const drag = useRef(null);
  const frameRefs = useRef({});
  const [guides, setGuides] = useState([]); // [{ type: 'v'|'h', pos: number }]
  const [marquee, setMarquee] = useState(null); // { frameId, startX, startY, currX, currY }
  const [editingTextNodeId, setEditingTextNodeId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");

  const saveEditText = () => {
    if (editingTextNodeId) {
      const val = editingTextValue;
      const targetId = editingTextNodeId;
      setEditingTextNodeId(null);
      if (onCommitNodeText) {
        onCommitNodeText(targetId, val);
      } else {
        if (beginTransaction) beginTransaction();
        if (updateNodeLive) updateNodeLive(targetId, { text: val });
        if (endTransaction) endTransaction();
      }
    }
  };

  const cancelEditText = () => {
    setEditingTextNodeId(null);
  };

  const activeFrame = frames.find((f) => f.id === activeFrameId);

  // Normalized selection IDs
  const effectiveSelectedIds =
    selectedIds && selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];

  const setSelection = (ids) => {
    if (setSelectedIds) setSelectedIds(ids);
    if (setSelectedId) setSelectedId(ids.length === 1 ? ids[0] : null);
  };

  const computeSnapping = (nodeId, x, y, width, height) => {
    if (!snappingEnabled || !activeFrame) return { snappedX: x, snappedY: y, newGuides: [] };
    const THRESHOLD = 5;
    const newGuides = [];

    // Frame targets — use actual active frame dimensions, not global FRAME default
    const frameW = activeFrame.width || FRAME.width;
    const frameH = activeFrame.height || FRAME.height;
    const vTargets = [0, frameW / 2, frameW];
    const hTargets = [0, frameH / 2, frameH];

    // Sibling targets
    const siblings = (activeFrame.nodes || []).filter(
      (n) => n.id !== nodeId && !n.hidden && !effectiveSelectedIds.includes(n.id)
    );
    for (const sib of siblings) {
      vTargets.push(sib.x, sib.x + sib.width / 2, sib.x + sib.width);
      hTargets.push(sib.y, sib.y + sib.height / 2, sib.y + sib.height);
    }

    let snappedX = x;
    let snappedY = y;

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

  // ----- Drag single or multiple nodes -----
  const startMove = (e, node) => {
    e.stopPropagation();

    // Ignore locked nodes
    if (node.locked) return;

    // Read-only in inspect mode
    if (mode === "inspect") {
      setSelection([node.id]);
      return;
    }

    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;

    if (isModifier) {
      // Toggle node in selection
      if (effectiveSelectedIds.includes(node.id)) {
        setSelection(effectiveSelectedIds.filter((id) => id !== node.id));
      } else {
        setSelection([...effectiveSelectedIds, node.id]);
      }
      return;
    }

    // Determine nodes to drag
    let nodesToDrag = [];
    if (effectiveSelectedIds.includes(node.id) && effectiveSelectedIds.length > 1) {
      // Drag all currently selected nodes
      nodesToDrag = (activeFrame?.nodes || []).filter(
        (n) => effectiveSelectedIds.includes(n.id) && !n.locked
      );
    } else {
      // Select only this node and drag it
      setSelection([node.id]);
      nodesToDrag = [node];
    }

    // Also include children of any selected group nodes so they move along
    const childIdsToMove = new Set();
    nodesToDrag.forEach((n) => {
      if (n.type === "group" && Array.isArray(n.children)) {
        n.children.forEach((cid) => childIdsToMove.add(cid));
      }
    });

    const childNodesToMove = (activeFrame?.nodes || []).filter(
      (n) => childIdsToMove.has(n.id) && !nodesToDrag.some((dn) => dn.id === n.id)
    );

    const allMovingNodes = [...nodesToDrag, ...childNodesToMove];

    beginTransaction();
    drag.current = {
      mode: "move",
      primaryNode: node,
      nodes: allMovingNodes.map((n) => ({
        id: n.id,
        origX: n.x,
        origY: n.y,
        width: n.width,
        height: n.height,
      })),
      startX: e.clientX,
      startY: e.clientY,
      width: node.width,
      height: node.height,
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (e, node, handle) => {
    e.stopPropagation();
    if (node.locked || mode === "inspect") return;
    setSelection([node.id]);
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
      if (d.nodes.length === 1) {
        const p = d.nodes[0];
        const rawX = Math.round(p.origX + dx);
        const rawY = Math.round(p.origY + dy);
        const { snappedX, snappedY, newGuides } = computeSnapping(p.id, rawX, rawY, p.width, p.height);
        setGuides(newGuides);
        updateNodeLive(p.id, { x: Math.round(snappedX), y: Math.round(snappedY) });
      } else {
        // Bulk move
        setGuides([]);
        d.nodes.forEach((n) => {
          updateNodeLive(n.id, {
            x: Math.round(n.origX + dx),
            y: Math.round(n.origY + dy),
          });
        });
      }
    } else if (d.mode === "resize") {
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
      updateNodeLive(d.id, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      });
    }
  };

  const onUp = () => {
    if (drag.current) endTransaction();
    drag.current = null;
    setGuides([]);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  // ----- Marquee / Lasso Selection -----
  const startMarquee = (e, frame) => {
    e.stopPropagation();
    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!isModifier) {
      setSelection([]);
    }

    const rect = frameRefs.current[frame.id]?.getBoundingClientRect();
    if (!rect) return;

    const startX = (e.clientX - rect.left) / zoom;
    const startY = (e.clientY - rect.top) / zoom;

    const initialMarquee = {
      frameId: frame.id,
      startX,
      startY,
      currX: startX,
      currY: startY,
      isModifier,
      initialIds: isModifier ? [...effectiveSelectedIds] : [],
    };
    setMarquee(initialMarquee);

    const onMarqueeMove = (moveEvt) => {
      const currX = (moveEvt.clientX - rect.left) / zoom;
      const currY = (moveEvt.clientY - rect.top) / zoom;

      setMarquee((prev) => (prev ? { ...prev, currX, currY } : null));

      // Calculate marquee box
      const boxX = Math.min(startX, currX);
      const boxY = Math.min(startY, currY);
      const boxW = Math.abs(currX - startX);
      const boxH = Math.abs(currY - startY);

      // Only check intersection if marquee has reasonable drag threshold
      if (boxW > 3 || boxH > 3) {
        const frameNodes = frame.nodes || [];
        const intersecting = frameNodes.filter((n) => {
          if (n.locked || n.hidden) return false;
          return (
            n.x < boxX + boxW &&
            n.x + n.width > boxX &&
            n.y < boxY + boxH &&
            n.y + n.height > boxY
          );
        });
        const hitIds = intersecting.map((n) => n.id);
        if (initialMarquee.isModifier) {
          const merged = Array.from(new Set([...initialMarquee.initialIds, ...hitIds]));
          setSelection(merged);
        } else {
          setSelection(hitIds);
        }
      }
    };

    const onMarqueeUp = () => {
      setMarquee(null);
      window.removeEventListener("mousemove", onMarqueeMove);
      window.removeEventListener("mouseup", onMarqueeUp);
    };

    window.addEventListener("mousemove", onMarqueeMove);
    window.addEventListener("mouseup", onMarqueeUp);
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
      onMouseDown={() => setSelection([])}
      className="low-scroll dot-grid low-select-none relative flex-1 overflow-auto"
    >
      <div className="flex min-h-full items-start p-16">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} className="flex items-start gap-16">
          {frames.map((frame) => {
            const isActive = frame.id === activeFrameId;
            const frameW = frame.width || FRAME.width;
            const frameH = frame.height || FRAME.height;
            const visibleNodes = (frame.nodes || []).filter((n) => !n.hidden && !n.parentId);
            const selectedNodes = isActive
              ? (frame.nodes || []).filter((n) => effectiveSelectedIds.includes(n.id))
              : [];
            const singleSelected = selectedNodes.length === 1 ? selectedNodes[0] : null;

            // Compute combined bounding box for multi-selection
            let multiBounds = null;
            if (selectedNodes.length > 1) {
              const minX = Math.min(...selectedNodes.map((n) => n.x));
              const minY = Math.min(...selectedNodes.map((n) => n.y));
              const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
              const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height));
              multiBounds = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
              };
            }

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
                    {frame.preset || "iPhone 15"} • {frameW} × {frameH}
                  </span>
                </button>

                <div
                  data-testid={`mobile-frame-${frame.id}`}
                  ref={(el) => (frameRefs.current[frame.id] = el)}
                  onMouseDown={(e) => {
                    if (editingTextNodeId) saveEditText();
                    if (!isActive) {
                      e.stopPropagation();
                      selectFrame(frame.id);
                    } else {
                      startMarquee(e, frame);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => handleDrop(e, frame)}
                  className={`relative overflow-hidden rounded-[14px] bg-white transition-shadow ${
                    isActive ? "border-2 border-[#18181b]" : "border border-[#d4d4d8]"
                  }`}
                  style={{ width: frameW, height: frameH }}
                >
                  <div className="pointer-events-none flex h-10 items-center justify-between px-6 text-[12px] font-semibold text-[#18181b]">
                    <span>9:41</span>
                    <span className="tracking-widest text-[#a1a1aa]">• • •</span>
                  </div>

                  {/* Safe Area Guide Overlay */}
                  {frame.safeArea && frame.safeArea.visible !== false && (
                    <div
                      data-testid={`safe-area-guide-${frame.id}`}
                      className="pointer-events-none absolute inset-0 z-10"
                    >
                      {frame.safeArea.top > 0 && (
                        <div
                          data-testid={`safe-area-top-${frame.id}`}
                          className="absolute left-0 right-0 border-b border-dashed border-zinc-400/40 bg-zinc-900/5"
                          style={{ top: 0, height: frame.safeArea.top }}
                        >
                          <span className="absolute bottom-0.5 right-2 text-[9px] font-mono text-zinc-500">
                            Safe Top {frame.safeArea.top}px
                          </span>
                        </div>
                      )}
                      {frame.safeArea.bottom > 0 && (
                        <div
                          data-testid={`safe-area-bottom-${frame.id}`}
                          className="absolute left-0 right-0 border-t border-dashed border-zinc-400/40 bg-zinc-900/5"
                          style={{ bottom: 0, height: frame.safeArea.bottom }}
                        >
                          <span className="absolute top-0.5 right-2 text-[9px] font-mono text-zinc-500">
                            Safe Bottom {frame.safeArea.bottom}px
                          </span>
                        </div>
                      )}
                      {frame.safeArea.left > 0 && (
                        <div
                          data-testid={`safe-area-left-${frame.id}`}
                          className="absolute top-0 bottom-0 border-r border-dashed border-zinc-400/40 bg-zinc-900/5"
                          style={{ left: 0, width: frame.safeArea.left }}
                        />
                      )}
                      {frame.safeArea.right > 0 && (
                        <div
                          data-testid={`safe-area-right-${frame.id}`}
                          className="absolute top-0 bottom-0 border-l border-dashed border-zinc-400/40 bg-zinc-900/5"
                          style={{ right: 0, width: frame.safeArea.right }}
                        />
                      )}
                    </div>
                  )}

                  {/* Render Visible Nodes */}
                  {visibleNodes.map((node) => {
                    const isNodeSelected = effectiveSelectedIds.includes(node.id);
                    return (
                      <div
                        key={node.id}
                        onMouseDown={(e) => {
                          if (editingTextNodeId && editingTextNodeId !== node.id) {
                            saveEditText();
                          }
                          if (!isActive) {
                            e.stopPropagation();
                            selectFrame(frame.id);
                            return;
                          }
                          startMove(e, node);
                        }}
                        onDoubleClick={(e) => {
                          if (node.type === "text" && !node.locked) {
                            e.stopPropagation();
                            setEditingTextNodeId(node.id);
                            setEditingTextValue(node.text || "");
                          }
                        }}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          cursor: node.locked ? "default" : isActive ? "move" : "default",
                          pointerEvents: node.locked ? "none" : "auto",
                        }}
                      >
                        <div
                          data-testid={`canvas-node-${node.id}`}
                          style={{ visibility: editingTextNodeId === node.id ? "hidden" : "visible" }}
                        >
                          <NodeView node={node} components={components} allNodes={frame.nodes || []} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Text Editor Overlay */}
                  {editingTextNodeId && (() => {
                    const editNode = visibleNodes.find((n) => n.id === editingTextNodeId);
                    if (!editNode) return null;
                    return (
                      <textarea
                        data-testid={`inline-text-editor-${editNode.id}`}
                        autoFocus
                        ref={(el) => {
                          if (el) {
                            el.focus();
                            el.select();
                          }
                        }}
                        value={editingTextValue}
                        onChange={(e) => setEditingTextValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (!e.shiftKey) {
                              e.preventDefault();
                              saveEditText();
                            }
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditText();
                          }
                        }}
                        onBlur={saveEditText}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          left: editNode.x,
                          top: editNode.y,
                          width: Math.max(editNode.width, 120),
                          minHeight: Math.max(editNode.height, 32),
                          fontFamily: editNode.style?.fontFamily || "inherit",
                          fontSize: editNode.style?.fontSize || 14,
                          fontWeight: editNode.style?.fontWeight || 400,
                          lineHeight: editNode.style?.lineHeight !== undefined ? editNode.style.lineHeight : 1.2,
                          letterSpacing: editNode.style?.letterSpacing ? `${editNode.style.letterSpacing}px` : undefined,
                          textAlign: editNode.style?.textAlign || editNode.style?.align || "left",
                          color: editNode.style?.color || "#18181b",
                          background: "#ffffff",
                          border: "2px solid #2563eb",
                          borderRadius: 4,
                          padding: "2px 6px",
                          outline: "none",
                          resize: "both",
                          zIndex: 60,
                          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                        }}
                      />
                    );
                  })()}

                  {/* Single Selection Outline with Handles */}
                  {singleSelected && (
                    <div
                      data-testid="selection-outline"
                      className="pointer-events-none absolute"
                      style={{
                        left: singleSelected.x,
                        top: singleSelected.y,
                        width: singleSelected.width,
                        height: singleSelected.height,
                        outline: "1.5px solid #2563eb",
                        outlineOffset: 0,
                      }}
                    >
                      {HANDLES.map((h) => (
                        <div
                          key={h}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            startResize(e, singleSelected, h);
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
                      <div
                        className="absolute -top-5 left-0 rounded-[3px] bg-[#2563eb] px-1.5 text-[10px] font-medium text-white"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {singleSelected.name}
                      </div>
                    </div>
                  )}

                  {/* Multi-Selection Individual Sub-Outlines and Combined Bounding Box */}
                  {multiBounds && (
                    <>
                      {selectedNodes.map((sn) => (
                        <div
                          key={sn.id}
                          data-testid={`selection-sub-outline-${sn.id}`}
                          className="pointer-events-none absolute"
                          style={{
                            left: sn.x,
                            top: sn.y,
                            width: sn.width,
                            height: sn.height,
                            outline: "1px dashed #2563eb",
                            outlineOffset: 0,
                          }}
                        />
                      ))}
                      <div
                        data-testid="multi-selection-outline"
                        className="pointer-events-none absolute"
                        style={{
                          left: multiBounds.x,
                          top: multiBounds.y,
                          width: multiBounds.width,
                          height: multiBounds.height,
                          outline: "1.5px solid #2563eb",
                          outlineOffset: 0,
                        }}
                      >
                        <div
                          className="absolute -top-5 left-0 rounded-[3px] bg-[#2563eb] px-1.5 text-[10px] font-medium text-white shadow-sm"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {selectedNodes.length} selected
                        </div>
                      </div>
                    </>
                  )}

                  {/* Active Marquee Drag Box */}
                  {marquee && marquee.frameId === frame.id && (
                    <div
                      data-testid="marquee-selection-box"
                      className="pointer-events-none absolute z-30 border border-dashed border-[#2563eb] bg-[#2563eb]/10"
                      style={{
                        left: Math.min(marquee.startX, marquee.currX),
                        top: Math.min(marquee.startY, marquee.currY),
                        width: Math.abs(marquee.currX - marquee.startX),
                        height: Math.abs(marquee.currY - marquee.startY),
                      }}
                    />
                  )}

                  {/* Snapping Guides */}
                  {isActive &&
                    guides.map((g, idx) => (
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
