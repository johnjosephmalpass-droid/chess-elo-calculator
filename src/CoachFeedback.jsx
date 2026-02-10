import React from "react";

export default function CoachFeedback({ moves, youColor, result }) {
  if (!moves.length) {
    return <div className="text-sm text-neutral-400">Play a move to get live coaching tips.</div>;
  }

  const yourMoves = moves.filter((m) => m.side === youColor);
  const last = yourMoves[yourMoves.length - 1];
  if (!last) return <div className="text-sm text-neutral-400">Waiting for your move…</div>;

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

  const toneClass =
    tone === "bad"
      ? "text-rose-200"
      : tone === "warn"
      ? "text-amber-200"
      : tone === "good"
      ? "text-emerald-200"
      : "text-neutral-200";

  return <div className={`text-sm leading-relaxed ${toneClass}`}>{feedback}</div>;
}
