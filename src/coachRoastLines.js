const TITLE_BY_BUCKET = {
  brilliant: { title: "Brilliant", emoji: "👑" },
  great: { title: "Great", emoji: "🔥" },
  good: { title: "Good", emoji: "✅" },
  meh: { title: "Meh", emoji: "😐" },
  inaccuracy: { title: "Inaccuracy", emoji: "🤨" },
  mistake: { title: "Mistake", emoji: "💀" },
  blunder: { title: "Blunder", emoji: "🚨" },
  calm: { title: "Coach", emoji: "🧘" },
  thinking: { title: "Coach is thinking", emoji: "🧠" },
};

export const brilliantLines = [
  "ARE YOU THE NEXT MAGNUS?? {move} had main-character energy.",
  "Okay that was clean. Like, suspiciously clean.",
  "That move had aura. I can’t even lie.",
  "Stockfish blinked. You didn’t.",
  "You just cooked a 3-course meal on this board.",
  "{move} was so crisp my screen gained 120Hz.",
];

export const greatLines = [
  "Big brain route selected. {move} was heat.",
  "You played that like you already saw the recap video.",
  "Great move. No notes. Maybe one tiny flex.",
  "Clean technique. Opponent definitely sighed.",
  "That was tasteful violence.",
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

export const inaccuracyLines = [
  "You just gave them a little gift basket.",
  "We were winning and you said ‘nah’.",
  "That’s the chess equivalent of tripping up the stairs.",
  "Inaccuracy unlocked. Free initiative for the other side.",
  "{move} was generous in all the wrong ways.",
];

export const mistakeLines = [
  "Brother… what are we doing.",
  "You had ONE job: don’t drop the position.",
  "That’s a blunder in slow motion.",
  "We had the eval in a safe place and then {move} happened.",
  "That move was sponsored by chaos.",
  "I need a replay because surely that was lag.",
];

export const blunderLines = [
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
  brilliant: ["Excellent move. Keep this level of precision."],
  great: ["Great choice. You improved your position."],
  good: ["Good move. Position remains healthy."],
  meh: ["Playable move. There were stronger options."],
  inaccuracy: ["Inaccuracy. Try to keep more pressure next move."],
  mistake: ["Mistake. This gave away significant evaluation."],
  blunder: ["Blunder. Tactical danger increased sharply."],
};

const linesByBucket = {
  brilliant: brilliantLines,
  great: greatLines,
  good: goodLines,
  meh: mehLines,
  inaccuracy: inaccuracyLines,
  mistake: mistakeLines,
  blunder: blunderLines,
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
  const recent = context?.recentLines || [];
  const roastMode = context?.roastMode !== false;
  const pool = roastMode
    ? linesByBucket[normalizedBucket] || mehLines
    : calmLines[normalizedBucket] || calmLines.meh;

  const candidates = pool.filter((line) => !recent.includes(injectContext(line, context)));
  const selectedPool = candidates.length ? candidates : pool;
  const template = selectedPool[Math.floor(Math.random() * selectedPool.length)] || pool[0] || "Solid move.";
  const line = injectContext(template, context);

  const header = TITLE_BY_BUCKET[normalizedBucket] || TITLE_BY_BUCKET.meh;
  if (!roastMode && normalizedBucket !== "thinking") {
    return { title: `${header.title} (${context?.cpl ?? "--"} CPL)`, line, emoji: "🧘" };
  }
  return { title: header.title, line, emoji: header.emoji };
}
