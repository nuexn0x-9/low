import React from "react";
import { Trash2, AlignLeft, AlignCenter, AlignRight, Link2 } from "lucide-react";
import { Input, Field, Segmented } from "@/components/primitives/Input";

const NumberField = ({ label, value, onChange, testid, suffix }) => (
  <Field label={label}>
    <div className="relative flex-1">
      <input
        data-testid={testid}
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
        className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-2 text-xs text-[#18181b] outline-none transition-colors focus:border-[#18181b]"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#a1a1aa]">
          {suffix}
        </span>
      )}
    </div>
  </Field>
);

const ColorField = ({ label, value, onChange, testid }) => (
  <Field label={label}>
    <div className="flex flex-1 items-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white px-1.5">
      <input
        data-testid={`${testid}-swatch`}
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border border-[#e4e4e7] bg-transparent p-0"
      />
      <input
        data-testid={testid}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-full bg-transparent text-xs uppercase text-[#18181b] outline-none"
      />
    </div>
  </Field>
);

const Group = ({ title, children }) => (
  <div className="border-b border-[#e4e4e7] px-3 py-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
      {title}
    </p>
    <div className="space-y-1.5">{children}</div>
  </div>
);

export default function RightPropertiesPanel({
  node,
  updateNode,
  deleteNode,
  mode,
  frames = [],
}) {
  if (!node) {
    return (
      <aside data-testid="properties-panel" className="flex w-72 shrink-0 flex-col border-l border-[#e4e4e7] bg-white">
        <div className="flex h-9 items-center border-b border-[#e4e4e7] px-3 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">
          Properties
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-xs text-[#a1a1aa]">
            Select a layer to edit its properties.
          </p>
        </div>
      </aside>
    );
  }

  const s = node.style || {};
  const p = node.prototype || {};
  const isText = node.type === "text" || node.type === "link";
  const hasFill = ["rectangle", "button", "input", "image", "component", "bottomnav"].includes(
    node.type
  );

  return (
    <aside
      data-testid="properties-panel"
      className="low-scroll flex w-72 shrink-0 flex-col overflow-auto border-l border-[#e4e4e7] bg-white"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e4e4e7] px-3">
        <span className="truncate text-xs font-semibold">{node.name}</span>
        <button
          data-testid="delete-node-btn"
          onClick={() => deleteNode(node.id)}
          title="Delete"
          className="rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <Group title="Position">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="X" testid="prop-x" value={node.x} onChange={(v) => updateNode(node.id, { x: v })} />
          <NumberField label="Y" testid="prop-y" value={node.y} onChange={(v) => updateNode(node.id, { y: v })} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="W" testid="prop-w" value={node.width} onChange={(v) => updateNode(node.id, { width: v })} />
          <NumberField label="H" testid="prop-h" value={node.height} onChange={(v) => updateNode(node.id, { height: v })} />
        </div>
      </Group>

      {isText && (
        <Group title="Content">
          <Input
            data-testid="prop-text"
            value={node.text}
            onChange={(e) => updateNode(node.id, { text: e.target.value })}
          />
        </Group>
      )}

      <Group title="Appearance">
        {hasFill && (
          <ColorField label="Fill" testid="prop-fill" value={s.fill} onChange={(v) => updateNode(node.id, { style: { fill: v } })} />
        )}
        {(hasFill || node.type !== "text") && (
          <ColorField label="Stroke" testid="prop-stroke" value={s.stroke} onChange={(v) => updateNode(node.id, { style: { stroke: v } })} />
        )}
        <NumberField label="Radius" testid="prop-radius" value={s.radius} onChange={(v) => updateNode(node.id, { style: { radius: v } })} />
        <NumberField label="Opacity" suffix="%" testid="prop-opacity" value={s.opacity} onChange={(v) => updateNode(node.id, { style: { opacity: Math.max(0, Math.min(100, v)) } })} />
      </Group>

      {isText && (
        <Group title="Typography">
          <ColorField label="Color" testid="prop-color" value={s.color} onChange={(v) => updateNode(node.id, { style: { color: v } })} />
          <NumberField label="Size" testid="prop-fontsize" value={s.fontSize} onChange={(v) => updateNode(node.id, { style: { fontSize: v } })} />
          <Field label="Weight">
            <Segmented
              testid="prop-weight"
              value={String(s.fontWeight || 400)}
              onChange={(v) => updateNode(node.id, { style: { fontWeight: Number(v) } })}
              options={[
                { value: "400", label: "R" },
                { value: "500", label: "M" },
                { value: "700", label: "B" },
              ]}
            />
          </Field>
          <Field label="Align">
            <div className="inline-flex rounded-md border border-[#d4d4d8] bg-[#f4f4f5] p-0.5">
              {[
                { v: "left", Icon: AlignLeft },
                { v: "center", Icon: AlignCenter },
                { v: "right", Icon: AlignRight },
              ].map(({ v, Icon }) => (
                <button
                  key={v}
                  data-testid={`prop-align-${v}`}
                  onClick={() => updateNode(node.id, { style: { align: v } })}
                  className={`flex h-6 w-7 items-center justify-center rounded transition-colors ${
                    (s.align || "left") === v
                      ? "bg-white text-[#18181b]"
                      : "text-[#71717a] hover:text-[#18181b]"
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </Field>
        </Group>
      )}

      <div
        className={`px-3 py-3 ${
          mode === "prototype" ? "bg-[#fafafa]" : ""
        }`}
      >
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
          <Link2 size={12} /> Prototype
        </p>
        <div className="space-y-1.5">
          <Field label="Trigger">
            <select
              data-testid="proto-trigger"
              value={p.trigger || "none"}
              onChange={(e) => updateNode(node.id, { prototype: { trigger: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="none">None</option>
              <option value="tap">Tap</option>
              <option value="longpress">Long Press</option>
            </select>
          </Field>
          <Field label="Action">
            <select
              data-testid="proto-action"
              value={p.action || "navigate"}
              onChange={(e) => updateNode(node.id, { prototype: { action: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="navigate">Navigate to</option>
              <option value="back">Back</option>
              <option value="overlay">Open Overlay</option>
            </select>
          </Field>
          {((p.action || "navigate") === "navigate" || p.action === "overlay") && (
            <Field label="Target">
              <select
                data-testid="proto-target"
                value={p.target || ""}
                onChange={(e) => updateNode(node.id, { prototype: { target: e.target.value } })}
                className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              >
                <option value="">Select screen…</option>
                {frames.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {p.action === "overlay" && (
            <>
              <Field label="Type">
                <select
                  data-testid="proto-overlay-type"
                  value={p.overlayType || "bottom-sheet"}
                  onChange={(e) => updateNode(node.id, { prototype: { overlayType: e.target.value } })}
                  className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
                >
                  <option value="bottom-sheet">Bottom Sheet</option>
                  <option value="centered-dialog">Centered Dialog</option>
                </select>
              </Field>
              <Field label="Dismiss">
                <label className="flex items-center gap-2 text-xs text-[#18181b]">
                  <input
                    data-testid="proto-overlay-dismiss"
                    type="checkbox"
                    checked={p.dismissOnOutsideClick !== false}
                    onChange={(e) => updateNode(node.id, { prototype: { dismissOnOutsideClick: e.target.checked } })}
                    className="h-4 w-4 rounded border-[#d4d4d8] text-[#18181b]"
                  />
                  Outside click
                </label>
              </Field>
            </>
          )}
          <Field label="Transition">
            <select
              data-testid="proto-transition"
              value={p.transition || (p.action === "overlay" ? "slide-up" : "instant")}
              onChange={(e) => updateNode(node.id, { prototype: { transition: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="instant">Instant</option>
              {p.action === "overlay" ? (
                <>
                  <option value="slide-up">Slide Up</option>
                  <option value="fade">Fade</option>
                </>
              ) : (
                <>
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                </>
              )}
            </select>
          </Field>
        </div>
      </div>
    </aside>
  );
}
