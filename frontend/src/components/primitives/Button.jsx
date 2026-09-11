import React from "react";

const variants = {
  primary:
    "bg-[#18181b] text-white border border-[#18181b] hover:bg-[#27272a]",
  secondary:
    "bg-white text-[#18181b] border border-[#d4d4d8] hover:bg-[#f4f4f5]",
  ghost:
    "bg-transparent text-[#3f3f46] border border-transparent hover:bg-[#f4f4f5]",
};

const sizes = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
};

export const Button = ({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
