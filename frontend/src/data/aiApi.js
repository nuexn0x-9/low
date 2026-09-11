const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BASE}/api`;

export async function getAiProviders() {
  const res = await fetch(`${API}/ai/import/providers`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch AI providers");
  }
  return res.json();
}

export async function getAiDraftHistory(projectId = null, limit = 10) {
  const q = new URLSearchParams();
  if (projectId) q.append("project_id", projectId);
  if (limit) q.append("limit", limit.toString());
  const res = await fetch(`${API}/ai/import/history?${q.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch draft history");
  }
  return res.json();
}

export async function getAiDraftById(draftId) {
  const res = await fetch(`${API}/ai/import/history/${draftId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch draft details");
  }
  return res.json();
}

export async function generateAiImport(type, prompt, projectId = null, framePreset = null) {
  const res = await fetch(`${API}/ai/import/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, prompt, projectId, framePreset }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "failed to generate ai design");
  }
  return res.json();
}

export async function regenerateAiDraft(draftId) {
  const res = await fetch(`${API}/ai/import/history/${draftId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to regenerate AI draft");
  }
  return res.json();
}

export async function validateAiImport(resultType, documentPatch) {
  const res = await fetch(`${API}/ai/import/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resultType, documentPatch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Validation request failed");
  }
  return res.json();
}

export async function applyAiImport(projectId, resultType, documentPatch, expectedRevision = null) {
  const res = await fetch(`${API}/projects/${projectId}/ai/import/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resultType,
      documentPatch,
      expected_revision: expectedRevision,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Applying AI import failed");
  }
  return res.json();
}

export async function applyAiDraft(draftId, expectedRevision = null, documentPatch = null, resultType = null) {
  const payload = {
    expected_revision: expectedRevision,
  };
  if (documentPatch) payload.documentPatch = documentPatch;
  if (resultType) payload.resultType = resultType;

  const res = await fetch(`${API}/ai/import/history/${draftId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || err.detail || "Applying AI draft failed");
  }
  return res.json();
}
