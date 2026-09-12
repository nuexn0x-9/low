/**
 * LOW Phase 10: Export, Handoff, and Developer Mode Utilities
 */

/**
 * Generates CSS Variables string from Design Tokens
 */
export function generateTokensCss(designTokens) {
  if (!designTokens) return ":root {}";
  const lines = [":root {"];

  if (designTokens.colors) {
    lines.push("  /* Colors */");
    for (const [name, val] of Object.entries(designTokens.colors)) {
      lines.push(`  --low-color-${name}: ${val};`);
    }
  }

  if (designTokens.radius) {
    lines.push("  /* Border Radius */");
    for (const [name, val] of Object.entries(designTokens.radius)) {
      lines.push(`  --low-radius-${name}: ${val}px;`);
    }
  }

  if (designTokens.spacing) {
    lines.push("  /* Spacing */");
    for (const [name, val] of Object.entries(designTokens.spacing)) {
      lines.push(`  --low-spacing-${name}: ${val}px;`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Generates clean CSS for a node
 */
export function generateNodeCss(node, isChildOfAutoLayout = false) {
  if (!node) return "";
  const s = node.style || {};
  const lines = [];

  const className = `.low-${(node.name || node.type || "element")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")}`;

  lines.push(`${className} {`);

  if (node.type === "autoLayout") {
    const l = node.layout || {};
    const dir = l.direction === "horizontal" ? "row" : "column";
    const gap = l.gap !== undefined ? l.gap : 12;
    const pad = l.padding || { top: 16, right: 16, bottom: 16, left: 16 };
    const padStr =
      typeof pad === "number"
        ? `${pad}px`
        : `${pad.top || 0}px ${pad.right || 0}px ${pad.bottom || 0}px ${pad.left || 0}px`;

    const alignMap = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
    const justifyMap = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      "space-between": "space-between",
    };

    if (!isChildOfAutoLayout) {
      lines.push("  position: absolute;");
      lines.push(`  left: ${node.x}px;`);
      lines.push(`  top: ${node.y}px;`);
    }
    lines.push(`  width: ${node.width}px;`);
    lines.push(`  min-height: ${node.height}px;`);
    lines.push("  display: flex;");
    lines.push(`  flex-direction: ${dir};`);
    lines.push(`  gap: ${gap}px;`);
    lines.push(`  padding: ${padStr};`);
    lines.push(`  align-items: ${alignMap[l.align] || "stretch"};`);
    lines.push(`  justify-content: ${justifyMap[l.justify] || "flex-start"};`);
    if (l.wrap) lines.push("  flex-wrap: wrap;");
  } else if (isChildOfAutoLayout) {
    const wSizing = node.layoutSizing?.width || "fixed";
    const hSizing = node.layoutSizing?.height || "fixed";

    if (wSizing === "fill") {
      lines.push("  flex-grow: 1;");
      lines.push("  width: 100%;");
    } else if (wSizing === "hug") {
      lines.push("  width: fit-content;");
    } else {
      lines.push(`  width: ${node.width}px;`);
    }

    if (hSizing === "fill") {
      lines.push("  flex-grow: 1;");
      lines.push("  height: 100%;");
    } else if (hSizing === "hug") {
      lines.push("  height: fit-content;");
    } else {
      lines.push(`  height: ${node.height}px;`);
    }
    lines.push("  flex-shrink: 0;");
  } else {
    lines.push("  position: absolute;");
    lines.push(`  left: ${node.x}px;`);
    lines.push(`  top: ${node.y}px;`);
    lines.push(`  width: ${node.width}px;`);
    lines.push(`  height: ${node.height}px;`);
  }

  // Visual appearance
  if (s.fill && s.fill !== "transparent") {
    lines.push(`  background: ${s.fill};`);
  }
  if (s.stroke && s.stroke !== "transparent") {
    lines.push(`  border: ${s.strokeWidth || 1}px solid ${s.stroke};`);
  }
  if (s.radius !== undefined && s.radius > 0) {
    lines.push(`  border-radius: ${s.radius}px;`);
  }
  if (s.opacity !== undefined && s.opacity < 100) {
    lines.push(`  opacity: ${(s.opacity / 100).toFixed(2)};`);
  }

  // Typography
  if (node.type === "text" || node.type === "button" || node.type === "input") {
    if (s.color) lines.push(`  color: ${s.color};`);
    if (s.fontFamily) lines.push(`  font-family: ${s.fontFamily};`);
    if (s.fontSize) lines.push(`  font-size: ${s.fontSize}px;`);
    if (s.fontWeight) lines.push(`  font-weight: ${s.fontWeight};`);
    if (s.lineHeight !== undefined) lines.push(`  line-height: ${s.lineHeight};`);
    if (s.letterSpacing) lines.push(`  letter-spacing: ${s.letterSpacing}px;`);
    if (s.textAlign || s.align) lines.push(`  text-align: ${s.textAlign || s.align};`);
    if (s.textTransform && s.textTransform !== "none") {
      lines.push(`  text-transform: ${s.textTransform};`);
    }
    if (s.textDecoration && s.textDecoration !== "none") {
      lines.push(`  text-decoration: ${s.textDecoration};`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Generates Tailwind utility classes approximation for a node
 */
export function generateTailwindClasses(node) {
  if (!node) return "";
  const s = node.style || {};
  const classes = [];

  if (node.type === "autoLayout") {
    classes.push("flex");
    classes.push(node.layout?.direction === "horizontal" ? "flex-row" : "flex-col");
    const gap = node.layout?.gap;
    if (gap !== undefined) classes.push(`gap-[${gap}px]`);
    const pad = node.layout?.padding;
    if (typeof pad === "number") classes.push(`p-[${pad}px]`);
    else if (pad) {
      if (pad.top) classes.push(`pt-[${pad.top}px]`);
      if (pad.right) classes.push(`pr-[${pad.right}px]`);
      if (pad.bottom) classes.push(`pb-[${pad.bottom}px]`);
      if (pad.left) classes.push(`pl-[${pad.left}px]`);
    }
    const alignMap = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" };
    if (node.layout?.align && alignMap[node.layout.align]) classes.push(alignMap[node.layout.align]);
  } else if (!node.parentId) {
    classes.push("absolute");
    classes.push(`left-[${node.x}px]`);
    classes.push(`top-[${node.y}px]`);
    classes.push(`w-[${node.width}px]`);
    classes.push(`h-[${node.height}px]`);
  }

  if (s.radius) classes.push(`rounded-[${s.radius}px]`);
  if (s.stroke && s.stroke !== "transparent") classes.push(`border border-[${s.stroke}]`);
  if (s.fill && s.fill !== "transparent") classes.push(`bg-[${s.fill}]`);
  if (s.color) classes.push(`text-[${s.color}]`);
  if (s.fontSize) classes.push(`text-[${s.fontSize}px]`);
  if (s.fontWeight) {
    const weightMap = {
      100: "font-thin",
      200: "font-extralight",
      300: "font-light",
      400: "font-normal",
      500: "font-medium",
      600: "font-semibold",
      700: "font-bold",
      800: "font-extrabold",
      900: "font-black",
    };
    classes.push(weightMap[s.fontWeight] || `font-[${s.fontWeight}]`);
  }

  return classes.join(" ");
}

/**
 * Escapes text for XML / SVG
 */
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates SVG element snippet for a single node
 */
export function generateNodeSvgSnippet(node, offsetX = 0, offsetY = 0, allNodes = []) {
  if (!node || node.hidden) return "";

  const x = (node.x || 0) + offsetX;
  const y = (node.y || 0) + offsetY;
  const w = node.width || 100;
  const h = node.height || 40;
  const s = node.style || {};
  const fill = s.fill || "none";
  const stroke = s.stroke || "none";
  const strokeWidth = s.strokeWidth || (s.stroke && s.stroke !== "transparent" ? 1 : 0);
  const radius = s.radius || 0;
  const opacity = s.opacity !== undefined ? s.opacity / 100 : 1;

  if (node.type === "autoLayout") {
    const childIds = Array.isArray(node.children) ? node.children : [];
    const childrenNodes = childIds.map((cid) => allNodes.find((n) => n.id === cid)).filter((n) => n && !n.hidden);

    const l = node.layout || {};
    const isHoriz = l.direction === "horizontal";
    const gap = l.gap !== undefined ? l.gap : 12;
    const pad = l.padding || { top: 16, right: 16, bottom: 16, left: 16 };
    const padTop = typeof pad === "number" ? pad : pad.top || 0;
    const padLeft = typeof pad === "number" ? pad : pad.left || 0;

    let currOffset = isHoriz ? padLeft : padTop;
    const childrenSnippets = childrenNodes.map((child) => {
      const cx = isHoriz ? currOffset : padLeft;
      const cy = isHoriz ? padTop : currOffset;
      currOffset += (isHoriz ? child.width : child.height) + gap;
      return generateNodeSvgSnippet(child, x + cx, y + cy, allNodes);
    });

    return `
      <g id="${escapeXml(node.id)}" opacity="${opacity}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
        ${childrenSnippets.join("\n")}
      </g>
    `;
  }

  if (node.type === "text") {
    const fontSize = s.fontSize || 14;
    const fontWeight = s.fontWeight || 400;
    const fontFamily = s.fontFamily || "sans-serif";
    const color = s.color || "#18181b";
    const align = s.textAlign || s.align || "left";
    let textAnchor = "start";
    let textX = x;
    if (align === "center") {
      textAnchor = "middle";
      textX = x + w / 2;
    } else if (align === "right") {
      textAnchor = "end";
      textX = x + w;
    }
    const textY = y + fontSize + (h - fontSize) / 2 - 2;

    return `
      <text id="${escapeXml(node.id)}" x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-family="${escapeXml(
      fontFamily
    )}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" opacity="${opacity}">
        ${escapeXml(node.text || "")}
      </text>
    `;
  }

  if (node.type === "button" || node.type === "component") {
    const fontSize = s.fontSize || 14;
    const fontWeight = s.fontWeight || 600;
    const fontFamily = s.fontFamily || "sans-serif";
    const color = s.color || "#ffffff";
    const textY = y + h / 2 + fontSize / 3;

    return `
      <g id="${escapeXml(node.id)}" opacity="${opacity}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
        <text x="${x + w / 2}" y="${textY}" text-anchor="middle" font-family="${escapeXml(
      fontFamily
    )}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">
          ${escapeXml(node.text || "")}
        </text>
      </g>
    `;
  }

  if (node.type === "input") {
    const fontSize = s.fontSize || 14;
    const color = s.color || "#a1a1aa";
    return `
      <g id="${escapeXml(node.id)}" opacity="${opacity}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
        <text x="${x + 14}" y="${y + h / 2 + fontSize / 3}" font-family="sans-serif" font-size="${fontSize}" fill="${color}">
          ${escapeXml(node.text || "Placeholder")}
        </text>
      </g>
    `;
  }

  // Default rectangle / card
  return `
    <rect id="${escapeXml(node.id)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
  `;
}

/**
 * Generates complete standalone SVG for selected node or multi-selection
 */
export function generateNodeSvg(nodeOrNodes, allNodes = [], components = []) {
  const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
  const visible = nodes.filter((n) => n && !n.hidden);
  if (!visible.length) return "";

  const minX = Math.min(...visible.map((n) => n.x));
  const minY = Math.min(...visible.map((n) => n.y));
  const maxX = Math.max(...visible.map((n) => n.x + n.width));
  const maxY = Math.max(...visible.map((n) => n.y + n.height));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const snippets = visible.map((n) => generateNodeSvgSnippet(n, -minX, -minY, allNodes));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${snippets.join("\n")}
</svg>`;
}

/**
 * Generates complete SVG for an entire screen frame
 */
export function generateFrameSvg(frame, options = {}) {
  if (!frame) return "";
  const w = frame.width || 390;
  const h = frame.height || 844;
  const nodes = (frame.nodes || []).filter((n) => !n.hidden && !n.parentId);

  const snippets = nodes.map((n) => generateNodeSvgSnippet(n, 0, 0, frame.nodes || []));

  let safeAreaSnippet = "";
  if (options.includeSafeArea && frame.safeArea) {
    const sa = frame.safeArea;
    safeAreaSnippet = `
      <!-- Safe Area Guides -->
      ${sa.top ? `<rect x="0" y="0" width="${w}" height="${sa.top}" fill="rgba(24,24,27,0.04)" stroke="#71717a" stroke-dasharray="4 4" stroke-width="1" />` : ""}
      ${sa.bottom ? `<rect x="0" y="${h - sa.bottom}" width="${w}" height="${sa.bottom}" fill="rgba(24,24,27,0.04)" stroke="#71717a" stroke-dasharray="4 4" stroke-width="1" />` : ""}
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Screen Canvas Background -->
  <rect width="${w}" height="${h}" fill="#ffffff" />
  ${safeAreaSnippet}
  ${snippets.join("\n")}
</svg>`;
}

/**
 * Helper to download any string/blob as a file in browser
 */
export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download SVG file
 */
export function downloadSvg(svgString, filename = "design.svg") {
  downloadFile(svgString, filename, "image/svg+xml;charset=utf-8");
}

/**
 * Converts SVG to high-resolution PNG using HTML5 Canvas
 */
export function downloadPngFromSvg(svgString, width, height, filename = "design.png") {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const scale = 2; // 2x Retina resolution
        const canvas = document.createElement("canvas");
        canvas.width = (width || 390) * scale;
        canvas.height = (height || 844) * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context not available"));
          return;
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width || 390, height || 844);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            downloadFile(pngBlob, filename, "image/png");
            resolve(true);
          } else {
            reject(new Error("Failed to generate PNG blob"));
          }
        }, "image/png");
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}
