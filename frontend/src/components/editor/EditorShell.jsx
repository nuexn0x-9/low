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
import TopToolbar from "@/components/editor/TopToolbar";
import LeftSidebar from "@/components/editor/LeftSidebar";
import CanvasArea from "@/components/editor/CanvasArea";
import RightPropertiesPanel from "@/components/editor/RightPropertiesPanel";
import BottomStatusBar from "@/components/editor/BottomStatusBar";
import PreviewModal from "@/components/editor/PreviewModal";

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
  const [selectedId, setSelectedId] = useState(null);
  const [activeTool, setActiveTool] = useState("select");
  const [mode, setMode] = useState("design");
  const [zoom, setZoom] = useState(0.7);
  const [sidebarTab, setSidebarTab] = useState("layers");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [snappingEnabled, setSnappingEnabled] = useState(true);

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
  const clipboardRef = useRef(null); // { type: "node" | "frame", data: any }
  const fileInputRef = useRef(null);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    if (!project) navigate("/");
  }, [project, navigate]);

  useEffect(() => {
    loadProjectAsync(id).then((serverProj) => {
      if (serverProj && serverProj.frames && serverProj.frames.length) {
        setPresent(serverProj.frames);
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
      saveProject({ ...project, frames: framesRef.current }, (status) => {
        setSaveStatus(status);
      });
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
    setSelectedId(null);
    scheduleSave();
  };

  const redo = () => {
    setHist((h) => {
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    });
    setSelectedId(null);
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
    const node = { ...tpl, id: uid(kind), x: Math.round(195 - tpl.width / 2), y: 360, style: { ...tpl.style } };
    commit(mapActive((nodes) => [...nodes, node]));
    setSelectedId(node.id);
    setActiveTool("select");
  };

  const deleteNode = (nid) => {
    commit(mapActive((nodes) => nodes.filter((n) => n.id !== nid)));
    setSelectedId(null);
  };

  const handleToolClick = (tool) => {
    if (["rectangle", "text", "image", "component"].includes(tool)) {
      addNode(tool);
      return;
    }
    setActiveTool(tool);
  };

  // ----- frames -----
  const selectFrame = (fid) => {
    setActiveFrameId(fid);
    setSelectedId(null);
  };

  const renameFrame = (fid, newName) => {
    if (!newName || !newName.trim()) return;
    commit((fr) => fr.map((f) => (f.id === fid ? { ...f, name: newName.trim() } : f)));
  };

  const addScreen = () => {
    const f = blankFrame(`Screen ${frames.length + 1}`);
    commit((fr) => [...fr, f]);
    setActiveFrameId(f.id);
    setSelectedId(null);
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
    setSelectedId(null);
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
    setSelectedId(null);
  };

  // ----- library drop -----
  const dropItem = (fid, payload, pos) => {
    if (!payload) return;
    if (payload.kind === "template") {
      const f = frameFromTemplate(payload.preset, payload.name);
      commit((fr) => [...fr, f]);
      setActiveFrameId(f.id);
      setSelectedId(null);
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
    setSelectedId(node.id);
    toast.success(`Added ${spec.name}`);
  };

  // ----- export / import -----
  const doExport = () => {
    const json = exportProjectJSON({ ...project, frames: framesRef.current });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.name || "design").replace(/\s+/g, "-").toLowerCase()}.low.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported .low.json");
  };

  const doImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportJSON(String(reader.result));
        commit(() => parsed);
        setActiveFrameId(parsed[0].id);
        setSelectedId(null);
        toast.success(`Imported ${parsed.length} screen(s)`);
      } catch (err) {
        toast.error("Invalid LOW JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleApplyAiPatch = async (documentPatch, resultType) => {
    if (!documentPatch) return;
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
            // Replace existing or suffix
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
    if (selectedId) {
      const activeF = framesRef.current.find((f) => f.id === activeFrameId);
      const node = activeF?.nodes.find((n) => n.id === selectedId);
      if (node) {
        clipboardRef.current = { type: "node", data: JSON.parse(JSON.stringify(node)) };
        toast.success(`Copied "${node.name}"`);
      }
    } else if (activeFrameId) {
      const activeF = framesRef.current.find((f) => f.id === activeFrameId);
      if (activeF) {
        clipboardRef.current = { type: "frame", data: JSON.parse(JSON.stringify(activeF)) };
        toast.success(`Copied screen "${activeF.name}"`);
      }
    }
  };

  const pasteSelection = () => {
    const item = clipboardRef.current;
    if (!item) return;
    if (item.type === "node") {
      const source = item.data;
      const newNode = {
        ...source,
        id: uid(source.type || "node"),
        name: `${source.name} Copy`,
        x: (source.x || 0) + 16,
        y: (source.y || 0) + 16,
        style: { ...source.style },
        prototype: source.prototype ? { ...source.prototype } : undefined,
      };
      commit(mapActive((nodes) => [...nodes, newNode]));
      setSelectedId(newNode.id);
      // Update clipboard offset for repeated pastes
      clipboardRef.current = { type: "node", data: newNode };
      toast.success(`Pasted "${newNode.name}"`);
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
      setSelectedId(null);
      toast.success(`Pasted screen "${newF.name}"`);
    }
  };

  const duplicateSelection = () => {
    if (selectedId) {
      const activeF = framesRef.current.find((f) => f.id === activeFrameId);
      const node = activeF?.nodes.find((n) => n.id === selectedId);
      if (node) {
        const clonedNode = {
          ...node,
          id: uid(node.type || "node"),
          name: `${node.name} Copy`,
          x: (node.x || 0) + 16,
          y: (node.y || 0) + 16,
          style: { ...node.style },
          prototype: node.prototype ? { ...node.prototype } : undefined,
        };
        commit(mapActive((nodes) => [...nodes, clonedNode]));
        setSelectedId(clonedNode.id);
        toast.success(`Duplicated "${node.name}"`);
      }
    } else if (activeFrameId) {
      duplicateFrame(activeFrameId);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "select" || tag === "textarea";
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (!typing && meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
      } else if (!typing && meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteSelection();
      } else if (!typing && meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
      } else if (!typing && (e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteNode(selectedId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activeFrameId]);

  if (!project) return null;

  const activeFrame = frames.find((f) => f.id === activeFrameId) || frames[0];
  const activeNodes = activeFrame ? activeFrame.nodes : [];
  const selected = activeNodes.find((n) => n.id === selectedId) || null;

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
        onExit={() => navigate("/")}
        projectName={project.name}
        onUndo={undo}
        onRedo={redo}
        canUndo={hist.past.length > 0}
        canRedo={hist.future.length > 0}
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
          setSelectedId={setSelectedId}
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
        />
        <CanvasArea
          frames={frames}
          activeFrameId={activeFrameId}
          selectFrame={selectFrame}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateNodeLive={updateNodeLive}
          beginTransaction={beginTransaction}
          endTransaction={endTransaction}
          onDropItem={dropItem}
          zoom={zoom}
          mode={mode}
          snappingEnabled={snappingEnabled}
        />
        <RightPropertiesPanel
          node={selected}
          updateNode={updateNode}
          deleteNode={deleteNode}
          mode={mode}
          frames={frames}
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
    </div>
  );
}
