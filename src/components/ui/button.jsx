import React from "react";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-50";

const variantStyles = {
  default: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[var(--shadow-soft)] hover:brightness-110",
  secondary: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-3))]",
  outline: "border border-[hsl(var(--border))] text-[hsl(var(--text))] hover:bg-[hsl(var(--surface-3))]",
  ghost: "text-[hsl(var(--text))] hover:bg-[hsl(var(--surface-3))]",
};

const sizeStyles = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5",
  lg: "h-12 px-6 text-base",
};

export function buttonVariants({ variant = "default", size = "md", className = "" } = {}) {
  return [baseStyles, variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(" ");
}

export const Button = React.forwardRef(function Button(
  { className = "", variant = "default", size = "md", type = "button", ...props },
  ref
) {
  return (
    <button ref={ref} type={type} className={buttonVariants({ variant, size, className })} {...props} />
  );
});
