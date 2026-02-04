import React from "react";

export default function MoveList({ moves }) {
  if (!moves.length) return <div className="text-neutral-400">No moves yet.</div>;
  return (
    <ol className="space-y-1.5">
      {moves.map((m, idx) => {
        const tone = m.loss > 300 ? "text-rose-300" : m.loss > 120 ? "text-amber-300" : "text-emerald-300";
        return (
          <li key={idx} className="flex items-center justify-between gap-2">
            <span className="text-neutral-300">
              {idx + 1}. {m.side === "w" ? "W" : "B"} <span className="font-medium text-neutral-100">{m.from}-{m.to}{m.promo ? `=${m.promo.toUpperCase()}` : ""}</span>
            </span>
            <span className={`text-xs ${tone}`}>loss {Math.round(m.loss)}cp</span>
          </li>
        );
      })}
    </ol>
  );
}
