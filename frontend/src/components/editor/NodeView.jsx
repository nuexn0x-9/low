import React from "react";

function RenderLeafNode({ node }) {
  const s = node.style || {};
  const opacity = (s.opacity ?? 100) / 100;

  const base = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    opacity,
  };

  // 1. Text or Link
  if (node.type === "text" || node.type === "link") {
    const textAlign = s.textAlign || s.align || "left";
    return (
      <div
        style={{
          ...base,
          fontFamily: s.fontFamily || "inherit",
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight !== undefined ? s.lineHeight : 1.2,
          letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
          textAlign,
          textTransform: s.textTransform || "none",
          textDecoration: s.textDecoration || (node.type === "link" ? "underline" : "none"),
          color: s.color,
          display: "flex",
          alignItems: "center",
          justifyContent:
            textAlign === "center"
              ? "center"
              : textAlign === "right"
              ? "flex-end"
              : "flex-start",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {node.text}
      </div>
    );
  }

  // 2. Button or legacy Component
  if (node.type === "button" || node.type === "component") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          border: s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : "none",
          borderRadius: s.radius,
          color: s.color,
          fontFamily: s.fontFamily || "inherit",
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight !== undefined ? s.lineHeight : 1.2,
          letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
          textTransform: s.textTransform || "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {node.text}
      </div>
    );
  }

  // 3. Input
  if (node.type === "input") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          border: `${s.strokeWidth || 1}px solid ${s.stroke}`,
          borderRadius: s.radius,
          color: s.color,
          fontFamily: s.fontFamily || "inherit",
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
        }}
      >
        {node.text}
      </div>
    );
  }

  // 4. Image
  if (node.type === "image") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          border: `${s.strokeWidth || 1}px solid ${s.stroke}`,
          borderRadius: s.radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a1a1aa",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  // 5. Bottom Navigation
  if (node.type === "bottomnav") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          borderTop: `${s.strokeWidth || 1}px solid ${s.stroke}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: 8,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: i === 0 ? "#18181b" : "#d4d4d8" }} />
            <div style={{ width: 20, height: 3, borderRadius: 2, background: "#e4e4e7" }} />
          </div>
        ))}
      </div>
    );
  }

  // 6. Rectangle default
  return (
    <div
      style={{
        ...base,
        background: s.fill,
        border: s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : "none",
        borderRadius: s.radius,
      }}
    />
  );
}

export default function NodeView({ node, components = [] }) {
  if (!node) return null;

  // Component Instance
  if (node.type === "componentInstance") {
    const s = node.style || {};
    const overrides = node.overrides || {};
    const effStyle = { ...s, ...(overrides.style || {}) };
    const effText =
      overrides.text !== undefined
        ? overrides.text
        : node.text !== undefined && node.text !== ""
        ? node.text
        : node.name || "Component Instance";
    const effOpacity = (effStyle.opacity ?? 100) / 100;

    const base = {
      position: "absolute",
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      opacity: effOpacity,
    };

    // Check if matching component definition has child nodes to render
    const compDef = components.find((c) => c.id === node.componentId);
    if (compDef && Array.isArray(compDef.nodes) && compDef.nodes.length > 0) {
      return (
        <div
          style={{
            ...base,
            overflow: "hidden",
          }}
        >
          {compDef.nodes.map((childNode) => {
            const childStyle = { ...childNode.style };
            let childText = childNode.text;
            if (overrides.text !== undefined && childNode.type === "text") {
              childText = overrides.text;
            }
            if (overrides.style) {
              Object.assign(childStyle, overrides.style);
            }
            return (
              <div
                key={childNode.id}
                style={{
                  position: "absolute",
                  left: childNode.x,
                  top: childNode.y,
                  width: childNode.width,
                  height: childNode.height,
                  pointerEvents: "none",
                }}
              >
                <RenderLeafNode
                  node={{
                    ...childNode,
                    text: childText,
                    style: childStyle,
                    x: 0,
                    y: 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div
        style={{
          ...base,
          background: effStyle.fill || "#fafafa",
          border: effStyle.strokeWidth
            ? `${effStyle.strokeWidth}px solid ${effStyle.stroke || "#d4d4d8"}`
            : "1px dashed #71717a",
          borderRadius: effStyle.radius ?? 8,
          color: effStyle.color || "#18181b",
          fontFamily: effStyle.fontFamily || "inherit",
          fontSize: effStyle.fontSize ?? 14,
          fontWeight: effStyle.fontWeight ?? 500,
          lineHeight: effStyle.lineHeight !== undefined ? effStyle.lineHeight : 1.2,
          letterSpacing: effStyle.letterSpacing ? `${effStyle.letterSpacing}px` : undefined,
          textAlign: effStyle.textAlign || "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 8px",
          overflow: "hidden",
        }}
      >
        <span className="truncate">{effText}</span>
      </div>
    );
  }

  return <RenderLeafNode node={node} />;
}
