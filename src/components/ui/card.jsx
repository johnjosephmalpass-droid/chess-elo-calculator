import React from "react";

export function Card({ className = "", ...props }) {
  return <div className={`surface-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`px-6 pt-6 ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return <h3 className={`text-lg font-semibold ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = "", ...props }) {
  return <p className={`text-sm text-muted ${className}`.trim()} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={`px-6 pb-6 ${className}`.trim()} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return <div className={`px-6 pb-6 ${className}`.trim()} {...props} />;
}
