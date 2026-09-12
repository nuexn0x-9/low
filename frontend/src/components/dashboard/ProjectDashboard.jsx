import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Square, MoreHorizontal, Trash2, Clock, Sparkles, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/primitives/Button";
import {
  getProjects,
  saveProject,
  createProject,
  deleteProject,
  relativeTime,
  loadProjectsAsync,
  parseImportJSON,
  DEFAULT_DESIGN_TOKENS,
} from "@/data/storage";

const MiniFrame = () => (
  <div className="flex h-full items-center justify-center">
    <div className="flex h-[92px] w-[52px] flex-col gap-1.5 rounded-[6px] border border-[#d4d4d8] bg-white p-2">
      <div className="h-2.5 w-2/3 rounded-sm bg-[#e4e4e7]" />
      <div className="h-1.5 w-full rounded-sm bg-[#f4f4f5]" />
      <div className="mt-1 h-3 w-full rounded-sm border border-[#e4e4e7]" />
      <div className="h-3 w-full rounded-sm border border-[#e4e4e7]" />
      <div className="mt-auto h-3 w-full rounded-sm bg-[#18181b]" />
    </div>
  </div>
);

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => getProjects());
  const [menuId, setMenuId] = useState(null);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    loadProjectsAsync().then((list) => {
      if (list && list.length) setProjects(list);
    });
  }, []);

  const handleNew = () => {
    const count = projects.length + 1;
    const p = createProject(`Untitled ${count}`);
    navigate(`/editor/${p.id}`);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setProjects(deleteProject(id));
    setMenuId(null);
  };

  const handleOpenSample = () => {
    // Check if sample already exists in projects
    const existing = projects.find((p) => p.name === "Fintech Secure Login" || p.name === "Finance App");
    if (existing) {
      navigate(`/editor/${existing.id}`);
      return;
    }
    // Create new project from sample fintech template
    const newSample = createProject("Fintech Secure Login");
    navigate(`/editor/${newSample.id}`);
  };

  const handleImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportJSON(String(reader.result));
        const now = Date.now();
        const importedProj = {
          id: "p_" + Math.random().toString(36).slice(2, 9),
          name: file.name.replace(/\.low\.json$|\.json$/i, "") || "Imported Project",
          createdAt: now,
          updatedAt: now,
          frames: parsed,
          designTokens: parsed.designTokens || DEFAULT_DESIGN_TOKENS,
          components: parsed.components || [],
        };
        saveProject(importedProj);
        setProjects((prev) => [importedProj, ...prev]);
        toast.success(`Imported "${importedProj.name}" (${parsed.length} screens)`);
        navigate(`/editor/${importedProj.id}`);
      } catch (err) {
        toast.error("Invalid LOW JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full flex-col bg-[#fafafa] text-[#18181b]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          handleImportFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <header className="flex h-14 items-center justify-between border-b border-[#e4e4e7] bg-white px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#18181b] text-[11px] font-bold text-white">
            L
          </div>
          <span
            data-testid="low-logo"
            className="text-[15px] font-bold tracking-tight"
          >
            LOW
          </span>
          <span className="ml-1 rounded border border-[#e4e4e7] px-1.5 py-0.5 text-[10px] font-medium text-[#71717a]">
            v0.1.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="dashboard-import-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white px-3 text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
          >
            <Upload size={13} /> Import .low.json
          </button>
          <Button
            variant="primary"
            data-testid="new-project-btn"
            onClick={handleNew}
          >
            <Plus size={14} /> New Project
          </Button>
        </div>
      </header>

      <main className="low-scroll flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {/* First-Run Onboarding Quick Actions Banner */}
          <div
            data-testid="first-run-banner"
            className="mb-8 flex flex-col justify-between gap-4 rounded-xl border border-[#e4e4e7] bg-white p-5 md:flex-row md:items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#18181b]" />
                <h2 className="text-sm font-semibold tracking-tight text-[#18181b]">
                  Get Started with LOW
                </h2>
                <span className="rounded bg-[#f4f4f5] px-1.5 py-0.5 text-[10px] font-mono text-[#71717a]">
                  Self-Hosted • Monochrome
                </span>
              </div>
              <p className="mt-1 text-xs text-[#71717a]">
                Lightweight mobile UI wireframing with AI Import Engine and Universal Agent Connect v2.4.0.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="open-sample-btn"
                onClick={handleOpenSample}
                className="flex h-8 items-center gap-1.5 rounded-md bg-[#18181b] px-3 text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
              >
                <FileText size={13} /> Open Sample Project
              </button>
              <button
                type="button"
                data-testid="create-blank-btn"
                onClick={handleNew}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white px-3 text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
              >
                <Plus size={13} /> Blank Project
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-baseline justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
            <span className="text-xs text-[#a1a1aa]">
              {projects.length} {projects.length === 1 ? "file" : "files"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div
              data-testid="empty-state"
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d4d4d8] bg-white py-20"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#e4e4e7]">
                <Square size={18} className="text-[#a1a1aa]" />
              </div>
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mb-4 mt-1 text-xs text-[#a1a1aa]">
                Create your first mobile design or explore a pre-built sample.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={handleOpenSample}>
                  <FileText size={14} /> Open Sample Project
                </Button>
                <Button variant="secondary" onClick={handleNew}>
                  <Plus size={14} /> New Blank Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <button
                data-testid="new-project-card"
                onClick={handleNew}
                className="group flex h-[196px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d4d4d8] bg-white text-[#71717a] transition-colors hover:border-[#18181b] hover:text-[#18181b]"
              >
                <Plus size={20} />
                <span className="text-xs font-medium">New Project</span>
              </button>

              {projects.map((p) => (
                <div
                  key={p.id}
                  data-testid={`project-card-${p.id}`}
                  onClick={() => navigate(`/editor/${p.id}`)}
                  className="group relative flex h-[196px] cursor-pointer flex-col overflow-hidden rounded-lg border border-[#e4e4e7] bg-white transition-colors hover:border-[#a1a1aa]"
                >
                  <div className="dot-grid flex-1">
                    <MiniFrame />
                  </div>
                  <div className="flex items-center justify-between border-t border-[#e4e4e7] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{p.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#a1a1aa]">
                        <Clock size={10} /> {relativeTime(p.updatedAt)}
                      </p>
                    </div>
                    <button
                      data-testid={`project-menu-${p.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuId === p.id ? null : p.id);
                      }}
                      className="rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>

                  {menuId === p.id && (
                    <div className="absolute bottom-10 right-2 z-10 w-32 rounded-md border border-[#e4e4e7] bg-white py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                      <button
                        data-testid={`project-delete-${p.id}`}
                        onClick={(e) => handleDelete(e, p.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#3f3f46] hover:bg-[#f4f4f5]"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
