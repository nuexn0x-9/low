import React from "react";

export const Panel = ({ title, action, children, className = "" }) => {
  return (
    <section className={`border-b border-[#e4e4e7] ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 h-8">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">
            {title}
          </span>
          {action}
        </div>
      )}
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
};

export default Panel;
