import React from "react";
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical as AlignTop,
  AlignCenterVertical as AlignMiddle,
  AlignEndVertical as AlignBottom,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
  Link2,
  Layers,
  FolderPlus,
  FolderMinus,
} from "lucide-react";
import { Input, Field, Segmented } from "@/components/primitives/Input";

const NumberField = ({ label, value, onChange, testid, suffix, placeholder }) => (
  <Field label={label}>
    <div className="relative flex-1">
      <input
        data-testid={testid}
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
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

const ColorField = ({ label, value, onChange, testid, placeholder }) => (
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
        placeholder={placeholder}
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
  selectedNodes = [],
  updateNode,
  updateNodes,
  deleteNode,
  deleteNodes,
  onGroup,
  onUngroup,
  onAlign,
  onDistribute,
  mode,
  frames = [],
}) {
  // If selectedNodes is provided and has multiple elements, render Multi-selection mode
  const isMulti = selectedNodes && selectedNodes.length > 1;

  if (isMulti) {
    // Check if values across selectedNodes are homogeneous or mixed
    const sameProp = (getter) => {
      const first = getter(selectedNodes[0]);
      return selectedNodes.every((n) => getter(n) === first) ? first : undefined;
    };

    const commonFill = sameProp((n) => n.style?.fill);
    const commonStroke = sameProp((n) => n.style?.stroke);
    const commonRadius = sameProp((n) => n.style?.radius);
    const commonOpacity = sameProp((n) => n.style?.opacity);

    return (
      <aside
        data-testid="properties-panel-multi"
        className="low-scroll flex w-72 shrink-0 flex-col overflow-auto border-l border-[#e4e4e7] bg-white"
      >
        {/* Header */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e4e4e7] px-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
            <Layers size={13} className="text-[#2563eb]" />
            <span>Multiple Selection</span>
            <span className="rounded bg-[#2563eb]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
              {selectedNodes.length}
            </span>
          </div>
          <button
            data-testid="bulk-delete-btn"
            onClick={() => deleteNodes ? deleteNodes(selectedNodes.map((n) => n.id)) : selectedNodes.forEach((n) => deleteNode(n.id))}
            title="Delete Selected (Delete/Backspace)"
            className="rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Alignment & Spacing */}
        <Group title="Alignment">
          <div className="flex items-center justify-between gap-1 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] p-1">
            <button
              data-testid="align-left-btn"
              title="Align Left"
              onClick={() => onAlign && onAlign("left")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignLeft size={14} />
            </button>
            <button
              data-testid="align-center-btn"
              title="Align Horizontal Center"
              onClick={() => onAlign && onAlign("center")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignCenter size={14} />
            </button>
            <button
              data-testid="align-right-btn"
              title="Align Right"
              onClick={() => onAlign && onAlign("right")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignRight size={14} />
            </button>
            <div className="h-4 w-px bg-[#d4d4d8]" />
            <button
              data-testid="align-top-btn"
              title="Align Top"
              onClick={() => onAlign && onAlign("top")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignTop size={14} />
            </button>
            <button
              data-testid="align-middle-btn"
              title="Align Vertical Middle"
              onClick={() => onAlign && onAlign("middle")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignMiddle size={14} />
            </button>
            <button
              data-testid="align-bottom-btn"
              title="Align Bottom"
              onClick={() => onAlign && onAlign("bottom")}
              className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
            >
              <AlignBottom size={14} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              data-testid="distribute-h-btn"
              onClick={() => onDistribute && onDistribute("horizontal")}
              disabled={selectedNodes.length < 3}
              title="Distribute Horizontal Spacing"
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded border border-[#d4d4d8] bg-white text-[11px] font-medium text-[#3f3f46] hover:bg-[#f4f4f5] disabled:opacity-40"
            >
              <AlignHorizontalSpaceAround size={13} />
              <span>Distribute H</span>
            </button>
            <button
              data-testid="distribute-v-btn"
              onClick={() => onDistribute && onDistribute("vertical")}
              disabled={selectedNodes.length < 3}
              title="Distribute Vertical Spacing"
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded border border-[#d4d4d8] bg-white text-[11px] font-medium text-[#3f3f46] hover:bg-[#f4f4f5] disabled:opacity-40"
            >
              <AlignVerticalSpaceAround size={13} />
              <span>Distribute V</span>
            </button>
          </div>
        </Group>

        {/* Group / Ungroup Action */}
        <Group title="Grouping">
          <button
            data-testid="group-selection-btn"
            onClick={onGroup}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#18181b] bg-[#18181b] text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
          >
            <FolderPlus size={14} />
            <span>Group Elements (Ctrl+G)</span>
          </button>
        </Group>

        {/* Bulk Appearance */}
        <Group title="Bulk Appearance">
          <ColorField
            label="Fill"
            testid="bulk-prop-fill"
            placeholder={commonFill === undefined ? "Mixed" : undefined}
            value={commonFill}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { fill: v } }));
            }}
          />
          <ColorField
            label="Stroke"
            testid="bulk-prop-stroke"
            placeholder={commonStroke === undefined ? "Mixed" : undefined}
            value={commonStroke}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { stroke: v } }));
            }}
          />
          <NumberField
            label="Radius"
            testid="bulk-prop-radius"
            placeholder={commonRadius === undefined ? "Mixed" : undefined}
            value={commonRadius}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { radius: v } }));
            }}
          />
          <NumberField
            label="Opacity"
            suffix="%"
            testid="bulk-prop-opacity"
            placeholder={commonOpacity === undefined ? "Mixed" : undefined}
            value={commonOpacity}
            onChange={(v) => {
              const clamped = Math.max(0, Math.min(100, v));
              selectedNodes.forEach((n) => updateNode(n.id, { style: { opacity: clamped } }));
            }}
          />
        </Group>
      </aside>
    );
  }

  // Single node selected or fallback
  const activeNode = node || (selectedNodes.length === 1 ? selectedNodes[0] : null);

  if (!activeNode) {
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

  const s = activeNode.style || {};
  const p = activeNode.prototype || {};
  const isText = activeNode.type === "text" || activeNode.type === "link";
  const isGroup = activeNode.type === "group";
  const hasFill = ["rectangle", "button", "input", "image", "component", "bottomnav", "group"].includes(
    activeNode.type
  );

  return (
    <aside
      data-testid="properties-panel"
      className="low-scroll flex w-72 shrink-0 flex-col overflow-auto border-l border-[#e4e4e7] bg-white"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e4e4e7] px-3">
        <span className="truncate text-xs font-semibold">{activeNode.name}</span>
        <button
          data-testid="delete-node-btn"
          onClick={() => deleteNode(activeNode.id)}
          title="Delete"
          className="rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {isGroup && (
        <Group title="Group Details">
          <div className="rounded border border-[#e4e4e7] bg-[#fafafa] p-2 text-xs text-[#71717a]">
            <p className="font-medium text-[#18181b]">{activeNode.children?.length || 0} child elements</p>
            <p className="mt-1 text-[11px] text-[#a1a1aa]">Moving the group moves all elements inside it.</p>
          </div>
          <button
            data-testid="ungroup-btn"
            onClick={() => onUngroup && onUngroup(activeNode.id)}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
          >
            <FolderMinus size={14} />
            <span>Ungroup (Ctrl+Shift+G)</span>
          </button>
        </Group>
      )}

      {/* Alignment (Single Node to Frame) */}
      <Group title="Align to Screen">
        <div className="flex items-center justify-between gap-1 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] p-1">
          <button
            data-testid="align-frame-left-btn"
            title="Align Left"
            onClick={() => onAlign && onAlign("left")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignLeft size={14} />
          </button>
          <button
            data-testid="align-frame-center-btn"
            title="Align Horizontal Center"
            onClick={() => onAlign && onAlign("center")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignCenter size={14} />
          </button>
          <button
            data-testid="align-frame-right-btn"
            title="Align Right"
            onClick={() => onAlign && onAlign("right")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignRight size={14} />
          </button>
          <div className="h-4 w-px bg-[#d4d4d8]" />
          <button
            data-testid="align-frame-top-btn"
            title="Align Top"
            onClick={() => onAlign && onAlign("top")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignTop size={14} />
          </button>
          <button
            data-testid="align-frame-middle-btn"
            title="Align Vertical Middle"
            onClick={() => onAlign && onAlign("middle")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignMiddle size={14} />
          </button>
          <button
            data-testid="align-frame-bottom-btn"
            title="Align Bottom"
            onClick={() => onAlign && onAlign("bottom")}
            className="flex h-7 flex-1 items-center justify-center rounded text-[#71717a] hover:bg-white hover:text-[#18181b] transition-colors"
          >
            <AlignBottom size={14} />
          </button>
        </div>
      </Group>

      <Group title="Position">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="X" testid="prop-x" value={activeNode.x} onChange={(v) => updateNode(activeNode.id, { x: v })} />
          <NumberField label="Y" testid="prop-y" value={activeNode.y} onChange={(v) => updateNode(activeNode.id, { y: v })} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="W" testid="prop-w" value={activeNode.width} onChange={(v) => updateNode(activeNode.id, { width: v })} />
          <NumberField label="H" testid="prop-h" value={activeNode.height} onChange={(v) => updateNode(activeNode.id, { height: v })} />
        </div>
      </Group>

      {isText && (
        <Group title="Content">
          <Input
            data-testid="prop-text"
            value={activeNode.text}
            onChange={(e) => updateNode(activeNode.id, { text: e.target.value })}
          />
        </Group>
      )}

      <Group title="Appearance">
        {hasFill && (
          <ColorField label="Fill" testid="prop-fill" value={s.fill} onChange={(v) => updateNode(activeNode.id, { style: { fill: v } })} />
        )}
        {(hasFill || activeNode.type !== "text") && (
          <ColorField label="Stroke" testid="prop-stroke" value={s.stroke} onChange={(v) => updateNode(activeNode.id, { style: { stroke: v } })} />
        )}
        <NumberField label="Radius" testid="prop-radius" value={s.radius} onChange={(v) => updateNode(activeNode.id, { style: { radius: v } })} />
        <NumberField label="Opacity" suffix="%" testid="prop-opacity" value={s.opacity} onChange={(v) => updateNode(activeNode.id, { style: { opacity: Math.max(0, Math.min(100, v)) } })} />
      </Group>

      {isText && (
        <Group title="Typography">
          <ColorField label="Color" testid="prop-color" value={s.color} onChange={(v) => updateNode(activeNode.id, { style: { color: v } })} />
          <NumberField label="Size" testid="prop-fontsize" value={s.fontSize} onChange={(v) => updateNode(activeNode.id, { style: { fontSize: v } })} />
          <Field label="Weight">
            <Segmented
              testid="prop-weight"
              value={String(s.fontWeight || 400)}
              onChange={(v) => updateNode(activeNode.id, { style: { fontWeight: Number(v) } })}
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
                  onClick={() => updateNode(activeNode.id, { style: { align: v } })}
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
              onChange={(e) => updateNode(activeNode.id, { prototype: { trigger: e.target.value } })}
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
              onChange={(e) => updateNode(activeNode.id, { prototype: { action: e.target.value } })}
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
                onChange={(e) => updateNode(activeNode.id, { prototype: { target: e.target.value } })}
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
                  onChange={(e) => updateNode(activeNode.id, { prototype: { overlayType: e.target.value } })}
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
                    onChange={(e) => updateNode(activeNode.id, { prototype: { dismissOnOutsideClick: e.target.checked } })}
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
              onChange={(e) => updateNode(activeNode.id, { prototype: { transition: e.target.value } })}
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
