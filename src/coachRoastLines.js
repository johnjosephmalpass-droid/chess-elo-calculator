const TITLE_BY_BUCKET = {
  amazing: { title: "AMAZING", emoji: "🌟" },
  brilliant: { title: "BRILLIANT", emoji: "👑" },
  good: { title: "GOOD", emoji: "✅" },
  meh: { title: "MEH", emoji: "😐" },
  bad: { title: "BAD", emoji: "⚠️" },
  awful: { title: "AWFUL", emoji: "💀" },
  horrendous: { title: "HORRENDOUS", emoji: "🚨" },
  calm: { title: "Coach", emoji: "🧘" },
  thinking: { title: "Coach is thinking…", emoji: "🧠" },
};

export const amazingLines = [
  "Engine-level touch. {move} was absolutely pristine.",
  "That move was laser-accurate. Beautiful.",
  "You found the top-tier continuation. Clean chess.",
  "Perfect timing, perfect square, zero waste.",
];

export const brilliantLines = [
  "ARE YOU THE NEXT MAGNUS?? {move} had main-character energy.",
  "Okay that was clean. Like, suspiciously clean.",
  "That move had aura. I can’t even lie.",
  "Stockfish blinked. You didn’t.",
  "You just cooked a 3-course meal on this board.",
  "{move} was so crisp my screen gained 120Hz.",
];

export const goodLines = [
  "Solid. No drama. Respect.",
  "That’s a good human move. Boring… but good.",
  "Nice. You didn’t hang anything. Growth.",
  "Dependable move. We take those.",
  "Good fundamentals. Coach nodding in approval.",
];

export const mehLines = [
  "Meh. You survived, but at what cost?",
  "Not illegal, but I wouldn’t brag.",
  "That move is… a choice.",
  "I’ve seen worse. I’ve also seen way better.",
  "Playable, but the vibes are questionable.",
];

export const badLines = [
  "That leaked too much eval. Time to stabilize.",
  "Bad miss. You gave them practical chances.",
  "You slipped there. Tighten up next move.",
  "That was a rough decision under pressure.",
];

export const awfulLines = [
  "Big drop. That hurt.",
  "Awful. You just handed over serious advantage.",
  "That move was sponsored by chaos.",
  "You had one job: keep it together.",
];

export const horrendousLines = [
  "That’s worse than the toilet after my Chipotle yesterday.",
  "You just donated that piece like it’s charity week.",
  "Congratulations, you invented a new losing line.",
  "Stockfish just filed a restraining order.",
  "If this was a job interview, you just called the CEO ‘mate’.",
  "That move left the king with zero emotional support.",
  "Somewhere a tactics book just burst into flames.",
];

export const thinkingLines = [
  "Coach is calculating the damage…",
  "Hold on, I’m trying to understand what you meant by that…",
  "Crunching numbers, hiding tears.",
  "Running Stockfish and a quick emotional recovery.",
];

const calmLines = {
  amazing: ["Amazing move. Practically no loss."],
  brilliant: ["Brilliant move. Strong precision."],
  good: ["Good move. Position remains healthy."],
  meh: ["Playable move. There were stronger options."],
  bad: ["Bad move. You gave away noticeable eval."],
  awful: ["Awful move. Major evaluation drop."],
  horrendous: ["Horrendous move. Critical damage to the position."],
};

const linesByBucket = {
  amazing: amazingLines,
  brilliant: brilliantLines,
  good: goodLines,
  meh: mehLines,
  bad: badLines,
  awful: awfulLines,
  horrendous: horrendousLines,
  thinking: thinkingLines,
};

function sanitizeMoveText(moveSan) {
  if (!moveSan) return "That move";
  return moveSan.replace(/[+#]/g, "").trim();
}

function injectContext(line, context = {}) {
  const moveText = sanitizeMoveText(context?.san);
  return line.replaceAll("{move}", moveText);
}

export function getCoachLine(bucket, context = {}) {
  const normalizedBucket = linesByBucket[bucket] ? bucket : "meh";
  const cpl = Number.isFinite(context?.cpl) ? context.cpl : null;

  // Safety rail: never praise huge losses and never insult tiny losses.
  const guardedBucket =
    cpl !== null && cpl >= 150 && ["amazing", "brilliant", "good"].includes(normalizedBucket)
      ? "awful"
      : cpl !== null && cpl <= 15 && ["bad", "awful", "horrendous"].includes(normalizedBucket)
      ? "brilliant"
      : normalizedBucket;

  const recent = context?.recentLines || [];
  const roastMode = context?.roastMode !== false;
  const pool = roastMode
    ? linesByBucket[guardedBucket] || mehLines
    : calmLines[guardedBucket] || calmLines.meh;

  const candidates = pool.filter((line) => !recent.includes(injectContext(line, context)));
  const selectedPool = candidates.length ? candidates : pool;
  const template = selectedPool[Math.floor(Math.random() * selectedPool.length)] || pool[0] || "Solid move.";
  const line = injectContext(template, context);

  const header = TITLE_BY_BUCKET[guardedBucket] || TITLE_BY_BUCKET.meh;
  if (!roastMode && guardedBucket !== "thinking") {
    return { title: header.title, line, emoji: "🧘" };
  }
  return { title: header.title, line, emoji: header.emoji };
}
