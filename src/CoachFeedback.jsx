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

  if (last.pendingAnalysis) {
    feedback = "Analyzing your last move…";
    tone = "neutral";
  } else if (last.classification === "blunder") {
    feedback = "Blunder. You likely dropped major material or walked into tactics.";
    tone = "bad";
  } else if (last.classification === "mistake") {
    feedback = "Mistake. There was a clearly stronger continuation.";
    tone = "warn";
  } else if (last.classification === "inaccuracy") {
    feedback = "Inaccuracy. Playable, but you gave up some edge.";
    tone = "warn";
  } else if (last.classification === "best") {
    feedback = "Best move. That's engine-approved precision.";
    tone = "good";
  } else if (last.classification === "excellent") {
    feedback = "Excellent move. Very close to best play.";
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
