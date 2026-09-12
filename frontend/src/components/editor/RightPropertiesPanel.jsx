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
  Sparkles,
  Sliders,
  Unlink,
} from "lucide-react";
import { Input, Field, Segmented } from "@/components/primitives/Input";
import { STYLE_PRESETS, FRAME_PRESETS, getFramePreset } from "@/data/storage";

const NumberField = ({ label, value, onChange, testid, suffix, placeholder, step = 1 }) => (
  <Field label={label}>
    <div className="relative flex-1">
      <input
        data-testid={testid}
        type="number"
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
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

const ColorField = ({ label, value, onChange, testid, placeholder, designTokens }) => (
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
  onDetachInstance,
  onApplyPreset,
  designTokens,
  mode,
  frames = [],
  activeFrame = null,
  onChangeFramePreset,
  onChangeFrameDimensions,
  onUpdateSafeArea,
  onCreateAutoLayout,
}) {
  // Style preset applicator helper
  const handleApplyPreset = (presetKey, targetNodes) => {
    const preset = STYLE_PRESETS[presetKey];
    if (!preset) return;
    if (onApplyPreset) {
      onApplyPreset(presetKey, targetNodes.map((n) => n.id));
      return;
    }
    targetNodes.forEach((n) => {
      updateNode(n.id, { style: { ...preset.style } });
    });
  };

  // If selectedNodes is provided and has multiple elements, render Multi-selection mode
  const isMulti = selectedNodes && selectedNodes.length > 1;

  if (isMulti) {
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
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e4e4e7] px-3">
          <span className="text-xs font-semibold text-[#18181b]">
            Multiple Selection ({selectedNodes.length})
          </span>
          <button
            data-testid="bulk-delete-btn"
            onClick={() => {
              if (deleteNodes) deleteNodes(selectedNodes.map((n) => n.id));
              else selectedNodes.forEach((n) => deleteNode(n.id));
            }}
            title="Delete Selected"
            className="rounded p-1 text-[#a1a1aa] hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Group / Auto Layout Workflow */}
        <Group title="Selection Workflow">
          <button
            data-testid="group-selection-btn"
            onClick={onGroup}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
          >
            <FolderPlus size={14} />
            <span>Group Elements (Ctrl+G)</span>
          </button>
          <button
            data-testid="create-autolayout-btn"
            onClick={() => onCreateAutoLayout && onCreateAutoLayout("vertical")}
            className="mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
          >
            <Layers size={14} />
            <span>Create Auto Layout (Shift+A)</span>
          </button>
        </Group>

        {/* Style Presets */}
        <Group title="Style Presets">
          <Field label="Preset">
            <select
              data-testid="multi-style-preset-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleApplyPreset(e.target.value, selectedNodes);
                  e.target.value = "";
                }
              }}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="" disabled>Apply Style Preset...</option>
              {Object.entries(STYLE_PRESETS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </Group>

        {/* Alignment Tools */}
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
        </Group>

        {/* Distribute Spacing Tools */}
        {selectedNodes.length >= 3 && (
          <Group title="Distribute Spacing">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                data-testid="distribute-h-btn"
                onClick={() => onDistribute && onDistribute("horizontal")}
                className="flex h-7 items-center justify-center gap-1.5 rounded border border-[#d4d4d8] bg-white text-xs text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors"
              >
                <AlignHorizontalSpaceAround size={13} />
                <span>Horizontal</span>
              </button>
              <button
                data-testid="distribute-v-btn"
                onClick={() => onDistribute && onDistribute("vertical")}
                className="flex h-7 items-center justify-center gap-1.5 rounded border border-[#d4d4d8] bg-white text-xs text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] transition-colors"
              >
                <AlignVerticalSpaceAround size={13} />
                <span>Vertical</span>
              </button>
            </div>
          </Group>
        )}

        {/* Bulk Appearance */}
        <Group title="Bulk Appearance">
          <ColorField
            label="Fill"
            testid="bulk-fill"
            value={commonFill}
            placeholder={commonFill === undefined ? "Mixed" : ""}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { fill: v } }));
            }}
          />
          <ColorField
            label="Stroke"
            testid="bulk-stroke"
            value={commonStroke}
            placeholder={commonStroke === undefined ? "Mixed" : ""}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { stroke: v } }));
            }}
          />
          <NumberField
            label="Radius"
            testid="bulk-radius"
            value={commonRadius}
            placeholder={commonRadius === undefined ? "Mixed" : ""}
            onChange={(v) => {
              selectedNodes.forEach((n) => updateNode(n.id, { style: { radius: v } }));
            }}
          />
          <NumberField
            label="Opacity"
            suffix="%"
            testid="bulk-opacity"
            value={commonOpacity}
            placeholder={commonOpacity === undefined ? "Mixed" : ""}
            onChange={(v) => {
              const clamped = Math.max(0, Math.min(100, v ?? 100));
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
    const currentPresetDef = getFramePreset(activeFrame?.preset);
    const currentPreset = currentPresetDef ? currentPresetDef.name : (activeFrame?.preset || "iPhone 15");
    const sa = activeFrame?.safeArea || { top: 44, bottom: 34, left: 0, right: 0, visible: true };
    return (
      <aside data-testid="properties-panel" className="low-scroll flex w-72 shrink-0 flex-col overflow-auto border-l border-[#e4e4e7] bg-white">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#e4e4e7] px-3 text-xs font-semibold text-[#18181b]">
          <span>Screen Properties</span>
          <span className="text-[11px] text-[#a1a1aa]">{activeFrame?.name || "Screen"}</span>
        </div>

        {/* Frame Preset */}
        <Group title="Frame Preset">
          <Field label="Preset">
            <select
              data-testid="frame-preset-select"
              value={currentPreset}
              onChange={(e) => onChangeFramePreset && onChangeFramePreset(e.target.value, activeFrame?.id)}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              {Object.keys(FRAME_PRESETS).map((pKey) => (
                <option key={pKey} value={pKey}>
                  {`${pKey} (${FRAME_PRESETS[pKey].width} × ${FRAME_PRESETS[pKey].height})`}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <NumberField
              label="W"
              testid="frame-width-input"
              value={activeFrame?.width || 390}
              onChange={(w) => {
                if (onChangeFrameDimensions && activeFrame) {
                  onChangeFrameDimensions(activeFrame.id, w, activeFrame.height || 844);
                }
              }}
            />
            <NumberField
              label="H"
              testid="frame-height-input"
              value={activeFrame?.height || 844}
              onChange={(h) => {
                if (onChangeFrameDimensions && activeFrame) {
                  onChangeFrameDimensions(activeFrame.id, activeFrame.width || 390, h);
                }
              }}
            />
          </div>
        </Group>

        {/* Safe Area Insets */}
        <Group title="Safe Area Insets">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#71717a]">Show Guide</span>
            <input
              type="checkbox"
              data-testid="safe-area-visible-toggle"
              checked={sa.visible !== false}
              onChange={(e) => onUpdateSafeArea && onUpdateSafeArea({ visible: e.target.checked }, activeFrame?.id)}
              className="h-4 w-4 rounded border-[#d4d4d8] text-[#18181b] focus:ring-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Top"
              testid="safe-area-top"
              suffix="px"
              value={sa.top || 0}
              onChange={(v) => onUpdateSafeArea && onUpdateSafeArea({ top: Math.max(0, v || 0) }, activeFrame?.id)}
            />
            <NumberField
              label="Bottom"
              testid="safe-area-bottom"
              suffix="px"
              value={sa.bottom || 0}
              onChange={(v) => onUpdateSafeArea && onUpdateSafeArea({ bottom: Math.max(0, v || 0) }, activeFrame?.id)}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <NumberField
              label="Left"
              testid="safe-area-left"
              suffix="px"
              value={sa.left || 0}
              onChange={(v) => onUpdateSafeArea && onUpdateSafeArea({ left: Math.max(0, v || 0) }, activeFrame?.id)}
            />
            <NumberField
              label="Right"
              testid="safe-area-right"
              suffix="px"
              value={sa.right || 0}
              onChange={(v) => onUpdateSafeArea && onUpdateSafeArea({ right: Math.max(0, v || 0) }, activeFrame?.id)}
            />
          </div>
        </Group>

        <div className="p-3 text-[11px] text-[#a1a1aa] leading-relaxed">
          Select elements on the canvas to configure responsive constraints, auto layout, and styling.
        </div>
      </aside>
    );
  }

  const s = activeNode.style || {};
  const p = activeNode.prototype || {};
  const isText = activeNode.type === "text" || activeNode.type === "link";
  const isGroup = activeNode.type === "group";
  const isAutoLayout = activeNode.type === "autoLayout";
  const isScrollArea = activeNode.type === "scrollArea";
  const isComponentInstance = activeNode.type === "componentInstance";
  const hasFill = [
    "rectangle",
    "button",
    "input",
    "image",
    "component",
    "componentInstance",
    "bottomnav",
    "group",
    "autoLayout",
    "scrollArea",
  ].includes(activeNode.type);

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

      {/* Component Instance Section */}
      {isComponentInstance && (
        <Group title="Component Instance">
          <div className="rounded border border-[#e4e4e7] bg-[#fafafa] p-2 text-xs text-[#71717a]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#18181b]">Instance</span>
              <span className="font-mono text-[10px] text-[#a1a1aa]">{activeNode.componentId}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#71717a]">Overrides only affect this instance.</p>
          </div>
          <button
            data-testid="detach-instance-btn"
            onClick={() => onDetachInstance && onDetachInstance(activeNode.id)}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#d4d4d8] bg-white text-xs font-medium text-[#18181b] transition-colors hover:bg-[#f4f4f5]"
          >
            <Unlink size={13} />
            <span>Detach Instance</span>
          </button>
        </Group>
      )}

      {/* Style Presets Dropdown */}
      <Group title="Style Presets">
        <Field label="Preset">
          <select
            data-testid="style-preset-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleApplyPreset(e.target.value, [activeNode]);
                e.target.value = "";
              }
            }}
            className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
          >
            <option value="" disabled>Choose style preset...</option>
            {Object.entries(STYLE_PRESETS).map(([key, pr]) => (
              <option key={key} value={key}>
                {pr.name}
              </option>
            ))}
          </select>
        </Field>
      </Group>

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

      {/* Auto Layout Inspector */}
      {isAutoLayout && (
        <Group title="Auto Layout">
          <Field label="Direction">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                data-testid="autolayout-dir-vertical"
                onClick={() => updateNode(activeNode.id, { layout: { ...activeNode.layout, direction: "vertical" } })}
                className={`h-7 rounded border text-xs font-medium transition-colors ${
                  activeNode.layout?.direction !== "horizontal"
                    ? "border-[#18181b] bg-[#18181b] text-white"
                    : "border-[#d4d4d8] bg-white text-[#71717a] hover:bg-[#f4f4f5]"
                }`}
              >
                Vertical
              </button>
              <button
                type="button"
                data-testid="autolayout-dir-horizontal"
                onClick={() => updateNode(activeNode.id, { layout: { ...activeNode.layout, direction: "horizontal" } })}
                className={`h-7 rounded border text-xs font-medium transition-colors ${
                  activeNode.layout?.direction === "horizontal"
                    ? "border-[#18181b] bg-[#18181b] text-white"
                    : "border-[#d4d4d8] bg-white text-[#71717a] hover:bg-[#f4f4f5]"
                }`}
              >
                Horizontal
              </button>
            </div>
          </Field>
          <NumberField
            label="Gap"
            testid="autolayout-gap"
            suffix="px"
            value={activeNode.layout?.gap ?? 12}
            onChange={(v) => updateNode(activeNode.id, { layout: { ...activeNode.layout, gap: Math.max(0, v ?? 0) } })}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Pad T"
              testid="autolayout-padding-top"
              value={typeof activeNode.layout?.padding === "number" ? activeNode.layout.padding : activeNode.layout?.padding?.top ?? 16}
              onChange={(v) => {
                const p = typeof activeNode.layout?.padding === "object" ? { ...activeNode.layout.padding } : { top: 16, right: 16, bottom: 16, left: 16 };
                p.top = Math.max(0, v ?? 0);
                updateNode(activeNode.id, { layout: { ...activeNode.layout, padding: p } });
              }}
            />
            <NumberField
              label="Pad B"
              testid="autolayout-padding-bottom"
              value={typeof activeNode.layout?.padding === "number" ? activeNode.layout.padding : activeNode.layout?.padding?.bottom ?? 16}
              onChange={(v) => {
                const p = typeof activeNode.layout?.padding === "object" ? { ...activeNode.layout.padding } : { top: 16, right: 16, bottom: 16, left: 16 };
                p.bottom = Math.max(0, v ?? 0);
                updateNode(activeNode.id, { layout: { ...activeNode.layout, padding: p } });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Pad L"
              testid="autolayout-padding-left"
              value={typeof activeNode.layout?.padding === "number" ? activeNode.layout.padding : activeNode.layout?.padding?.left ?? 16}
              onChange={(v) => {
                const p = typeof activeNode.layout?.padding === "object" ? { ...activeNode.layout.padding } : { top: 16, right: 16, bottom: 16, left: 16 };
                p.left = Math.max(0, v ?? 0);
                updateNode(activeNode.id, { layout: { ...activeNode.layout, padding: p } });
              }}
            />
            <NumberField
              label="Pad R"
              testid="autolayout-padding-right"
              value={typeof activeNode.layout?.padding === "number" ? activeNode.layout.padding : activeNode.layout?.padding?.right ?? 16}
              onChange={(v) => {
                const p = typeof activeNode.layout?.padding === "object" ? { ...activeNode.layout.padding } : { top: 16, right: 16, bottom: 16, left: 16 };
                p.right = Math.max(0, v ?? 0);
                updateNode(activeNode.id, { layout: { ...activeNode.layout, padding: p } });
              }}
            />
          </div>
          <Field label="Align">
            <select
              data-testid="autolayout-align-select"
              value={activeNode.layout?.align || "stretch"}
              onChange={(e) => updateNode(activeNode.id, { layout: { ...activeNode.layout, align: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="stretch">Stretch</option>
            </select>
          </Field>
          <Field label="Justify">
            <select
              data-testid="autolayout-justify-select"
              value={activeNode.layout?.justify || "start"}
              onChange={(e) => updateNode(activeNode.id, { layout: { ...activeNode.layout, justify: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="space-between">Space Between</option>
            </select>
          </Field>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#71717a]">Wrap</span>
            <input
              type="checkbox"
              data-testid="autolayout-wrap-toggle"
              checked={Boolean(activeNode.layout?.wrap)}
              onChange={(e) => updateNode(activeNode.id, { layout: { ...activeNode.layout, wrap: e.target.checked } })}
              className="h-4 w-4 rounded border-[#d4d4d8] text-[#18181b] focus:ring-0"
            />
          </div>
        </Group>
      )}

      {/* Child Sizing inside Auto Layout */}
      {activeNode.parentId && (
        <Group title="Layout Sizing">
          <Field label="Width">
            <select
              data-testid="child-sizing-width-select"
              value={activeNode.layoutSizing?.width || "fixed"}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  layoutSizing: { ...(activeNode.layoutSizing || {}), width: e.target.value },
                })
              }
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="fixed">Fixed</option>
              <option value="fill">Fill Container</option>
              <option value="hug">Hug Contents</option>
            </select>
          </Field>
          <Field label="Height">
            <select
              data-testid="child-sizing-height-select"
              value={activeNode.layoutSizing?.height || "fixed"}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  layoutSizing: { ...(activeNode.layoutSizing || {}), height: e.target.value },
                })
              }
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="fixed">Fixed</option>
              <option value="fill">Fill Container</option>
              <option value="hug">Hug Contents</option>
            </select>
          </Field>
        </Group>
      )}

      {/* Responsive Constraints for Top-level nodes */}
      {!activeNode.parentId && (
        <Group title="Responsive Constraints">
          <Field label="Horizontal">
            <select
              data-testid="constraint-horizontal-select"
              value={activeNode.constraints?.horizontal || "left"}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  constraints: { ...(activeNode.constraints || {}), horizontal: e.target.value },
                })
              }
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="left">Left (Pin Left)</option>
              <option value="right">Right (Pin Right)</option>
              <option value="left-right">Left & Right (Stretch)</option>
              <option value="center">Center</option>
              <option value="scale">Scale (%)</option>
            </select>
          </Field>
          <Field label="Vertical">
            <select
              data-testid="constraint-vertical-select"
              value={activeNode.constraints?.vertical || "top"}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  constraints: { ...(activeNode.constraints || {}), vertical: e.target.value },
                })
              }
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="top">Top (Pin Top)</option>
              <option value="bottom">Bottom (Pin Bottom)</option>
              <option value="top-bottom">Top & Bottom (Stretch)</option>
              <option value="center">Center</option>
              <option value="scale">Scale (%)</option>
            </select>
          </Field>
        </Group>
      )}

      {/* Scroll Area Inspector */}
      {isScrollArea && (
        <Group title="Scroll Area">
          <Field label="Direction">
            <select
              data-testid="scrollarea-direction-select"
              value={activeNode.scroll?.direction || "vertical"}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  scroll: { ...(activeNode.scroll || {}), direction: e.target.value },
                })
              }
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <NumberField
            label="Content H"
            testid="scrollarea-content-height"
            suffix="px"
            value={activeNode.scroll?.contentHeight || 1000}
            onChange={(v) =>
              updateNode(activeNode.id, {
                scroll: { ...(activeNode.scroll || {}), contentHeight: Math.max(0, v ?? 1000) },
              })
            }
          />
          <NumberField
            label="Content W"
            testid="scrollarea-content-width"
            suffix="px"
            value={activeNode.scroll?.contentWidth || activeNode.width}
            onChange={(v) =>
              updateNode(activeNode.id, {
                scroll: { ...(activeNode.scroll || {}), contentWidth: Math.max(0, v ?? activeNode.width) },
              })
            }
          />
        </Group>
      )}

      {/* Text / Override Content */}
      {isText && (
        <Group title="Content">
          <Input
            data-testid="prop-text"
            value={activeNode.text}
            onChange={(e) => updateNode(activeNode.id, { text: e.target.value })}
          />
        </Group>
      )}

      {isComponentInstance && (
        <Group title="Instance Overrides">
          <Field label="Text">
            <Input
              data-testid="prop-override-text"
              value={activeNode.overrides?.text ?? activeNode.text ?? ""}
              onChange={(e) =>
                updateNode(activeNode.id, {
                  overrides: { ...(activeNode.overrides || {}), text: e.target.value },
                })
              }
            />
          </Field>
        </Group>
      )}

      <Group title="Appearance">
        {hasFill && (
          <ColorField
            label="Fill"
            testid="prop-fill"
            value={isComponentInstance ? (activeNode.overrides?.style?.fill ?? s.fill) : s.fill}
            onChange={(v) => {
              if (isComponentInstance) {
                updateNode(activeNode.id, {
                  overrides: {
                    ...(activeNode.overrides || {}),
                    style: { ...(activeNode.overrides?.style || {}), fill: v },
                  },
                });
              } else {
                updateNode(activeNode.id, { style: { fill: v } });
              }
            }}
          />
        )}
        {(hasFill || activeNode.type !== "text") && (
          <ColorField
            label="Stroke"
            testid="prop-stroke"
            value={isComponentInstance ? (activeNode.overrides?.style?.stroke ?? s.stroke) : s.stroke}
            onChange={(v) => {
              if (isComponentInstance) {
                updateNode(activeNode.id, {
                  overrides: {
                    ...(activeNode.overrides || {}),
                    style: { ...(activeNode.overrides?.style || {}), stroke: v },
                  },
                });
              } else {
                updateNode(activeNode.id, { style: { stroke: v } });
              }
            }}
          />
        )}
        <NumberField
          label="Radius"
          testid="prop-radius"
          value={isComponentInstance ? (activeNode.overrides?.style?.radius ?? s.radius) : s.radius}
          onChange={(v) => {
            if (isComponentInstance) {
              updateNode(activeNode.id, {
                overrides: {
                  ...(activeNode.overrides || {}),
                  style: { ...(activeNode.overrides?.style || {}), radius: v },
                },
              });
            } else {
              updateNode(activeNode.id, { style: { radius: v } });
            }
          }}
        />
        <NumberField
          label="Opacity"
          suffix="%"
          testid="prop-opacity"
          value={isComponentInstance ? (activeNode.overrides?.style?.opacity ?? s.opacity) : s.opacity}
          onChange={(v) => {
            const clamped = Math.max(0, Math.min(100, v ?? 100));
            if (isComponentInstance) {
              updateNode(activeNode.id, {
                overrides: {
                  ...(activeNode.overrides || {}),
                  style: { ...(activeNode.overrides?.style || {}), opacity: clamped },
                },
              });
            } else {
              updateNode(activeNode.id, { style: { opacity: clamped } });
            }
          }}
        />
      </Group>

      {/* Typography Section (Text, Link, Button, or Component Instance) */}
      {(isText || activeNode.type === "button" || isComponentInstance) && (
        <Group title="Typography">
          <ColorField
            label="Color"
            testid="prop-color"
            value={s.color}
            onChange={(v) => updateNode(activeNode.id, { style: { color: v } })}
          />
          <Field label="Font">
            <select
              data-testid="prop-fontfamily"
              value={s.fontFamily || "Inter"}
              onChange={(e) => updateNode(activeNode.id, { style: { fontFamily: e.target.value } })}
              className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="SF Pro, -apple-system, sans-serif">SF Pro / System</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="monospace">Monospace</option>
            </select>
          </Field>
          <NumberField
            label="Size"
            testid="prop-fontsize"
            value={s.fontSize}
            onChange={(v) => updateNode(activeNode.id, { style: { fontSize: v } })}
          />
          <Field label="Weight">
            <Segmented
              testid="prop-weight"
              value={String(s.fontWeight || 400)}
              onChange={(v) => updateNode(activeNode.id, { style: { fontWeight: Number(v) } })}
              options={[
                { value: "300", label: "L" },
                { value: "400", label: "R" },
                { value: "500", label: "M" },
                { value: "600", label: "SB" },
                { value: "700", label: "B" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Line H"
              step={0.1}
              testid="prop-lineheight"
              placeholder="1.2"
              value={s.lineHeight}
              onChange={(v) => updateNode(activeNode.id, { style: { lineHeight: v } })}
            />
            <NumberField
              label="Spacing"
              step={0.5}
              testid="prop-letterspacing"
              placeholder="0"
              suffix="px"
              value={s.letterSpacing}
              onChange={(v) => updateNode(activeNode.id, { style: { letterSpacing: v } })}
            />
          </div>
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
                  onClick={() => updateNode(activeNode.id, { style: { align: v, textAlign: v } })}
                  className={`flex h-6 w-7 items-center justify-center rounded transition-colors ${
                    (s.textAlign || s.align || "left") === v
                      ? "bg-white text-[#18181b]"
                      : "text-[#71717a] hover:text-[#18181b]"
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Field label="Case">
              <select
                data-testid="prop-texttransform"
                value={s.textTransform || "none"}
                onChange={(e) => updateNode(activeNode.id, { style: { textTransform: e.target.value } })}
                className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              >
                <option value="none">Default</option>
                <option value="uppercase">UPPER</option>
                <option value="lowercase">lower</option>
                <option value="capitalize">Capital</option>
              </select>
            </Field>
            <Field label="Deco">
              <select
                data-testid="prop-textdecoration"
                value={s.textDecoration || "none"}
                onChange={(e) => updateNode(activeNode.id, { style: { textDecoration: e.target.value } })}
                className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              >
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strike</option>
              </select>
            </Field>
          </div>
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
              <option value="navigate">Navigate</option>
              <option value="modal">Open Modal</option>
              <option value="back">Go Back</option>
            </select>
          </Field>
          {p.action !== "back" && (
            <Field label="Target">
              <select
                data-testid="proto-target"
                value={p.target || ""}
                onChange={(e) => updateNode(activeNode.id, { prototype: { target: e.target.value } })}
                className="h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-1.5 text-xs text-[#18181b] outline-none focus:border-[#18181b]"
              >
                <option value="">Select screen...</option>
                {frames.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>
    </aside>
  );
}
