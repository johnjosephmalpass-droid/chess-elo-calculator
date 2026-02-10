import React from "react";

export default function MoveList({ moves }) {
  if (!moves.length) return <div className="text-neutral-400">No moves yet.</div>;
  return (
    <ol className="space-y-1.5">
      {moves.map((m, idx) => {
        const tone =
          m.pendingAnalysis
            ? "text-neutral-300"
            : m.classification === "blunder"
            ? "text-rose-300"
            : m.classification === "mistake" || m.classification === "inaccuracy"
            ? "text-amber-300"
            : "text-emerald-300";
        const label = m.pendingAnalysis ? "analyzing…" : `${m.classification || "best"} · ${Math.round(m.loss || 0)}cp`;
        return (
          <li key={m.id || idx} className="flex items-center justify-between gap-2">
            <span className="text-neutral-300">
              {idx + 1}. {m.side === "w" ? "W" : "B"} <span className="font-medium text-neutral-100">{m.from}-{m.to}{m.promo ? `=${m.promo.toUpperCase()}` : ""}</span>
            </span>
            <span className={`text-xs capitalize ${tone}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
