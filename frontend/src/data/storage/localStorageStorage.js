const KEY = "low_projects_v1";

export const FRAME = { width: 390, height: 844 };

export function defaultNodes() {
  return [
    { id: "n_title", type: "text", name: "Title", x: 24, y: 96, width: 300, height: 40, text: "Welcome back", style: { color: "#18181b", fontSize: 26, fontWeight: 700, align: "left", opacity: 100 } },
    { id: "n_sub", type: "text", name: "Subtitle", x: 24, y: 140, width: 320, height: 22, text: "Sign in to continue to LOW", style: { color: "#71717a", fontSize: 14, fontWeight: 400, align: "left", opacity: 100 } },
    { id: "n_phone", type: "input", name: "Phone Input", x: 24, y: 204, width: 342, height: 48, text: "Phone number", style: { fill: "#ffffff", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#a1a1aa", fontSize: 14, opacity: 100 } },
    { id: "n_pass", type: "input", name: "Password Input", x: 24, y: 264, width: 342, height: 48, text: "Password", style: { fill: "#ffffff", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#a1a1aa", fontSize: 14, opacity: 100 } },
    { id: "n_link", type: "link", name: "Forgot Link", x: 24, y: 322, width: 160, height: 20, text: "Forgot password?", style: { color: "#3f3f46", fontSize: 13, fontWeight: 500, align: "left", opacity: 100 } },
    { id: "n_btn", type: "button", name: "Login Button", x: 24, y: 376, width: 342, height: 50, text: "Sign In", style: { fill: "#18181b", radius: 10, color: "#ffffff", fontSize: 15, fontWeight: 600, align: "center", opacity: 100 }, prototype: { trigger: "tap", action: "navigate", target: "Home", transition: "slide" } },
    { id: "n_nav", type: "bottomnav", name: "Bottom Navigation", x: 0, y: 780, width: 390, height: 64, text: "", style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, opacity: 100 } },
  ];
}

let _idc = 0;
export function newId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}${_idc++}`;
}

function tnode(type, name, x, y, width, height, text, style, prototype) {
  const n = { id: newId(type), type, name, x, y, width, height, text: text || "", style: style || {} };
  if (prototype) n.prototype = prototype;
  return n;
}

const inputStyle = { fill: "#ffffff", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#a1a1aa", fontSize: 14, opacity: 100 };
const btnStyle = { fill: "#18181b", radius: 10, color: "#ffffff", fontSize: 15, fontWeight: 600, align: "center", opacity: 100 };
const cardStyle = { fill: "#f4f4f5", stroke: "#e4e4e7", strokeWidth: 1, radius: 12, opacity: 100 };
const navStyle = { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, opacity: 100 };

export const templatePresets = {
  login: () => defaultNodes().map((n) => ({ ...n, id: newId(n.type), style: { ...n.style } })),
  register: () => [
    tnode("text", "Title", 24, 96, 320, 40, "Create account", { color: "#18181b", fontSize: 26, fontWeight: 700, align: "left", opacity: 100 }),
    tnode("input", "Full Name", 24, 180, 342, 48, "Full name", { ...inputStyle }),
    tnode("input", "Email", 24, 240, 342, 48, "Email address", { ...inputStyle }),
    tnode("input", "Password", 24, 300, 342, 48, "Password", { ...inputStyle }),
    tnode("button", "Register Button", 24, 372, 342, 50, "Create account", { ...btnStyle }),
    tnode("link", "Login Link", 24, 442, 220, 20, "Already have an account?", { color: "#3f3f46", fontSize: 13, fontWeight: 500, align: "left", opacity: 100 }),
  ],
  onboarding: () => [
    tnode("image", "Illustration", 95, 120, 200, 200, "", { fill: "#f4f4f5", stroke: "#e4e4e7", strokeWidth: 1, radius: 16, opacity: 100 }),
    tnode("text", "Title", 24, 360, 342, 36, "Welcome to LOW", { color: "#18181b", fontSize: 24, fontWeight: 700, align: "center", opacity: 100 }),
    tnode("text", "Subtitle", 24, 404, 342, 48, "Design mobile apps in a light, simple editor.", { color: "#71717a", fontSize: 14, fontWeight: 400, align: "center", opacity: 100 }),
    tnode("button", "Get Started", 24, 700, 342, 50, "Get Started", { ...btnStyle }),
    tnode("link", "Skip", 24, 764, 342, 20, "Skip", { color: "#a1a1aa", fontSize: 13, fontWeight: 500, align: "center", opacity: 100 }),
  ],
  home: () => [
    tnode("text", "App Bar", 24, 52, 200, 28, "Home", { color: "#18181b", fontSize: 20, fontWeight: 700, align: "left", opacity: 100 }),
    tnode("rectangle", "Card 1", 24, 100, 342, 120, "", { ...cardStyle }),
    tnode("rectangle", "Card 2", 24, 236, 342, 120, "", { ...cardStyle }),
    tnode("rectangle", "Card 3", 24, 372, 342, 120, "", { ...cardStyle }),
    tnode("bottomnav", "Bottom Navigation", 0, 780, 390, 64, "", { ...navStyle }),
  ],
  profile: () => [
    tnode("image", "Avatar", 155, 90, 80, 80, "", { fill: "#f4f4f5", stroke: "#e4e4e7", strokeWidth: 1, radius: 40, opacity: 100 }),
    tnode("text", "Name", 24, 184, 342, 28, "Jane Doe", { color: "#18181b", fontSize: 18, fontWeight: 700, align: "center", opacity: 100 }),
    tnode("rectangle", "Row 1", 24, 260, 342, 52, "", { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 10, opacity: 100 }),
    tnode("rectangle", "Row 2", 24, 324, 342, 52, "", { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 10, opacity: 100 }),
    tnode("rectangle", "Row 3", 24, 388, 342, 52, "", { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 10, opacity: 100 }),
    tnode("bottomnav", "Bottom Navigation", 0, 780, 390, 64, "", { ...navStyle }),
  ],
  checkout: () => [
    tnode("text", "Title", 24, 60, 320, 36, "Checkout", { color: "#18181b", fontSize: 24, fontWeight: 700, align: "left", opacity: 100 }),
    tnode("rectangle", "Summary", 24, 120, 342, 160, "", { ...cardStyle }),
    tnode("text", "Total Label", 24, 320, 150, 24, "Total", { color: "#71717a", fontSize: 14, fontWeight: 400, align: "left", opacity: 100 }),
    tnode("text", "Total Value", 216, 314, 150, 30, "$128.00", { color: "#18181b", fontSize: 20, fontWeight: 700, align: "right", opacity: 100 }),
    tnode("button", "Pay Button", 24, 700, 342, 50, "Pay now", { ...btnStyle }),
  ],
};

export const FRAME_PRESETS = {
  "iPhone 15": { name: "iPhone 15", width: 390, height: 844, safeArea: { top: 44, bottom: 34, left: 0, right: 0, visible: true } },
  "iPhone SE": { name: "iPhone SE", width: 375, height: 667, safeArea: { top: 20, bottom: 0, left: 0, right: 0, visible: true } },
  "Android Compact": { name: "Android Compact", width: 360, height: 800, safeArea: { top: 24, bottom: 16, left: 0, right: 0, visible: true } },
  "Android Large": { name: "Android Large", width: 412, height: 915, safeArea: { top: 24, bottom: 16, left: 0, right: 0, visible: true } },
  "Custom Size": { name: "Custom Size", width: 390, height: 844, safeArea: { top: 0, bottom: 0, left: 0, right: 0, visible: true } },
};

export function getFramePreset(key) {
  if (!key) return FRAME_PRESETS["iPhone 15"];
  if (FRAME_PRESETS[key]) return FRAME_PRESETS[key];
  const normalized = String(key).toLowerCase().replace(/[\s_-]+/g, "");
  for (const [k, v] of Object.entries(FRAME_PRESETS)) {
    if (k.toLowerCase().replace(/[\s_-]+/g, "") === normalized) return v;
  }
  return FRAME_PRESETS["iPhone 15"];
}

export function blankFrame(name, preset = "iPhone 15") {
  const p = getFramePreset(preset);
  return {
    id: newId("frame"),
    name: name || "Screen",
    preset: p.name,
    width: p.width,
    height: p.height,
    safeArea: { ...p.safeArea },
    nodes: [
      tnode("text", "App Bar", 24, 52, 200, 28, name || "Screen", { color: "#18181b", fontSize: 20, fontWeight: 700, align: "left", opacity: 100 }),
    ],
  };
}

export function frameFromTemplate(presetKey, name, preset = "iPhone 15") {
  const build = templatePresets[presetKey] || templatePresets.login;
  const p = FRAME_PRESETS[preset] || FRAME_PRESETS["iPhone 15"];
  return {
    id: newId("frame"),
    name: name || presetKey,
    preset: p.name,
    width: p.width,
    height: p.height,
    safeArea: { ...p.safeArea },
    nodes: build(),
  };
}

export function defaultFrames() {
  const p = FRAME_PRESETS["iPhone 15"];
  return [
    {
      id: "frame_login",
      name: "Login",
      preset: p.name,
      width: p.width,
      height: p.height,
      safeArea: { ...p.safeArea },
      nodes: defaultNodes(),
    },
  ];
}

export const DEFAULT_DESIGN_TOKENS = {
  colors: {
    background: "#ffffff",
    foreground: "#18181b",
    muted: "#71717a",
    border: "#d4d4d8",
    surface: "#f4f4f5",
    primary: "#18181b",
    secondary: "#f4f4f5",
  },
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export const STYLE_PRESETS = {
  primary_button: {
    id: "primary_button",
    name: "Primary Button",
    category: "button",
    style: { fill: "#18181b", radius: 10, color: "#ffffff", fontWeight: 600, fontSize: 15, textAlign: "center", opacity: 100 },
  },
  secondary_button: {
    id: "secondary_button",
    name: "Secondary Button",
    category: "button",
    style: { fill: "#f4f4f5", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#18181b", fontWeight: 600, fontSize: 15, textAlign: "center", opacity: 100 },
  },
  input_field: {
    id: "input_field",
    name: "Input Field",
    category: "form",
    style: { fill: "#ffffff", stroke: "#d4d4d8", strokeWidth: 1, radius: 10, color: "#18181b", fontSize: 14, opacity: 100 },
  },
  card: {
    id: "card",
    name: "Card",
    category: "surface",
    style: { fill: "#f4f4f5", stroke: "#e4e4e7", strokeWidth: 1, radius: 12, opacity: 100 },
  },
  app_bar: {
    id: "app_bar",
    name: "App Bar",
    category: "navigation",
    style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 0, opacity: 100 },
  },
  bottom_navigation: {
    id: "bottom_navigation",
    name: "Bottom Navigation",
    category: "navigation",
    style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 0, opacity: 100 },
  },
  bottom_sheet: {
    id: "bottom_sheet",
    name: "Bottom Sheet",
    category: "overlay",
    style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 16, opacity: 100 },
  },
  dialog: {
    id: "dialog",
    name: "Dialog",
    category: "overlay",
    style: { fill: "#ffffff", stroke: "#e4e4e7", strokeWidth: 1, radius: 14, opacity: 100 },
  },
  label: {
    id: "label",
    name: "Label",
    category: "typography",
    style: { color: "#71717a", fontSize: 12, fontWeight: 500, letterSpacing: 0.5, opacity: 100 },
  },
  heading: {
    id: "heading",
    name: "Heading",
    category: "typography",
    style: { color: "#18181b", fontSize: 22, fontWeight: 700, lineHeight: 1.2, opacity: 100 },
  },
  body_text: {
    id: "body_text",
    name: "Body Text",
    category: "typography",
    style: { color: "#3f3f46", fontSize: 15, fontWeight: 400, lineHeight: 1.4, opacity: 100 },
  },
};

export function normalizeProject(p) {
  if (!p) return p;
  const designTokens = p.designTokens || DEFAULT_DESIGN_TOKENS;
  const components = Array.isArray(p.components) ? p.components : [];
  const rawFrames = Array.isArray(p.frames) && p.frames.length
    ? p.frames
    : [{ id: "frame_login", name: "Login", nodes: p.nodes || defaultNodes() }];

  const frames = rawFrames.map((f) => {
    const presetKey = f.preset || "iPhone 15";
    const presetDef = getFramePreset(presetKey);
    return {
      ...f,
      preset: presetDef.name,
      width: f.width || presetDef.width,
      height: f.height || presetDef.height,
      safeArea: f.safeArea || { ...presetDef.safeArea },
      nodes: Array.isArray(f.nodes) ? f.nodes : defaultNodes(),
    };
  });

  return {
    ...p,
    designTokens,
    components,
    frames,
  };
}

export function exportProjectJSON(project) {
  return JSON.stringify(
    {
      lowVersion: "1.0.0",
      document: {
        id: project.id,
        name: project.name,
        frames: project.frames,
        designTokens: project.designTokens || DEFAULT_DESIGN_TOKENS,
        components: project.components || [],
      },
    },
    null,
    2
  );
}

export function parseImportJSON(text) {
  const data = JSON.parse(text);
  let frames = null;
  let designTokens = null;
  let components = [];

  if (Array.isArray(data)) {
    frames = data;
  } else if (data.document && Array.isArray(data.document.frames)) {
    frames = data.document.frames;
    designTokens = data.document.designTokens || null;
    components = data.document.components || [];
  } else if (Array.isArray(data.frames)) {
    frames = data.frames;
    designTokens = data.designTokens || null;
    components = data.components || [];
  }

  if (!frames || !frames.length) throw new Error("No frames found in file");

  const normalizedFrames = frames.map((f) => {
    const presetKey = f.preset || "iPhone 15";
    const presetDef = FRAME_PRESETS[presetKey] || FRAME_PRESETS["iPhone 15"];
    return {
      id: f.id || newId("frame"),
      name: f.name || "Screen",
      preset: presetKey,
      width: f.width || presetDef.width,
      height: f.height || presetDef.height,
      safeArea: f.safeArea || { ...presetDef.safeArea },
      nodes: Array.isArray(f.nodes)
        ? f.nodes.map((n) => {
            const base = {
              ...n,
              id: n.id || newId(n.type || "node"),
              style: n.style || {},
            };
            if (n.parentId) base.parentId = n.parentId;
            if (n.constraints) base.constraints = n.constraints;
            if (n.layoutSizing) base.layoutSizing = n.layoutSizing;
            if (n.type === "autoLayout") {
              base.layout = {
                direction: n.layout?.direction || "vertical",
                gap: n.layout?.gap ?? 12,
                padding: n.layout?.padding || { top: 16, right: 16, bottom: 16, left: 16 },
                align: n.layout?.align || "stretch",
                justify: n.layout?.justify || "start",
                wrap: Boolean(n.layout?.wrap),
              };
              base.children = Array.isArray(n.children) ? n.children : [];
            }
            if (n.type === "scrollArea") {
              base.scroll = {
                direction: n.scroll?.direction || "vertical",
                contentHeight: n.scroll?.contentHeight || 1000,
                contentWidth: n.scroll?.contentWidth || 390,
                showIndicator: n.scroll?.showIndicator !== false,
              };
              base.children = Array.isArray(n.children) ? n.children : [];
            }
            if (n.type === "componentInstance") {
              base.componentId = n.componentId || "";
              base.overrides = n.overrides || {};
            }
            return base;
          })
        : [],
    };
  });

  // Attach designTokens and components to array for seamless dual usage
  normalizedFrames.frames = normalizedFrames;
  normalizedFrames.designTokens = designTokens || DEFAULT_DESIGN_TOKENS;
  normalizedFrames.components = components;
  return normalizedFrames;
}

function seed() {
  const now = Date.now();
  return [
    { id: "p_finance", name: "Finance App", createdAt: now - 86400000 * 3, updatedAt: now - 3600000 * 2, frames: [{ id: "frame_login", name: "Login", nodes: defaultNodes() }, frameFromTemplate("home", "Home")] },
    { id: "p_shop", name: "Shop Onboarding", createdAt: now - 86400000 * 5, updatedAt: now - 86400000, frames: [frameFromTemplate("onboarding", "Onboarding"), frameFromTemplate("checkout", "Checkout")] },
    { id: "p_health", name: "Health Tracker", createdAt: now - 86400000 * 8, updatedAt: now - 86400000 * 2, frames: [{ id: "frame_login", name: "Login", nodes: defaultNodes() }, frameFromTemplate("profile", "Profile")] },
  ];
}

export function getProjects() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getProject(id) {
  return normalizeProject(getProjects().find((p) => p.id === id) || null);
}

export function saveProject(project) {
  const list = getProjects();
  const idx = list.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.push(updated);
  saveProjects(list);
  return updated;
}

export function createProject(name) {
  const now = Date.now();
  const project = {
    id: "p_" + Math.random().toString(36).slice(2, 9),
    name: name || "Untitled",
    createdAt: now,
    updatedAt: now,
    frames: defaultFrames(),
  };
  const list = getProjects();
  list.unshift(project);
  saveProjects(list);
  return project;
}

export function deleteProject(id) {
  const list = getProjects().filter((p) => p.id !== id);
  saveProjects(list);
  return list;
}

export function relativeTime(ts) {
  const diff = Date.now() - (typeof ts === "string" ? new Date(ts).getTime() : ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
