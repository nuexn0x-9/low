import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getProject,
  saveProject,
  defaultFrames,
  frameFromTemplate,
  blankFrame,
  exportProjectJSON,
  parseImportJSON,
  newId,
  loadProjectAsync,
  getCurrentRevision,
  setCurrentRevision,
  DEFAULT_DESIGN_TOKENS,
  STYLE_PRESETS,
  FRAME_PRESETS,
  getFramePreset,
} from "@/data/storage";
import {
  createAgentSession,
  getAgentEvents,
  postAgentAction,
  revokeAgentSession,
  undoLastAgentAction,
  undoAgentEvent,
  AGENT_BASE_URL,
} from "@/data/agentApi";

import { applyAiImport } from "@/data/aiApi";
import { generateFrameSvg, downloadSvg, downloadPngFromSvg } from "@/utils/exportUtils";
import TopToolbar from "@/components/editor/TopToolbar";
import LeftSidebar from "@/components/editor/LeftSidebar";
import CanvasArea from "@/components/editor/CanvasArea";
import RightPropertiesPanel from "@/components/editor/RightPropertiesPanel";
import BottomStatusBar from "@/components/editor/BottomStatusBar";
import PreviewModal from "@/components/editor/PreviewModal";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";

let counter = 0;
const uid = (t) => `${t}_${Date.now().toString(36)}_${counter++}`;

const nodeTemplates = {
  rectangle: {
    type: "rectangle",
    name: "Rectangle",
    width: 160,
    height: 100,
    text: "",
    style: { fill: "#e4e4e7", stroke: "#d4d4d8", strokeWidth: 1, radius: 8, opacity: 100 },
  },
  text: {
    type: "text",
    name: "Text",
    width: 180,
    height: 28,
    text: "Text",
    style: { color: "#18181b", fontSize: 16, fontWeight: 500, align: "left", opacity: 100 },
  },
  image: {
    type: "image",
    name: "Image",
    width: 160,
    height: 120,
    text: "",
    style: { fill: "#f4f4f5", stroke: "#d4d4d8", strokeWidth: 1, radius: 8, opacity: 100 },
  },
  component: {
    type: "component",
    name: "Component",
    width: 200,
    height: 56,
    text: "Component",
    style: { fill: "#ffffff", stroke: "#18181b", strokeWidth: 1, radius: 8, color: "#18181b", fontSize: 13, fontWeight: 600, align: "center", opacity: 100 },
  },
  autoLayout: {
    type: "autoLayout",
    name: "Auto Layout",
    width: 342,
    height: 180,
    layout: {
      direction: "vertical",
      gap: 12,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      align: "stretch",
      justify: "start",
      wrap: false,
    },
    children: [],
    style: { fill: "transparent", stroke: "transparent" },
  },
  scrollArea: {
    type: "scrollArea",
    name: "Scroll Area",
    width: 342,
    height: 300,
    scroll: {
      direction: "vertical",
      contentHeight: 800,
      contentWidth: 342,
      showIndicator: true,
    },
    children: [],
    style: { fill: "transparent", stroke: "transparent" },
  },
};

const componentSpecs = {
  c_button: { type: "button", name: "Button", width: 200, height: 48, text: "Button", style: { fill: "#18181b", radius: 10, color: "#ffffff", fontSize: 15, fontWeight: 600, align: "center", opacity: 100 } },
  c_input: { type: "input", name: "Input", width: 240, height: 48, text: "Placeholder", style: { fill: "#ffffff", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#a1a1aa", fontSize: 14, opacity: 100 } },
  c_card: { type: "rectangle", name: "Card", width: 240, height: 120, text: "", style: { fill: "#f4f4f5", stroke: "#e4e4e7", strokeWidth: 1, radius: 12, opacity: 100 } },
  c_nav: { type: "bottomnav", name: "Bottom Navigation", width: 390, height: 64, text: "", style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, opacity: 100 } },
  c_sheet: { type: "rectangle", name: "Bottom Sheet", width: 342, height: 220, text: "", style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 16, opacity: 100 } },
  c_appbar: { type: "rectangle", name: "App Bar", width: 390, height: 56, text: "", style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 0, opacity: 100 } },
};

export default function EditorShell() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project] = useState(() => getProject(id));
  const initialFrames =
    project && project.frames && project.frames.length ? project.frames : defaultFrames();

  const [hist, setHist] = useState(() => ({ past: [], present: initialFrames, future: [] }));
  const frames = hist.present;

  const [activeFrameId, setActiveFrameId] = useState(() => initialFrames[0]?.id);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = (nid) => setSelectedIds(nid ? [nid] : []);

  const [activeTool, setActiveTool] = useState("select");
  const [mode, setMode] = useState("design");
  const [zoom, setZoom] = useState(0.7);
  const [sidebarTab, setSidebarTab] = useState("layers");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  const [designTokens, setDesignTokens] = useState(project?.designTokens || DEFAULT_DESIGN_TOKENS);
  const [components, setComponents] = useState(project?.components || []);
  const designTokensRef = useRef(designTokens);
  const componentsRef = useRef(components);

  useEffect(() => {
    designTokensRef.current = designTokens;
  }, [designTokens]);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  const [agentSession, setAgentSession] = useState(null);
  const [agentConnecting, setAgentConnecting] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]);
  const [agentPreset, setAgentPreset] = useState("full_editor_assistant");
  const [agentDryRun, setAgentDryRun] = useState(false);
  const agentSeqRef = useRef(0);

  const saveTimer = useRef(null);
  const coalesceTimer = useRef(null);
  const pendingSnap = useRef(null);
  const dragSnap = useRef(null);
  const framesRef = useRef(frames);
  const clipboardRef = useRef(null); // { type: "nodes" | "node" | "frame", data: any }
  const fileInputRef = useRef(null);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    if (!project) navigate("/");
  }, [project, navigate]);

  useEffect(() => {
    loadProjectAsync(id).then((serverProj) => {
      if (serverProj) {
        if (serverProj.frames && serverProj.frames.length) {
          setPresent(serverProj.frames);
        }
        if (serverProj.designTokens) {
          setDesignTokens(serverProj.designTokens);
        }
        if (serverProj.components) {
          setComponents(serverProj.components);
        }
      }
    });
  }, [id]);

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      clearTimeout(coalesceTimer.current);
    },
    []
  );

  const scheduleSave = () => {
    setSaveStatus("Syncing");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(
        {
          ...project,
          frames: framesRef.current,
          designTokens: designTokensRef.current,
          components: componentsRef.current,
        },
        (status) => {
          setSaveStatus(status);
        }
      );
    }, 600);
  };

  // ----- history primitives -----
  const setPresent = (updater) =>
    setHist((h) => ({
      ...h,
      present: typeof updater === "function" ? updater(h.present) : updater,
    }));

  const commit = (updater) => {
    setHist((h) => {
      const next = typeof updater === "function" ? updater(h.present) : updater;
      return { past: [...h.past, h.present].slice(-60), present: next, future: [] };
    });
    scheduleSave();
  };

  const commitCoalesced = (updater) => {
    setHist((h) => {
      const next = typeof updater === "function" ? updater(h.present) : updater;
      if (pendingSnap.current === null) pendingSnap.current = h.present;
      return { ...h, present: next, future: [] };
    });
    clearTimeout(coalesceTimer.current);
    coalesceTimer.current = setTimeout(() => {
      const snap = pendingSnap.current;
      pendingSnap.current = null;
      if (snap) setHist((h) => ({ past: [...h.past, snap].slice(-60), present: h.present, future: [] }));
    }, 500);
    scheduleSave();
  };

  const undo = () => {
    setHist((h) => {
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    });
    setSelectedIds([]);
    scheduleSave();
  };

  const redo = () => {
    setHist((h) => {
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    });
    setSelectedIds([]);
    scheduleSave();
  };

  // ----- active frame helpers -----
  const mapActive = (fn) => (fr) =>
    fr.map((f) => (f.id === activeFrameId ? { ...f, nodes: fn(f.nodes) } : f));

  const applyPatch = (n, patch) => {
    const next = { ...n, ...patch };
    if (patch.style) next.style = { ...n.style, ...patch.style };
    if (patch.prototype) next.prototype = { ...n.prototype, ...patch.prototype };
    return next;
  };

  const updateNode = (nid, patch) =>
    commitCoalesced(mapActive((nodes) => nodes.map((n) => (n.id === nid ? applyPatch(n, patch) : n))));

  const updateNodeLive = (nid, patch) =>
    setPresent(mapActive((nodes) => nodes.map((n) => (n.id === nid ? applyPatch(n, patch) : n))));

  const beginTransaction = () => {
    dragSnap.current = framesRef.current;
  };
  const endTransaction = () => {
    const snap = dragSnap.current;
    dragSnap.current = null;
    if (snap && snap !== framesRef.current) {
      setHist((h) => ({ past: [...h.past, snap].slice(-60), present: h.present, future: [] }));
      scheduleSave();
    }
  };

  const addNode = (kind) => {
    const tpl = nodeTemplates[kind];
    if (!tpl) return;
    const node = {
      ...tpl,
      id: uid(kind),
      x: Math.round(195 - tpl.width / 2),
      y: 360,
      style: { ...tpl.style },
      layout: tpl.layout ? JSON.parse(JSON.stringify(tpl.layout)) : undefined,
      scroll: tpl.scroll ? JSON.parse(JSON.stringify(tpl.scroll)) : undefined,
      children: tpl.children ? [...tpl.children] : undefined,
    };
    commit(mapActive((nodes) => [...nodes, node]));
    setSelectedIds([node.id]);
    setActiveTool("select");
  };

  const deleteNode = (nid) => {
    commit(mapActive((nodes) => nodes.filter((n) => n.id !== nid)));
    setSelectedIds((prev) => prev.filter((id) => id !== nid));
  };

  const deleteSelected = (idsToDelete = selectedIds) => {
    if (!idsToDelete || !idsToDelete.length) return;
    commit(mapActive((nodes) => nodes.filter((n) => !idsToDelete.includes(n.id))));
    setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    toast.success(`Deleted ${idsToDelete.length} element(s)`);
  };

  const handleToolClick = (tool) => {
    if (["rectangle", "text", "image", "component", "scrollArea"].includes(tool)) {
      addNode(tool);
      return;
    }
    if (tool === "autoLayout") {
      if (selectedIds.length > 0) {
        createAutoLayoutFromSelection();
      } else {
        addNode("autoLayout");
      }
      return;
    }
    setActiveTool(tool);
  };

  // ----- frames -----
  const selectFrame = (fid) => {
    setActiveFrameId(fid);
    setSelectedIds([]);
  };

  const renameFrame = (fid, newName) => {
    if (!newName || !newName.trim()) return;
    commit((fr) => fr.map((f) => (f.id === fid ? { ...f, name: newName.trim() } : f)));
  };

  const addScreen = () => {
    const f = blankFrame(`Screen ${frames.length + 1}`);
    commit((fr) => [...fr, f]);
    setActiveFrameId(f.id);
    setSelectedIds([]);
    toast.success(`Added "${f.name}"`);
  };

  const duplicateFrame = (fid) => {
    const target = frames.find((f) => f.id === fid);
    if (!target) return;
    const cloned = {
      ...target,
      id: newId("frame"),
      name: `${target.name} Copy`,
      nodes: target.nodes.map((n) => ({
        ...n,
        id: uid(n.type || "node"),
        x: n.x,
        y: n.y,
        style: { ...n.style },
        prototype: n.prototype ? { ...n.prototype } : undefined,
      })),
    };
    commit((fr) => [...fr, cloned]);
    setActiveFrameId(cloned.id);
    setSelectedIds([]);
    toast.success(`Duplicated "${target.name}"`);
  };

  const deleteFrame = (fid) => {
    if (frames.length <= 1) {
      toast.error("A project needs at least one screen");
      return;
    }
    const remaining = frames.filter((f) => f.id !== fid);
    commit(() => remaining);
    if (activeFrameId === fid) setActiveFrameId(remaining[0].id);
    setSelectedIds([]);
  };

  const changeFramePreset = (fid, presetKey) => {
    const preset = getFramePreset(presetKey);
    if (!preset) return;
    commit((fr) =>
      fr.map((f) => {
        if (f.id !== fid) return f;
        const oldW = f.width || 390;
        const oldH = f.height || 844;
        const newW = preset.width;
        const newH = preset.height;
        const dw = newW - oldW;
        const dh = newH - oldH;

        const updatedNodes = (f.nodes || []).map((node) => {
          if (node.parentId) return node;
          const hConstraint = node.constraints?.horizontal || "left";
          const vConstraint = node.constraints?.vertical || "top";

          let newX = node.x;
          let newY = node.y;
          let newWidth = node.width;
          let newHeight = node.height;

          if (hConstraint === "right") {
            newX = node.x + dw;
          } else if (hConstraint === "left-right") {
            newWidth = Math.max(20, node.width + dw);
          } else if (hConstraint === "center") {
            newX = Math.round(node.x + dw / 2);
          } else if (hConstraint === "scale") {
            const scaleX = newW / oldW;
            newX = Math.round(node.x * scaleX);
            newWidth = Math.max(10, Math.round(node.width * scaleX));
          }

          if (vConstraint === "bottom") {
            newY = node.y + dh;
          } else if (vConstraint === "top-bottom") {
            newHeight = Math.max(20, node.height + dh);
          } else if (vConstraint === "center") {
            newY = Math.round(node.y + dh / 2);
          } else if (vConstraint === "scale") {
            const scaleY = newH / oldH;
            newY = Math.round(node.y * scaleY);
            newHeight = Math.max(10, Math.round(node.height * scaleY));
          }

          return {
            ...node,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          };
        });

        return {
          ...f,
          preset: presetKey,
          width: newW,
          height: newH,
          safeArea: {
            top: preset.safeArea?.top ?? (f.safeArea?.top || 47),
            bottom: preset.safeArea?.bottom ?? (f.safeArea?.bottom || 34),
            left: preset.safeArea?.left ?? (f.safeArea?.left || 0),
            right: preset.safeArea?.right ?? (f.safeArea?.right || 0),
            visible: f.safeArea?.visible !== undefined ? f.safeArea.visible : true,
          },
          nodes: updatedNodes,
        };
      })
    );
    toast.success(`Changed screen to ${preset.name}`);
  };

  const updateFrameDimensions = (fid, width, height) => {
    commit((fr) =>
      fr.map((f) => {
        if (f.id !== fid) return f;
        return {
          ...f,
          preset: "custom",
          width: Math.max(100, width),
          height: Math.max(100, height),
        };
      })
    );
  };

  const updateSafeArea = (fid, safeAreaPatch) => {
    commit((fr) =>
      fr.map((f) => {
        if (f.id !== fid) return f;
        return {
          ...f,
          safeArea: {
            ...(f.safeArea || { top: 47, bottom: 34, left: 0, right: 0, visible: true }),
            ...safeAreaPatch,
          },
        };
      })
    );
  };

  // ----- Auto Layout -----
  const createAutoLayoutFromSelection = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const matched = nodes.filter((n) => selectedIds.includes(n.id));

    if (matched.length === 0) {
      const autoId = uid("auto");
      const autoNode = {
        id: autoId,
        type: "autoLayout",
        name: "Auto Layout",
        x: 24,
        y: 120,
        width: 342,
        height: 180,
        layout: {
          direction: "vertical",
          gap: 12,
          padding: { top: 16, right: 16, bottom: 16, left: 16 },
          align: "stretch",
          justify: "start",
          wrap: false,
        },
        children: [],
        style: { fill: "transparent", stroke: "transparent" },
      };
      commit(mapActive((currNodes) => [...currNodes, autoNode]));
      setSelectedIds([autoId]);
      toast.success("Created Auto Layout");
      return;
    }

    const minX = Math.min(...matched.map((n) => n.x));
    const minY = Math.min(...matched.map((n) => n.y));
    const maxX = Math.max(...matched.map((n) => n.x + n.width));
    const maxY = Math.max(...matched.map((n) => n.y + n.height));

    const autoId = uid("auto");
    const childIds = matched.map((n) => n.id);

    const autoNode = {
      id: autoId,
      type: "autoLayout",
      name: "Auto Layout",
      x: minX,
      y: minY,
      width: Math.max(100, maxX - minX),
      height: Math.max(60, maxY - minY),
      layout: {
        direction: "vertical",
        gap: 12,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        align: "stretch",
        justify: "start",
        wrap: false,
      },
      children: childIds,
      style: { fill: "transparent", stroke: "transparent" },
    };

    commit(
      mapActive((currNodes) => {
        const firstIdx = Math.min(...matched.map((n) => currNodes.indexOf(n)));
        const updatedNodes = currNodes.map((n) =>
          childIds.includes(n.id)
            ? {
                ...n,
                parentId: autoId,
                layoutSizing: n.layoutSizing || { width: "fill", height: "fixed" },
              }
            : n
        );
        updatedNodes.splice(firstIdx, 0, autoNode);
        return updatedNodes;
      })
    );
    setSelectedIds([autoId]);
    toast.success("Created Auto Layout");
  };

  // ----- Group & Ungroup -----
  const groupSelected = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const toGroup = nodes.filter((n) => selectedIds.includes(n.id));
    if (toGroup.length < 2) {
      toast.message("Select at least 2 elements to group");
      return;
    }
    const minX = Math.min(...toGroup.map((n) => n.x));
    const minY = Math.min(...toGroup.map((n) => n.y));
    const maxX = Math.max(...toGroup.map((n) => n.x + n.width));
    const maxY = Math.max(...toGroup.map((n) => n.y + n.height));

    const groupId = uid("group");
    const groupNode = {
      id: groupId,
      type: "group",
      name: "Group",
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      children: toGroup.map((n) => n.id),
      style: {},
    };

    commit(
      mapActive((currNodes) => {
        const firstIdx = Math.min(...toGroup.map((n) => currNodes.indexOf(n)));
        const nextNodes = [...currNodes];
        nextNodes.splice(firstIdx, 0, groupNode);
        return nextNodes;
      })
    );
    setSelectedIds([groupId]);
    toast.success("Grouped elements");
  };

  const ungroupSelected = (targetGroupId) => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const gId =
      targetGroupId ||
      selectedIds.find((id) => {
        const n = nodes.find((node) => node.id === id);
        return n && (n.type === "group" || n.type === "autoLayout");
      });
    if (!gId) return;
    const groupNode = nodes.find((n) => n.id === gId && (n.type === "group" || n.type === "autoLayout"));
    if (!groupNode) return;

    commit(
      mapActive((currNodes) =>
        currNodes
          .filter((n) => n.id !== gId)
          .map((n) => (n.parentId === gId ? { ...n, parentId: undefined } : n))
      )
    );
    const released = groupNode.children || [];
    setSelectedIds(released);
    toast.success(groupNode.type === "autoLayout" ? "Unpacked Auto Layout" : "Ungrouped element");
  };

  // ----- Alignment & Distribute Spacing -----
  const alignSelected = (alignment) => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const matched = nodes.filter((n) => selectedIds.includes(n.id));
    if (matched.length === 0) return;

    if (matched.length > 1) {
      const minX = Math.min(...matched.map((n) => n.x));
      const minY = Math.min(...matched.map((n) => n.y));
      const maxX = Math.max(...matched.map((n) => n.x + n.width));
      const maxY = Math.max(...matched.map((n) => n.y + n.height));

      commit(
        mapActive((currNodes) =>
          currNodes.map((n) => {
            if (!selectedIds.includes(n.id)) return n;
            const patch = {};
            if (alignment === "left") patch.x = minX;
            else if (alignment === "center") patch.x = Math.round(minX + ((maxX - minX) - n.width) / 2);
            else if (alignment === "right") patch.x = maxX - n.width;
            else if (alignment === "top") patch.y = minY;
            else if (alignment === "middle") patch.y = Math.round(minY + ((maxY - minY) - n.height) / 2);
            else if (alignment === "bottom") patch.y = maxY - n.height;
            return { ...n, ...patch };
          })
        )
      );
    } else {
      // Single node aligned to screen
      const n = matched[0];
      const screenW = activeF.width || 390;
      const screenH = activeF.height || 844;
      const patch = {};
      if (alignment === "left") patch.x = 24;
      else if (alignment === "center") patch.x = Math.round((screenW - n.width) / 2);
      else if (alignment === "right") patch.x = screenW - n.width - 24;
      else if (alignment === "top") patch.y = 24;
      else if (alignment === "middle") patch.y = Math.round((screenH - n.height) / 2);
      else if (alignment === "bottom") patch.y = screenH - n.height - 24;
      commit(mapActive((currNodes) => currNodes.map((node) => (node.id === n.id ? { ...node, ...patch } : node))));
    }
  };

  const distributeSelected = (axis) => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const matched = nodes.filter((n) => selectedIds.includes(n.id));
    if (matched.length < 3) {
      toast.message("Select at least 3 elements to distribute spacing");
      return;
    }

    if (axis === "horizontal") {
      const sorted = [...matched].sort((a, b) => a.x - b.x);
      const firstX = sorted[0].x;
      const lastNode = sorted[sorted.length - 1];
      const lastR = lastNode.x + lastNode.width;
      const totalW = sorted.reduce((acc, n) => acc + n.width, 0);
      const available = lastR - firstX - totalW;
      const spacing = available / (sorted.length - 1);

      const positions = {};
      let currX = firstX;
      sorted.forEach((n) => {
        positions[n.id] = Math.round(currX);
        currX += n.width + spacing;
      });

      commit(
        mapActive((currNodes) =>
          currNodes.map((n) => (positions[n.id] !== undefined ? { ...n, x: positions[n.id] } : n))
        )
      );
    } else {
      const sorted = [...matched].sort((a, b) => a.y - b.y);
      const firstY = sorted[0].y;
      const lastNode = sorted[sorted.length - 1];
      const lastB = lastNode.y + lastNode.height;
      const totalH = sorted.reduce((acc, n) => acc + n.height, 0);
      const available = lastB - firstY - totalH;
      const spacing = available / (sorted.length - 1);

      const positions = {};
      let currY = firstY;
      sorted.forEach((n) => {
        positions[n.id] = Math.round(currY);
        currY += n.height + spacing;
      });

      commit(
        mapActive((currNodes) =>
          currNodes.map((n) => (positions[n.id] !== undefined ? { ...n, y: positions[n.id] } : n))
        )
      );
    }
  };

  // ----- Layer Lock, Hide, Reorder -----
  const toggleLayerLock = (nodeId) => {
    commit(
      mapActive((nodes) =>
        nodes.map((n) => (n.id === nodeId ? { ...n, locked: !n.locked } : n))
      )
    );
  };

  const toggleLayerHide = (nodeId) => {
    commit(
      mapActive((nodes) =>
        nodes.map((n) => (n.id === nodeId ? { ...n, hidden: !n.hidden } : n))
      )
    );
  };

  const reorderLayer = (nodeId, direction) => {
    if (!nodeId) return;
    commit(
      mapActive((nodes) => {
        const idx = nodes.findIndex((n) => n.id === nodeId);
        if (idx === -1) return nodes;
        const next = [...nodes];
        const [item] = next.splice(idx, 1);
        if (direction === "front") next.push(item);
        else if (direction === "back") next.unshift(item);
        else if (direction === "forward") next.splice(Math.min(next.length, idx + 1), 0, item);
        else if (direction === "backward") next.splice(Math.max(0, idx - 1), 0, item);
        return next;
      })
    );
  };

  const nudgeSelection = (dx, dy) => {
    if (!selectedIds.length) return;
    commitCoalesced(
      mapActive((nodes) =>
        nodes.map((n) =>
          selectedIds.includes(n.id)
            ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) }
            : n
        )
      )
    );
  };

  // ----- Phase 8 Component and Token Helpers -----
  const createComponentFromSelection = (name = "Component") => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const matched = nodes.filter((n) => selectedIds.includes(n.id));
    if (!matched.length) return;

    const minX = Math.min(...matched.map((n) => n.x));
    const minY = Math.min(...matched.map((n) => n.y));
    const maxR = Math.max(...matched.map((n) => n.x + n.width));
    const maxB = Math.max(...matched.map((n) => n.y + n.height));
    const compW = Math.max(1, maxR - minX);
    const compH = Math.max(1, maxB - minY);

    const compId = uid("comp");
    const clonedNodes = matched.map((n) => ({
      ...n,
      x: n.x - minX,
      y: n.y - minY,
    }));

    const compName = name && name.trim() ? name.trim() : `Component ${components.length + 1}`;
    const newComp = {
      id: compId,
      name: compName,
      category: "custom",
      width: compW,
      height: compH,
      nodes: clonedNodes,
    };

    setComponents((prev) => [...prev, newComp]);

    // Replace selected nodes in active frame with componentInstance
    const instanceNode = {
      id: uid("instance"),
      type: "componentInstance",
      componentId: compId,
      name: `${compName} Instance`,
      x: minX,
      y: minY,
      width: compW,
      height: compH,
      overrides: {},
      style: {},
    };

    commit(
      mapActive((allNodes) => {
        const remaining = allNodes.filter((n) => !selectedIds.includes(n.id));
        return [...remaining, instanceNode];
      })
    );
    setSelectedIds([instanceNode.id]);
    toast.success(`Created component "${compName}"`);
  };

  const insertComponentInstance = (compId) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;

    const instanceNode = {
      id: uid("instance"),
      type: "componentInstance",
      componentId: compId,
      name: `${comp.name} Instance`,
      x: 30,
      y: 120,
      width: comp.width || 200,
      height: comp.height || 48,
      overrides: {},
      style: {},
    };

    commit(mapActive((nodes) => [...nodes, instanceNode]));
    setSelectedIds([instanceNode.id]);
    toast.success(`Inserted "${comp.name}" instance`);
  };

  const detachComponentInstance = (nodeId) => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const node = (activeF.nodes || []).find((n) => n.id === nodeId);
    if (!node || node.type !== "componentInstance") return;

    const comp = components.find((c) => c.id === node.componentId);
    const overrides = node.overrides || {};

    if (comp && comp.nodes && comp.nodes.length > 0) {
      const detachedNodes = comp.nodes.map((cn) => {
        const nextStyle = { ...cn.style, ...(overrides.style || {}) };
        let nextText = cn.text;
        if (overrides.text !== undefined && cn.type === "text") {
          nextText = overrides.text;
        }
        return {
          ...cn,
          id: uid(cn.type || "node"),
          x: node.x + cn.x,
          y: node.y + cn.y,
          text: nextText,
          style: nextStyle,
        };
      });

      commit(
        mapActive((allNodes) => {
          const idx = allNodes.findIndex((n) => n.id === nodeId);
          if (idx === -1) return allNodes;
          const updated = [...allNodes];
          updated.splice(idx, 1, ...detachedNodes);
          return updated;
        })
      );
      setSelectedIds(detachedNodes.map((n) => n.id));
    } else {
      const detachedNode = {
        id: uid("node"),
        type: "rectangle",
        name: `${node.name || "Component"} (Detached)`.replace(" Instance", ""),
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        text: overrides.text !== undefined ? overrides.text : node.text || "",
        style: { ...node.style, ...(overrides.style || {}) },
      };
      commit(
        mapActive((allNodes) => allNodes.map((n) => (n.id === nodeId ? detachedNode : n)))
      );
      setSelectedIds([detachedNode.id]);
    }
    toast.success("Detached component instance");
  };

  const applyTokenToSelected = (tokenType, tokenValue) => {
    if (!selectedIds.length) {
      toast.info("Select a layer to apply token");
      return;
    }
    commit(
      mapActive((nodes) =>
        nodes.map((n) => {
          if (!selectedIds.includes(n.id)) return n;
          if (tokenType === "color") {
            const nextStyle = { ...n.style };
            if (n.type === "text" || n.type === "link") {
              nextStyle.color = tokenValue;
            } else {
              nextStyle.fill = tokenValue;
            }
            return { ...n, style: nextStyle };
          }
          if (tokenType === "radius") {
            return { ...n, style: { ...n.style, radius: tokenValue } };
          }
          return n;
        })
      )
    );
    toast.success(`Applied ${tokenType} token`);
  };

  const applyStylePreset = (presetKey, targetNodeIds = selectedIds) => {
    const preset = STYLE_PRESETS[presetKey];
    if (!preset || !targetNodeIds.length) return;
    commit(
      mapActive((nodes) =>
        nodes.map((n) => {
          if (!targetNodeIds.includes(n.id)) return n;
          return { ...n, style: { ...n.style, ...preset.style } };
        })
      )
    );
    toast.success(`Applied "${preset.name}" preset`);
  };

  // ----- library drop -----
  const dropItem = (fid, payload, pos) => {
    if (!payload) return;
    if (payload.kind === "template") {
      const f = frameFromTemplate(payload.preset, payload.name);
      commit((fr) => [...fr, f]);
      setActiveFrameId(f.id);
      setSelectedIds([]);
      toast.success(`Added "${payload.name}" screen`);
      return;
    }
    // component -> node dropped into the frame
    const spec = componentSpecs[payload.id] || nodeTemplates.component;
    const node = {
      ...spec,
      id: uid("comp"),
      x: Math.max(0, Math.round((pos?.x ?? 100) - spec.width / 2)),
      y: Math.max(0, Math.round((pos?.y ?? 100) - spec.height / 2)),
      style: { ...spec.style },
    };
    commit((fr) => fr.map((f) => (f.id === fid ? { ...f, nodes: [...f.nodes, node] } : f)));
    setActiveFrameId(fid);
    setSelectedIds([node.id]);
    toast.success(`Added ${spec.name}`);
  };

  // ----- export / import -----
  const doExport = () => {
    const json = exportProjectJSON({
      ...project,
      frames: framesRef.current,
      designTokens: designTokensRef.current,
      components: componentsRef.current,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.name || "design").replace(/\s+/g, "-").toLowerCase()}.low.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported .low.json");
  };

  const exportCurrentFrameSvg = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) {
      toast.error("No active screen to export");
      return;
    }
    const svgStr = generateFrameSvg(activeF, {
      includeGuides: false,
      components: componentsRef.current,
    });
    const filename = `${activeF.name.replace(/\s+/g, "_").toLowerCase() || "screen"}.svg`;
    downloadSvg(svgStr, filename);
    toast.success(`Exported ${filename}`);
  };

  const exportCurrentFramePng = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) {
      toast.error("No active screen to export");
      return;
    }
    const svgStr = generateFrameSvg(activeF, {
      includeGuides: false,
      components: componentsRef.current,
    });
    const filename = `${activeF.name.replace(/\s+/g, "_").toLowerCase() || "screen"}.png`;
    downloadPngFromSvg(svgStr, activeF.width || 390, activeF.height || 844, filename);
    toast.success(`Exported ${filename}`);
  };

  const doImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportJSON(String(reader.result));
        commit(() => parsed);
        if (parsed.designTokens) {
          setDesignTokens(parsed.designTokens);
        }
        if (parsed.components && Array.isArray(parsed.components)) {
          setComponents(parsed.components);
        }
        setActiveFrameId(parsed[0].id);
        setSelectedIds([]);
        toast.success(`Imported ${parsed.length} screen(s)`);
      } catch (err) {
        toast.error("Invalid LOW JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleApplyAiPatch = async (documentPatch, resultType) => {
    if (!documentPatch) return;
    if (documentPatch.designTokens) {
      setDesignTokens(documentPatch.designTokens);
    }
    if (documentPatch.components && Array.isArray(documentPatch.components)) {
      setComponents(documentPatch.components);
    }
    const currentRev = getCurrentRevision();
    try {
      // 1. Attempt backend apply if online (creating automatic snapshot & checking revision)
      const res = await applyAiImport(id, resultType, documentPatch, currentRev);
      if (res && res.applied) {
        if (res.new_revision) {
          setCurrentRevision(res.new_revision);
        }
        // Load latest frames from server or patch
        if (res.document && res.document.frames) {
          commit(() => res.document.frames);
          const firstNewFrame = documentPatch.frames?.[0];
          if (firstNewFrame) {
            setActiveFrameId(firstNewFrame.id);
          }
          toast.success("AI import applied to canvas");
          return;
        }
      }
    } catch (err) {
      console.warn("Backend AI apply skipped or failed, applying locally:", err.message);
    }

    // 2. Local fallback merge
    commit((prevFrames) => {
      if (resultType === "screen" || resultType === "template" || resultType === "prototype_flow") {
        const incoming = documentPatch.frames || [];
        const existingIds = new Set(prevFrames.map((f) => f.id));
        const merged = [...prevFrames];
        for (const inf of incoming) {
          if (existingIds.has(inf.id)) {
            const idx = merged.findIndex((f) => f.id === inf.id);
            merged[idx] = inf;
          } else {
            merged.push(inf);
          }
        }
        if (incoming[0]?.id) {
          setActiveFrameId(incoming[0].id);
        }
        return merged;
      } else if (resultType === "component") {
        const compNodes = documentPatch.frames?.[0]?.nodes || [];
        if (!compNodes.length) return prevFrames;
        return prevFrames.map((f) => {
          if (f.id === activeFrameId) {
            return { ...f, nodes: [...f.nodes, ...compNodes] };
          }
          return f;
        });
      }
      return prevFrames;
    });
    toast.success("AI import applied to canvas");
  };

  // ----- agent connect -----
  const applyAgentDoc = (backendFrames) => {
    if (!Array.isArray(backendFrames) || !backendFrames.length) return;
    commit(() => backendFrames);
    setActiveFrameId((prev) => (backendFrames.some((f) => f.id === prev) ? prev : backendFrames[0].id));
  };

  const startAgent = async (preset = agentPreset) => {
    setAgentConnecting(true);
    try {
      const data = await createAgentSession(project.name, framesRef.current, preset);
      setAgentSession({
        session_id: data.session_id,
        token: data.token,
        scopes: data.scopes || [],
        preset: data.preset,
        is_revoked: data.is_revoked,
      });
      agentSeqRef.current = data.seq || 0;
      setAgentEvents([]);
      toast.success("Agent session started");
    } catch (e) {
      toast.error("Could not start agent session");
    } finally {
      setAgentConnecting(false);
    }
  };

  const stopAgent = () => {
    setAgentSession(null);
    toast.message("Agent session closed");
  };

  const revokeAgent = async () => {
    if (!agentSession) return;
    try {
      await revokeAgentSession(agentSession.session_id);
      setAgentSession((prev) => (prev ? { ...prev, is_revoked: true } : null));
      toast.error("Agent session revoked");
    } catch (e) {
      toast.error(e.message || "Failed to revoke session");
    }
  };

  const undoLastAgent = async () => {
    if (!agentSession) return;
    try {
      const res = await undoLastAgentAction(agentSession.session_id);
      if (res.frames) {
        applyAgentDoc(res.frames);
      }
      toast.success(`Undone: ${res.action || "last agent action"}`);
      const evData = await getAgentEvents(agentSession.session_id, 0);
      if (evData.events) {
        setAgentEvents(evData.events);
      }
    } catch (e) {
      toast.error(e.message || "Failed to undo action");
    }
  };

  const undoAgentEventById = async (eventId) => {
    try {
      const res = await undoAgentEvent(eventId);
      if (res.frames) {
        applyAgentDoc(res.frames);
      }
      toast.success(`Undone agent event`);
      if (agentSession) {
        const evData = await getAgentEvents(agentSession.session_id, 0);
        if (evData.events) {
          setAgentEvents(evData.events);
        }
      }
    } catch (e) {
      toast.error(e.message || "Failed to undo event");
    }
  };

  const simulateAgent = async () => {
    if (!agentSession) return;
    const fid = activeFrameId;
    const samples = [
      { action: "add_element", params: { screenId: fid, element: { type: "button", name: "Agent Button", text: "Made by Agent", x: 24, y: 620, width: 342, height: 50, style: { fill: "#18181b", radius: 10, color: "#ffffff", fontSize: 15, fontWeight: 600, align: "center", opacity: 100 } } } },
      { action: "add_element", params: { screenId: fid, element: { type: "text", name: "Agent Note", text: "Hello from your AI agent ✦", x: 24, y: 560, width: 342, height: 24, style: { color: "#71717a", fontSize: 14, fontWeight: 400, align: "left", opacity: 100 } } } },
      { action: "create_screen", params: { name: "Agent Screen" } },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    try {
      await postAgentAction(agentSession.session_id, agentSession.token, pick.action, pick.params, agentDryRun);
      if (agentDryRun) {
        toast.info(`[Dry Run Preview] ${pick.action} simulated successfully`);
      }
    } catch (e) {
      toast.error(e.message || "Agent action failed");
    }
  };

  useEffect(() => {
    if (!agentSession) return;
    let alive = true;
    const poll = async () => {
      try {
        const data = await getAgentEvents(agentSession.session_id, agentSeqRef.current);
        if (!alive) return;
        if (data.seq > agentSeqRef.current) {
          agentSeqRef.current = data.seq;
          applyAgentDoc(data.frames);
          setAgentEvents((prev) => {
            const map = new Map([...prev, ...(data.events || [])].map((e) => [e.seq, e]));
            return Array.from(map.values()).sort((a, b) => a.seq - b.seq).slice(-30);
          });
          const last = (data.events || [])[(data.events || []).length - 1];
          toast.success(`Agent: ${last ? last.action : "updated design"}`);
        }
      } catch (e) {
        /* ignore transient poll errors */
      }
    };
    const iv = setInterval(poll, 1500);
    poll();
    return () => {
      alive = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSession, activeFrameId]);

  // ----- keyboard & clipboard -----
  const copySelection = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const selectedList = nodes.filter((n) => selectedIds.includes(n.id));

    if (selectedList.length > 0) {
      clipboardRef.current = {
        type: "nodes",
        data: JSON.parse(JSON.stringify(selectedList)),
      };
      toast.success(`Copied ${selectedList.length} element(s)`);
    } else if (activeFrameId) {
      clipboardRef.current = {
        type: "frame",
        data: JSON.parse(JSON.stringify(activeF)),
      };
      toast.success(`Copied screen "${activeF.name}"`);
    }
  };

  const pasteSelection = () => {
    const item = clipboardRef.current;
    if (!item) return;

    if (item.type === "nodes" || item.type === "node") {
      const rawList = item.type === "nodes" ? item.data : [item.data];
      if (!rawList.length) return;

      const idMap = {};
      rawList.forEach((n) => {
        idMap[n.id] = uid(n.type || "node");
      });

      const newNodes = rawList.map((source) => {
        const cloned = {
          ...source,
          id: idMap[source.id],
          name: `${source.name} Copy`,
          x: (source.x || 0) + 20,
          y: (source.y || 0) + 20,
          style: { ...source.style },
          prototype: source.prototype ? { ...source.prototype } : undefined,
        };
        if (source.type === "group" && Array.isArray(source.children)) {
          cloned.children = source.children.map((cid) => idMap[cid] || cid);
        }
        return cloned;
      });

      commit(mapActive((nodes) => [...nodes, ...newNodes]));
      setSelectedIds(newNodes.map((n) => n.id));
      clipboardRef.current = { type: "nodes", data: newNodes };
      toast.success(`Pasted ${newNodes.length} element(s)`);
    } else if (item.type === "frame") {
      const source = item.data;
      const newF = {
        ...source,
        id: newId("frame"),
        name: `${source.name} Copy`,
        nodes: (source.nodes || []).map((n) => ({
          ...n,
          id: uid(n.type || "node"),
          style: { ...n.style },
          prototype: n.prototype ? { ...n.prototype } : undefined,
        })),
      };
      commit((fr) => [...fr, newF]);
      setActiveFrameId(newF.id);
      setSelectedIds([]);
      toast.success(`Pasted screen "${newF.name}"`);
    }
  };

  const duplicateSelection = () => {
    const activeF = framesRef.current.find((f) => f.id === activeFrameId);
    if (!activeF) return;
    const nodes = activeF.nodes || [];
    const selectedList = nodes.filter((n) => selectedIds.includes(n.id));

    if (selectedList.length > 0) {
      const idMap = {};
      selectedList.forEach((n) => {
        idMap[n.id] = uid(n.type || "node");
      });

      const newNodes = selectedList.map((n) => {
        const cloned = {
          ...n,
          id: idMap[n.id],
          name: `${n.name} Copy`,
          x: (n.x || 0) + 16,
          y: (n.y || 0) + 16,
          style: { ...n.style },
          prototype: n.prototype ? { ...n.prototype } : undefined,
        };
        if (n.type === "group" && Array.isArray(n.children)) {
          cloned.children = n.children.map((cid) => idMap[cid] || cid);
        }
        return cloned;
      });

      commit(mapActive((curr) => [...curr, ...newNodes]));
      setSelectedIds(newNodes.map((n) => n.id));
      toast.success(`Duplicated ${newNodes.length} element(s)`);
    } else if (activeFrameId) {
      duplicateFrame(activeFrameId);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "select" || tag === "textarea" || e.target.isContentEditable;
      if (typing) return;

      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        createAutoLayoutFromSelection();
      } else if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
      } else if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteSelection();
      } else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
      } else if (meta && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
      } else if (meta && (e.key === "]" || e.key === "}")) {
        e.preventDefault();
        if (selectedIds[0]) reorderLayer(selectedIds[0], e.shiftKey ? "front" : "forward");
      } else if (meta && (e.key === "[" || e.key === "{")) {
        e.preventDefault();
        if (selectedIds[0]) reorderLayer(selectedIds[0], e.shiftKey ? "back" : "backward");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          nudgeSelection(dx, dy);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, activeFrameId]);

  if (!project) return null;

  const activeFrame = frames.find((f) => f.id === activeFrameId) || frames[0];
  const activeNodes = activeFrame ? activeFrame.nodes : [];
  const selectedNodes = activeNodes.filter((n) => selectedIds.includes(n.id));
  const selected = selectedNodes.length === 1 ? selectedNodes[0] : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f4f5] text-[#18181b]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          doImportFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <TopToolbar
        activeTool={activeTool}
        onToolClick={handleToolClick}
        mode={mode}
        setMode={setMode}
        onPreview={() => setPreviewOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onExit={() => navigate("/")}
        projectName={project.name}
        onUndo={undo}
        onRedo={redo}
        canUndo={hist.past.length > 0}
        canRedo={hist.future.length > 0}
        activeFrame={activeFrame}
        onChangeFramePreset={(presetKey) => changeFramePreset(activeFrameId, presetKey)}
        onToggleSafeArea={() =>
          updateSafeArea(activeFrameId, {
            visible: activeFrame?.safeArea?.visible === false,
          })
        }
        onExportFrameSvg={exportCurrentFrameSvg}
        onExportFramePng={exportCurrentFramePng}
      />

      <div className="flex min-h-0 flex-1">
        <LeftSidebar
          tab={sidebarTab}
          setTab={setSidebarTab}
          frames={frames}
          activeFrameId={activeFrameId}
          selectFrame={selectFrame}
          addScreen={addScreen}
          deleteFrame={deleteFrame}
          onRenameFrame={renameFrame}
          nodes={activeNodes}
          selectedId={selectedId}
          selectedIds={selectedIds}
          setSelectedId={setSelectedId}
          setSelectedIds={setSelectedIds}
          onToggleLock={toggleLayerLock}
          onToggleHide={toggleLayerHide}
          onExport={doExport}
          onImportClick={() => fileInputRef.current?.click()}
          onImportFile={doImportFile}
          projectId={id}
          onApplyAiPatch={handleApplyAiPatch}
          agent={{
            session: agentSession,
            baseUrl: AGENT_BASE_URL,
            connecting: agentConnecting,
            events: agentEvents,
            onStart: startAgent,
            onStop: stopAgent,
            onRevoke: revokeAgent,
            onSimulate: simulateAgent,
            onUndoLast: undoLastAgent,
            onUndoEvent: undoAgentEventById,
            dryRunMode: agentDryRun,
            setDryRunMode: setAgentDryRun,
            selectedPreset: agentPreset,
            setSelectedPreset: setAgentPreset,
          }}
          components={components}
          onCreateComponentFromSelection={createComponentFromSelection}
          onInsertComponentInstance={insertComponentInstance}
          designTokens={designTokens}
          onUpdateDesignTokens={(toks) => {
            setDesignTokens(toks);
            scheduleSave();
          }}
          onApplyTokenToSelected={applyTokenToSelected}
        />
        <CanvasArea
          frames={frames}
          activeFrameId={activeFrameId}
          selectFrame={selectFrame}
          selectedId={selectedId}
          selectedIds={selectedIds}
          setSelectedId={setSelectedId}
          setSelectedIds={setSelectedIds}
          updateNodeLive={updateNodeLive}
          beginTransaction={beginTransaction}
          endTransaction={endTransaction}
          onDropItem={dropItem}
          zoom={zoom}
          mode={mode}
          snappingEnabled={snappingEnabled}
          components={components}
          onCommitNodeText={(nid, text) => updateNode(nid, { text })}
        />
        <RightPropertiesPanel
          node={selected}
          selectedNodes={selectedNodes}
          updateNode={updateNode}
          deleteNode={deleteNode}
          deleteNodes={deleteSelected}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onAlign={alignSelected}
          onDistribute={distributeSelected}
          onDetachInstance={detachComponentInstance}
          onApplyPreset={applyStylePreset}
          designTokens={designTokens}
          mode={mode}
          frames={frames}
          activeFrame={activeFrame}
          onChangeFramePreset={(presetKey) => changeFramePreset(activeFrameId, presetKey)}
          onChangeFrameDimensions={(w, h) => updateFrameDimensions(activeFrameId, w, h)}
          onUpdateSafeArea={(patch) => updateSafeArea(activeFrameId, patch)}
          onCreateAutoLayout={createAutoLayoutFromSelection}
          onExportPrototypeZip={() => {
            window.open(`/api/projects/${id}/export/prototype.zip`, "_blank");
          }}
        />
      </div>

      <BottomStatusBar
        zoom={zoom}
        setZoom={setZoom}
        saveStatus={saveStatus}
        docName={project.name}
        nodeCount={activeNodes.length}
        frameName={activeFrame?.name}
        frameCount={frames.length}
        snappingEnabled={snappingEnabled}
        onToggleSnapping={() => setSnappingEnabled((prev) => !prev)}
      />

      {previewOpen && (
        <PreviewModal
          frames={frames}
          startFrameId={activeFrameId}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {shortcutsOpen && (
        <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
