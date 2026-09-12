import * as local from "./localStorageStorage.js";
import * as api from "./apiStorage.js";

// Re-export all primitives, schemas, and presets from localStorageStorage
export const FRAME = local.FRAME;
export const defaultNodes = local.defaultNodes;
export const newId = local.newId;
export const templatePresets = local.templatePresets;
export const blankFrame = local.blankFrame;
export const frameFromTemplate = local.frameFromTemplate;
export const defaultFrames = local.defaultFrames;
export const normalizeProject = local.normalizeProject;
export const exportProjectJSON = local.exportProjectJSON;
export const parseImportJSON = local.parseImportJSON;
export const relativeTime = local.relativeTime;
export const DEFAULT_DESIGN_TOKENS = local.DEFAULT_DESIGN_TOKENS;
export const STYLE_PRESETS = local.STYLE_PRESETS;

// Mode and status tracking
let _backendOnline = false;
let _hasCheckedHealth = false;
let _syncStatus = "Saved locally";
const _statusListeners = new Set();
let _currentDocRevision = null;
let _lastSyncedTime = null;

export function getLastSyncedTime() {
  return _lastSyncedTime;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function getSyncStatus() {
  return _syncStatus;
}

export function getCurrentRevision() {
  return _currentDocRevision;
}

export function setCurrentRevision(rev) {
  _currentDocRevision = rev;
}

export function subscribeSyncStatus(listener) {
  _statusListeners.add(listener);
  return () => _statusListeners.delete(listener);
}

function notifyStatus(status) {
  _syncStatus = status;
  for (const fn of _statusListeners) {
    try {
      fn(status);
    } catch {
      /* ignore */
    }
  }
}

// Check backend status in background
export async function checkServerConnection() {
  const isHealthy = await api.checkBackendHealth();
  _backendOnline = isHealthy;
  _hasCheckedHealth = true;
  return isHealthy;
}

// Kick off initial health check
checkServerConnection();

// Synchronous and hybrid methods preserving frontend compatibility

export function getProjects() {
  // Always return local cache immediately for synchronous render
  return local.getProjects();
}

export function saveProjects(list) {
  local.saveProjects(list);
}

export function getProject(id) {
  return local.getProject(id);
}

export function saveProject(project, onStatusChange) {
  // 1. Immediately save to localStorage as fast local commit
  const updated = local.saveProject(project);
  notifyStatus(_backendOnline ? "Syncing…" : "Saved locally");
  if (onStatusChange) onStatusChange(_backendOnline ? "Syncing…" : "Saved locally");

  // 2. If backend is available or not yet ruled out, sync in background
  if (_backendOnline || !_hasCheckedHealth) {
    api
      .autosaveDocumentApi(project.id, project.frames, _currentDocRevision)
      .then((serverDoc) => {
        _backendOnline = true;
        if (serverDoc && serverDoc.revision) {
          _currentDocRevision = serverDoc.revision;
        }
        _lastSyncedTime = Date.now();
        const msg = `Saved to server (${formatTime(_lastSyncedTime)})`;
        notifyStatus(msg);
        if (onStatusChange) onStatusChange(msg);
      })
      .catch((err) => {
        if (err.isConflict) {
          notifyStatus("Sync conflict");
          if (onStatusChange) onStatusChange("Sync conflict");
        } else {
          _backendOnline = false;
          notifyStatus("Offline");
          if (onStatusChange) onStatusChange("Offline");
        }
      });
  }

  return updated;
}

export function createProject(name) {
  const project = local.createProject(name);

  // Sync creation with backend in background
  if (_backendOnline || !_hasCheckedHealth) {
    api
      .createProjectApi(project.name, project.frames, project.id)
      .then((serverProject) => {
        _backendOnline = true;
      })
      .catch(() => {
        _backendOnline = false;
      });
  }

  return project;
}

export function deleteProject(id) {
  const remaining = local.deleteProject(id);

  if (_backendOnline || !_hasCheckedHealth) {
    api
      .deleteProjectApi(id)
      .then(() => {
        _backendOnline = true;
      })
      .catch(() => {
        _backendOnline = false;
      });
  }

  return remaining;
}

// Explicit async methods for components that support async loading
export async function loadProjectsAsync() {
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      const serverList = await api.fetchProjects();
      if (serverList && serverList.length > 0) {
        // Merge or populate local cache
        const localList = local.getProjects();
        const merged = [...serverList];
        for (const lp of localList) {
          if (!merged.some((mp) => mp.id === lp.id)) {
            merged.push(lp);
          }
        }
        local.saveProjects(merged);
        return merged;
      }
    }
  } catch {
    _backendOnline = false;
  }
  return local.getProjects();
}

export async function loadProjectAsync(id) {
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      const serverProj = await api.fetchProject(id);
      if (serverProj && serverProj.frames && serverProj.frames.length > 0) {
        local.saveProject(serverProj);
        return serverProj;
      }
    }
  } catch {
    _backendOnline = false;
  }
  return local.getProject(id);
}

export { api, local };
