import React from "react";

export default function CoachFeedback({ moves, youColor, result, className = "", title = "Coach says" }) {
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

  const toneClasses =
    tone === "bad"
      ? "border-[hsl(var(--danger)/0.5)] bg-[hsl(var(--danger)/0.15)]"
      : tone === "warn"
      ? "border-[hsl(var(--warning)/0.5)] bg-[hsl(var(--warning)/0.15)]"
      : tone === "good"
      ? "border-[hsl(var(--success)/0.5)] bg-[hsl(var(--success)/0.15)]"
      : "border-[hsl(var(--border))] bg-[hsl(var(--surface-3))]";

  return (
    <div className={`p-4 rounded-[var(--radius-md)] border ${toneClasses} ${className}`.trim()}>
      <div className="font-semibold text-lg mb-1">{title}:</div>
      <div className="text-sm text-muted">{feedback}</div>
    </div>
  );
}
