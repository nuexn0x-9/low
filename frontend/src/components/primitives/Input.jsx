import React from "react";

export const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`h-7 w-full rounded-md border border-[#d4d4d8] bg-white px-2 text-xs text-[#18181b] outline-none transition-colors focus:border-[#18181b] placeholder:text-[#a1a1aa] ${className}`}
      {...props}
    />
  );
};

export const Field = ({ label, children }) => (
  <label className="flex items-center gap-2">
    <span className="w-14 shrink-0 text-[11px] text-[#71717a]">{label}</span>
    {children}
  </label>
);

export const Segmented = ({ options, value, onChange, testid }) => (
  <div
    data-testid={testid}
    className="inline-flex rounded-md border border-[#d4d4d8] bg-[#f4f4f5] p-0.5"
  >
    {options.map((o) => (
      <button
        key={o.value}
        data-testid={testid ? `${testid}-${o.value}` : undefined}
        onClick={() => onChange(o.value)}
        className={`flex h-6 min-w-7 items-center justify-center rounded px-2 text-xs font-medium transition-colors ${
          value === o.value
            ? "bg-white text-[#18181b] shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
            : "text-[#71717a] hover:text-[#18181b]"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default Input;
