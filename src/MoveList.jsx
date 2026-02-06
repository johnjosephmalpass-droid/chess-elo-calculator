import React from "react";

export default function MoveList({ moves }) {
  if (!moves.length) return <div className="text-subtle">No moves yet.</div>;
  return (
    <ol className="space-y-1.5">
      {moves.map((m, idx) => {
        const tone =
          m.loss > 300
            ? "text-[hsl(var(--danger))]"
            : m.loss > 120
            ? "text-[hsl(var(--warning))]"
            : "text-[hsl(var(--success))]";
        return (
          <li key={idx} className="flex items-center justify-between gap-2">
            <span className="text-muted">
              {idx + 1}. {m.side === "w" ? "W" : "B"}{" "}
              <span className="font-medium text-white">
                {m.from}-{m.to}
                {m.promo ? `=${m.promo.toUpperCase()}` : ""}
              </span>
            </span>
            <span className={`text-xs ${tone}`}>loss {Math.round(m.loss)}cp</span>
          </li>
        );
      })}
    </ol>
  );
}
