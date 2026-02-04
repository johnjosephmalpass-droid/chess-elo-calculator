import React from "react";

export default function CoachFeedback({ moves, youColor, result }) {
  if (!moves.length) return null;
  const yourMoves = moves.filter((m) => m.side === youColor);
  const last = yourMoves[yourMoves.length - 1];
  if (!last) return null;

  let feedback = "Solid move.";
  let tone = "neutral";
  if (last.loss > 300) {
    feedback = "Blunder! Try to avoid hanging pieces.";
    tone = "bad";
  } else if (last.loss > 120) {
    feedback = "Mistake. Look for better options.";
    tone = "warn";
  } else if (last.loss > 50) {
    feedback = "Inaccuracy. Not the best, but not terrible.";
    tone = "warn";
  } else if (last.loss < 20) {
    feedback = "Excellent! That's a top move.";
    tone = "good";
  }

  if (result?.yours === "win") {
    feedback = "Victory! Well played.";
    tone = "good";
  } else if (result?.yours === "loss") {
    feedback = "Defeat. Review your blunders for improvement.";
    tone = "bad";
  } else if (result?.yours === "draw") {
    feedback = "Draw. Sometimes that's the best you can do!";
    tone = "neutral";
  }

  return (
    <div className={`p-4 rounded-2xl border mt-4 ${tone === "bad" ? "border-rose-500/40 bg-rose-900/20" : tone === "warn" ? "border-amber-500/40 bg-amber-900/20" : tone === "good" ? "border-emerald-500/40 bg-emerald-900/20" : "border-neutral-500/20 bg-neutral-900/20"}`}>
      <div className="font-semibold text-lg mb-1">Coach says:</div>
      <div className="text-sm">{feedback}</div>
    </div>
  );
}
