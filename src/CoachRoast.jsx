import React from "react";
import { getCoachLine } from "./coachRoastLines";

const badgeTone = {
  Brilliant: "bg-emerald-400/20 text-emerald-100 border-emerald-200/30",
  Great: "bg-green-400/20 text-green-100 border-green-200/30",
  Good: "bg-sky-400/20 text-sky-100 border-sky-200/30",
  Meh: "bg-neutral-400/20 text-neutral-100 border-neutral-200/30",
  Inaccuracy: "bg-amber-400/20 text-amber-100 border-amber-200/30",
  Mistake: "bg-orange-500/20 text-orange-100 border-orange-200/30",
  Blunder: "bg-rose-500/20 text-rose-100 border-rose-200/30",
};

export default function CoachRoast({
  lastUserMove,
  cpl,
  bucket,
  evalDelta = null,
  isThinking,
  roastMode,
  onToggleRoastMode,
  coachMessage,
}) {
  const fallback = getCoachLine("thinking");
  const gradeLabel = bucket ? `${bucket.charAt(0).toUpperCase()}${bucket.slice(1)}` : "Meh";

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/45 p-4 shadow-lg space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-300">Coach Roast</div>
        <button
          type="button"
          onClick={onToggleRoastMode}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            roastMode ? "border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100" : "border-white/20 bg-white/10 text-neutral-100"
          }`}
        >
          {roastMode ? "Roast mode: ON" : "Calm coach"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone[gradeLabel] || badgeTone.Meh}`}>
          {isThinking ? "Evaluating…" : gradeLabel}
        </span>
        <span className="text-xs text-neutral-400">{cpl === null ? "--" : `${Math.round(cpl)} CPL`}</span>
      </div>

      <div className="rounded-xl bg-black/20 border border-white/10 p-4">
        <div className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>{isThinking ? fallback.emoji : coachMessage?.emoji || "🎤"}</span>
          <span>{isThinking ? fallback.title : coachMessage?.title || "Coach"}</span>
        </div>
        <p className="mt-2 text-lg leading-snug text-neutral-100">
          {isThinking
            ? fallback.line
            : coachMessage?.line || "Play a move and I’ll let you know how cursed or clean it was."}
        </p>
      </div>

      <div className="text-xs text-neutral-400">
        <span className="font-medium text-neutral-200">Last move:</span>{" "}
        {lastUserMove?.san || (lastUserMove ? `${lastUserMove.from}-${lastUserMove.to}` : "--")}
        {typeof evalDelta === "number" ? ` • Δ ${evalDelta > 0 ? "+" : ""}${Math.round(evalDelta)}cp` : ""}
      </div>
    </div>
  );
}
