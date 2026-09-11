const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BASE}/api`;

const STORAGE_KEY_AI_SETTINGS = "low_ai_import_settings";
const STORAGE_KEY_AGENT_SETTINGS = "low_agent_connect_settings";

export async function getAiImportSettings() {
  try {
    const res = await fetch(`${API}/settings/ai-import`);
    if (!res.ok) {
      throw new Error(`Failed to load AI settings: ${res.status}`);
    }
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      provider: "mock",
      providerMode: "database_managed",
      configured: true,
      baseUrl: "",
      endpointPath: "/v1/chat/completions",
      model: "gpt-4o-mini",
      timeoutSeconds: 30,
      maxRetries: 2,
      maxOutputTokens: 4096,
      defaultResultType: "screen",
      framePreset: "390x844",
      monochromeOutput: true,
      strictValidation: true,
      autoPreview: true,
      saveDraftHistory: true,
      maxFrames: 5,
      maxNodesPerFrame: 150,
      maxPayloadBytes: 2097152,
      rejectExternalAssetUrls: false,
      rejectRawHtmlScript: true,
    };
  }
}

export async function updateAiImportSettings(payload) {
  const res = await fetch(`${API}/settings/ai-import`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update AI settings");
  }
  const data = await res.json();
  localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(data));
  return data;
}

export async function testAiConnection(payload) {
  const res = await fetch(`${API}/settings/ai-import/test-connection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to test AI connection");
  }
  return res.json();
}

export async function clearAiApiKey() {
  const res = await fetch(`${API}/settings/ai-import/api-key`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to clear API key");
  }
  return res.json();
}

export async function getAgentConnectSettings() {
  try {
    const res = await fetch(`${API}/settings/agent-connect`);
    if (!res.ok) {
      throw new Error(`Failed to load Agent Connect settings: ${res.status}`);
    }
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY_AGENT_SETTINGS, JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_KEY_AGENT_SETTINGS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      publicBaseUrl: "http://localhost:8000",
      schemaEndpoint: "/api/agent/schema",
      sessionsEndpoint: "/api/agent/sessions",
      actionsEndpointPattern: "/api/agent/sessions/{session_id}/actions",
      eventsEndpointPattern: "/api/agent/sessions/{session_id}/events",
      instructionsEndpointPattern: "/api/agent/sessions/{session_id}/instructions",
      eventPollIntervalMs: 1500,
      maxPayloadBytes: 1048576,
      enablePublicInstructionsUrl: true,
      enableCurlExamples: true,
      defaultPreset: "standard",
      defaultExpiryMinutes: 60,
      requireDryRunFirst: false,
      allowBatchUpdate: true,
      maxBatchOperations: 25,
      allowUndoAgentChanges: true,
      requireApprovalForDestructiveActions: false,
      logDryRunEvents: true,
      instructionFormat: "general_http",
      defaultScopes: [
        "document:read",
        "screen:write",
        "element:write",
        "component:write",
      ],
    };
  }
}

export async function updateAgentConnectSettings(payload) {
  const res = await fetch(`${API}/settings/agent-connect`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update Agent Connect settings");
  }
  const data = await res.json();
  localStorage.setItem(STORAGE_KEY_AGENT_SETTINGS, JSON.stringify(data));
  return data;
}

export async function testAgentEndpoints(payload) {
  const res = await fetch(`${API}/settings/agent-connect/test-endpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to test Agent endpoints");
  }
  return res.json();
}
