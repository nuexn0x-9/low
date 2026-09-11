import React from "react";

export default function NodeView({ node }) {
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

  if (node.type === "text" || node.type === "link") {
    return (
      <div
        style={{
          ...base,
          color: s.color,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          textAlign: s.align || "left",
          textDecoration: node.type === "link" ? "underline" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent:
            s.align === "center"
              ? "center"
              : s.align === "right"
              ? "flex-end"
              : "flex-start",
          lineHeight: 1.2,
        }}
      >
        {node.text}
      </div>
    );
  }

  if (node.type === "button" || node.type === "component") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          border: s.strokeWidth ? `${s.strokeWidth}px solid ${s.stroke}` : "none",
          borderRadius: s.radius,
          color: s.color,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {node.text}
      </div>
    );
  }

  if (node.type === "input") {
    return (
      <div
        style={{
          ...base,
          background: s.fill,
          border: `${s.strokeWidth || 1}px solid ${s.stroke}`,
          borderRadius: s.radius,
          color: s.color,
          fontSize: s.fontSize,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
        }}
      >
        {node.text}
      </div>
    );
  }

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

  // rectangle default
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
