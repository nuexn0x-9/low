const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BASE_URL}/api`;

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API}/health`, { method: "GET" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok" && data.app === "LOW";
  } catch {
    return false;
  }
}

export async function fetchProjects() {
  const res = await fetch(`${API}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects from server");
  const list = await res.json();
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: new Date(p.created_at).getTime(),
    updatedAt: new Date(p.updated_at).getTime(),
    screensCount: p.screens_count || 1,
  }));
}

export async function fetchProject(id) {
  const res = await fetch(`${API}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project detail");
  const p = await res.json();

  // Load associated document frames
  const docRes = await fetch(`${API}/projects/${id}/document`);
  let frames = [];
  if (docRes.ok) {
    const docData = await docRes.json();
    frames = docData.content?.frames || [];
  }

  return {
    id: p.id,
    name: p.name,
    createdAt: new Date(p.created_at).getTime(),
    updatedAt: new Date(p.updated_at).getTime(),
    frames,
  };
}

export async function createProjectApi(name, frames, id) {
  const res = await fetch(`${API}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, frames }),
  });
  if (!res.ok) throw new Error("Failed to create project on server");
  const p = await res.json();
  return {
    id: p.id,
    name: p.name,
    createdAt: new Date(p.created_at).getTime(),
    updatedAt: new Date(p.updated_at).getTime(),
    frames: frames || [],
  };
}

export async function deleteProjectApi(id) {
  const res = await fetch(`${API}/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project on server");
  return res.json();
}

export async function fetchDocumentApi(projectId) {
  const res = await fetch(`${API}/projects/${projectId}/document`);
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

export async function saveDocumentApi(projectId, frames, lowVersion = "1.0.0", expectedRevision = null) {
  const payload = { lowVersion, frames };
  if (expectedRevision !== null && expectedRevision !== undefined) {
    payload.expected_revision = expectedRevision;
  }
  const res = await fetch(`${API}/projects/${projectId}/document`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.detail?.message || "Document revision conflict");
    err.isConflict = true;
    err.serverRevision = errData.detail?.server_revision;
    throw err;
  }
  if (!res.ok) throw new Error("Failed to save document");
  return res.json();
}

export async function autosaveDocumentApi(projectId, frames, expectedRevision = null) {
  const payload = { frames };
  if (expectedRevision !== null && expectedRevision !== undefined) {
    payload.expected_revision = expectedRevision;
  }
  const res = await fetch(`${API}/projects/${projectId}/document/autosave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.detail?.message || "Document revision conflict");
    err.isConflict = true;
    err.serverRevision = errData.detail?.server_revision;
    throw err;
  }
  if (!res.ok) throw new Error("Failed to autosave document");
  return res.json();
}

export async function validateImportApi(data) {
  const res = await fetch(`${API}/import/low-json/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.json();
}

export async function importLowJsonApi(projectId, data) {
  const res = await fetch(`${API}/projects/${projectId}/import/low-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to import LOW JSON");
  return res.json();
}

export async function exportLowJsonApi(projectId) {
  const res = await fetch(`${API}/projects/${projectId}/export/low-json`);
  if (!res.ok) throw new Error("Failed to export LOW JSON");
  return res.json();
}

export async function saveComponentApi(name, category, content, projectId = null) {
  const res = await fetch(`${API}/components`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, content, project_id: projectId }),
  });
  if (!res.ok) throw new Error("Failed to save component to library");
  return res.json();
}

export async function saveTemplateApi(name, category, content) {
  const res = await fetch(`${API}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, content }),
  });
  if (!res.ok) throw new Error("Failed to save template to library");
  return res.json();
}
