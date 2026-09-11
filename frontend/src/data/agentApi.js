const rawEnv = (process.env.REACT_APP_BACKEND_URL || "").trim();
const BASE = (!rawEnv || rawEnv.includes("emergentagent.com")) ? "http://localhost:8000" : rawEnv;
const API = `${BASE}/api/agent`;

async function fetchWithFallback(urlPath, options) {
  try {
    const res = await fetch(`${API}${urlPath}`, options);
    if (res.ok) return res;
    // Fallback to localhost if remote fails
    if (BASE !== "http://localhost:8000") {
      const localRes = await fetch(`http://localhost:8000/api/agent${urlPath}`, options);
      if (localRes.ok) return localRes;
    }
    return res;
  } catch (err) {
    if (BASE !== "http://localhost:8000") {
      return await fetch(`http://localhost:8000/api/agent${urlPath}`, options);
    }
    throw err;
  }
}


export async function getAgentSchema() {
  const res = await fetchWithFallback(`/schema`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch agent schema");
  return res.json();
}

export async function createAgentSession(name, document, preset = "full_editor_assistant", scopes = null) {
  const payload = { name, document, preset };
  if (scopes && Array.isArray(scopes) && scopes.length > 0) {
    payload.scopes = scopes;
  }
  const res = await fetchWithFallback(`/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create agent session");
  return res.json();
}


export async function getAgentSessionInfo(sid) {
  const res = await fetchWithFallback(`/sessions/${sid}`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch session info");
  return res.json();
}

export async function revokeAgentSession(sid) {
  const res = await fetchWithFallback(`/sessions/${sid}/revoke`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to revoke session");
  return res.json();
}

export async function getAgentInstructions(sid) {
  const res = await fetchWithFallback(`/sessions/${sid}/instructions`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch agent instructions");
  return res.json();
}

export async function getAgentEvents(sid, after = 0) {
  const res = await fetchWithFallback(`/sessions/${sid}/events?after=${after}`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function postAgentAction(sid, token, action, params, dryRun = false) {
  const res = await fetchWithFallback(`/sessions/${sid}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-LOW-Token": token },
    body: JSON.stringify({ action, params, dryRun }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "string" ? err.detail : (err.detail?.message || "Action failed");
    throw new Error(detail);
  }
  return res.json();
}

export async function undoLastAgentAction(sid) {
  const res = await fetchWithFallback(`/sessions/${sid}/undo-last`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to undo last agent action");
  }
  return res.json();
}

export async function undoAgentEvent(eventId) {
  const res = await fetchWithFallback(`/events/${eventId}/undo`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to undo agent event");
  }
  return res.json();
}


export const AGENT_BASE_URL = BASE;
