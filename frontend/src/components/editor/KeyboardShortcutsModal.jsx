import React from "react";
import { X, Command, Keyboard } from "lucide-react";

export default function KeyboardShortcutsModal({ onClose }) {
  const categories = [
    {
      title: "Selection",
      shortcuts: [
        { keys: ["Click"], desc: "Select single element" },
        { keys: ["Shift", "Click"], desc: "Toggle element selection" },
        { keys: ["Ctrl / ⌘", "Click"], desc: "Toggle element selection" },
        { keys: ["Drag Canvas"], desc: "Marquee (lasso) selection" },
        { keys: ["Esc"], desc: "Deselect all / clear selection" },
      ],
    },
    {
      title: "Transform & Edit",
      shortcuts: [
        { keys: ["Delete / ⌫"], desc: "Delete selected elements" },
        { keys: ["Ctrl / ⌘", "D"], desc: "Duplicate selection (+16px offset)" },
        { keys: ["Ctrl / ⌘", "C"], desc: "Copy selected elements" },
        { keys: ["Ctrl / ⌘", "V"], desc: "Paste elements (+20px offset)" },
        { keys: ["Arrow keys"], desc: "Nudge position by 1px" },
        { keys: ["Shift", "Arrow keys"], desc: "Nudge position by 10px" },
      ],
    },
    {
      title: "Grouping",
      shortcuts: [
        { keys: ["Ctrl / ⌘", "G"], desc: "Group selected elements" },
        { keys: ["Ctrl / ⌘", "Shift", "G"], desc: "Ungroup selected group" },
      ],
    },
    {
      title: "Layer Hierarchy",
      shortcuts: [
        { keys: ["Ctrl / ⌘", "]"], desc: "Bring forward" },
        { keys: ["Ctrl / ⌘", "["], desc: "Send backward" },
        { keys: ["Ctrl / ⌘", "Shift", "]"], desc: "Bring to front" },
        { keys: ["Ctrl / ⌘", "Shift", "["], desc: "Send to back" },
      ],
    },
    {
      title: "Navigation & History",
      shortcuts: [
        { keys: ["Space", "Drag"], desc: "Pan canvas" },
        { keys: ["Ctrl / ⌘", "Scroll"], desc: "Zoom canvas in/out" },
        { keys: ["Ctrl / ⌘", "Z"], desc: "Undo last edit" },
        { keys: ["Ctrl / ⌘", "Shift", "Z"], desc: "Redo edit" },
        { keys: ["?"], desc: "Toggle this shortcut cheat sheet" },
      ],
    },
  ];

  return (
    <div
      data-testid="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[#3f3f46] bg-[#18181b] text-[#f4f4f5] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-[#27272a] px-5 bg-[#141416]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Keyboard size={16} className="text-[#a1a1aa]" />
            Keyboard Shortcuts
          </div>
          <button
            onClick={onClose}
            data-testid="shortcuts-close-btn"
            className="rounded p-1 text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {categories.map((cat) => (
            <div key={cat.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                {cat.title}
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {cat.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#1c1c1f] px-3 py-2 text-xs"
                  >
                    <span className="text-[#d4d4d8]">{sc.desc}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kidx) => (
                        <kbd
                          key={kidx}
                          className="rounded border border-[#3f3f46] bg-[#27272a] px-1.5 py-0.5 font-mono text-[11px] font-medium text-white shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#27272a] bg-[#141416] px-5 py-3 text-center text-[11px] text-[#71717a]">
          Tip: Press <kbd className="rounded border border-[#3f3f46] bg-[#27272a] px-1 py-0.5 text-white">?</kbd> anywhere in the editor to open or close this helper.
        </div>
      </div>
    </div>
  );
}
