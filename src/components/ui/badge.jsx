import React from "react";

const badgeStyles = {
  default: "border border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] text-muted",
  accent: "border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent-foreground))]",
  outline: "border border-[hsl(var(--border))] text-muted",
};

export function Badge({ className = "", variant = "default", ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] ${badgeStyles[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
