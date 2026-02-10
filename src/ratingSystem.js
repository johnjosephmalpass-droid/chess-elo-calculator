const CALIBRATION_BOT_ELO = 1000;
const DEFAULT_ELO = CALIBRATION_BOT_ELO;
const MIN_ELO = 200;
const MAX_ELO = 2800;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothStep(value, edge0, edge1) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getQualityAdjustment(acpl) {
  if (!Number.isFinite(acpl)) return 0;

  const bands = [
    { cp: 15, score: 250 },
    { cp: 30, score: 150 },
    { cp: 60, score: 50 },
    { cp: 100, score: -50 },
    { cp: 160, score: -200 },
    { cp: 250, score: -400 },
  ];

  if (acpl <= bands[0].cp) return bands[0].score;

  for (let i = 0; i < bands.length - 1; i++) {
    const a = bands[i];
    const b = bands[i + 1];
    if (acpl <= b.cp) {
      const t = smoothStep(acpl, a.cp, b.cp);
      return Math.round(a.score + (b.score - a.score) * t);
    }
  }

  return -400;
}

function getAccuracyAdjustment(accuracy) {
  if (!Number.isFinite(accuracy)) return 0;

  if (accuracy >= 95) return 260;
  if (accuracy >= 90) return 170;
  if (accuracy >= 85) return 90;
  if (accuracy >= 80) return 20;
  if (accuracy >= 75) return -70;
  if (accuracy >= 70) return -160;
  if (accuracy >= 65) return -250;
  if (accuracy >= 60) return -330;
  if (accuracy >= 55) return -420;
  if (accuracy >= 50) return -520;
  return -650;
}

function getConsistencyPenalty({ movesAnalyzed = 0, blunders = 0, mistakes = 0, inaccuracies = 0 }) {
  const moveCount = Math.max(1, movesAnalyzed);
  const severeRate = (Math.max(0, blunders) + Math.max(0, mistakes) * 0.65) / moveCount;
  const noisyRate = (Math.max(0, inaccuracies) + Math.max(0, mistakes)) / moveCount;

  const severePenalty = Math.round(Math.min(280, severeRate * 520));
  const noisyPenalty = Math.round(Math.min(120, noisyRate * 130));
  return -(severePenalty + noisyPenalty);
}

function getMoveQualityBalance({
  movesAnalyzed = 0,
  bestMoves = 0,
  excellentMoves = 0,
  goodMoves = 0,
  inaccuracies = 0,
  mistakes = 0,
  blunders = 0,
}) {
  const total = Math.max(1, movesAnalyzed);
  const positive = (Math.max(0, bestMoves) * 1.3 + Math.max(0, excellentMoves) + Math.max(0, goodMoves) * 0.6) / total;
  const negative =
    (Math.max(0, inaccuracies) * 0.7 + Math.max(0, mistakes) * 1.6 + Math.max(0, blunders) * 3.1) / total;

  return Math.round((positive - negative) * 220);
}

function getResultScore(gameResult) {
  if (gameResult === "win") return 1;
  if (gameResult === "draw") return 0.5;
  return 0;
}

function getResultAdjustment(gameResult) {
  if (gameResult === "win") return 140;
  if (gameResult === "loss") return -140;
  return 0;
}

function getRangeFromGames(gamesRated) {
  if (gamesRated < 1) return 260;
  if (gamesRated < 3) return 220;
  if (gamesRated < 5) return 180;
  if (gamesRated < 10) return 130;
  if (gamesRated < 20) return 90;
  return 60;
}

function getNoisyRangeBoost({ movesAnalyzed, endedQuickly, mateSeen }) {
  let boost = 0;
  if (movesAnalyzed < 6) boost += 120;
  else if (movesAnalyzed < 10) boost += 60;

  if (endedQuickly) boost += 40;
  if (mateSeen) boost += 30;

  return boost;
}

export function getConfidenceLabel(gamesRated) {
  if (gamesRated < 5) return "Low";
  if (gamesRated < 20) return "Medium";
  return "High";
}

export function getInitialRatingState() {
  const uncertainty = getRangeFromGames(0);
  return {
    playerElo: DEFAULT_ELO,
    gamesRated: 0,
    uncertainty,
    rangeLow: DEFAULT_ELO - uncertainty,
    rangeHigh: DEFAULT_ELO + uncertainty,
    confidence: getConfidenceLabel(0),
    lastOpponentElo: CALIBRATION_BOT_ELO,
    lastGameSummary: null,
  };
}

function getKFactor(gamesRated) {
  if (gamesRated < 1) return 50;
  if (gamesRated < 3) return 38;
  if (gamesRated < 10) return 24;
  if (gamesRated < 20) return 18;
  return 12;
}

function getAlpha(gamesRated) {
  return clamp(0.88 - 0.07 * gamesRated, 0.26, 0.88);
}

function getMaxSwing(gamesRated) {
  if (gamesRated < 1) return 700;
  if (gamesRated < 2) return 420;
  if (gamesRated < 5) return 280;
  if (gamesRated < 15) return 180;
  return 120;
}

function getCatastrophicPenalty({ catastrophicErrors = 0, blunders = 0, mateSeen = false, endedQuickly = false, result }) {
  let penalty = Math.max(0, catastrophicErrors) * 110;

  if (Math.max(0, blunders) >= 3) penalty += 90;
  if (mateSeen && result === "loss") penalty += endedQuickly ? 90 : 45;

  return -Math.min(360, penalty);
}

export function estimatePerformanceElo({
  acpl,
  accuracy,
  blunders = 0,
  mistakes = 0,
  inaccuracies = 0,
  goodMoves = 0,
  excellentMoves = 0,
  bestMoves = 0,
  result,
  opponentElo,
  movesAnalyzed = 0,
  endedQuickly = false,
  mateSeen = false,
  catastrophicErrors,
}) {
  const base = Number.isFinite(opponentElo) ? opponentElo : DEFAULT_ELO;
  const resultAdjustment = getResultAdjustment(result);
  const qualityAdjustment = getQualityAdjustment(acpl);
  const accuracyAdjustment = getAccuracyAdjustment(accuracy);
  const consistencyPenalty = getConsistencyPenalty({ movesAnalyzed, blunders, mistakes, inaccuracies });
  const moveQualityBalance = getMoveQualityBalance({
    movesAnalyzed,
    bestMoves,
    excellentMoves,
    goodMoves,
    inaccuracies,
    mistakes,
    blunders,
  });
  const blunderPenalty = -Math.min(360, Math.max(0, blunders) * 120);
  const mistakePenalty = -Math.min(240, Math.max(0, mistakes) * 60);
  const inaccuracyPenalty = -Math.min(120, Math.max(0, inaccuracies) * 20);
  const lowAccuracyExtraPenalty = Number.isFinite(accuracy) && accuracy < 60 ? -Math.round((60 - accuracy) * 8) : 0;
  const catastrophicPenalty = getCatastrophicPenalty({
    catastrophicErrors,
    blunders,
    mateSeen,
    endedQuickly,
    result,
  });

  const rawPerformance =
    base +
    resultAdjustment +
    qualityAdjustment +
    accuracyAdjustment +
    consistencyPenalty +
    moveQualityBalance +
    blunderPenalty +
    mistakePenalty +
    inaccuracyPenalty +
    lowAccuracyExtraPenalty +
    catastrophicPenalty;
  const performanceElo = clamp(Math.round(rawPerformance), MIN_ELO, MAX_ELO);

  const baseRange = getRangeFromGames(0);
  const noiseBoost = getNoisyRangeBoost({ movesAnalyzed, endedQuickly, mateSeen });
  const rangeHalfWidth = clamp(baseRange + noiseBoost, 120, 320);

  return {
    performanceElo,
    performanceRange: {
      low: clamp(performanceElo - rangeHalfWidth, MIN_ELO, MAX_ELO),
      high: clamp(performanceElo + rangeHalfWidth, MIN_ELO, MAX_ELO),
      halfWidth: rangeHalfWidth,
    },
    components: {
      resultAdjustment,
      qualityAdjustment,
      accuracyAdjustment,
      consistencyPenalty,
      moveQualityBalance,
      blunderPenalty,
      mistakePenalty,
      inaccuracyPenalty,
      lowAccuracyExtraPenalty,
      catastrophicPenalty,
    },
  };
}

export function updatePlayerElo(ratingState, opponentElo, gameResult, analysisSummary) {
  const currentElo = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;

  const safeOpponentElo = Number.isFinite(opponentElo) ? opponentElo : CALIBRATION_BOT_ELO;
  const actualScore = getResultScore(gameResult);
  const expectedScore = 1 / (1 + 10 ** ((safeOpponentElo - currentElo) / 400));
  const kFactor = getKFactor(gamesRated);
  const eloAfterClassic = Math.round(currentElo + kFactor * (actualScore - expectedScore));

  const perf = estimatePerformanceElo({
    ...analysisSummary,
    result: gameResult,
    opponentElo: safeOpponentElo,
  });

  const alpha = getAlpha(gamesRated);
  const blended = Math.round((1 - alpha) * eloAfterClassic + alpha * perf.performanceElo);
  const maxSwing = getMaxSwing(gamesRated);
  const lowerBound = currentElo - maxSwing;
  const upperBound = currentElo + maxSwing;
  const playerElo = clamp(blended, lowerBound, upperBound);

  const nextGamesRated = gamesRated + 1;
  const baseUncertainty = getRangeFromGames(nextGamesRated);
  const noiseBoost = getNoisyRangeBoost(analysisSummary || {});
  const uncertainty = clamp(baseUncertainty + Math.round(noiseBoost * 0.5), 60, 300);

  return {
    nextState: {
      ...ratingState,
      playerElo,
      gamesRated: nextGamesRated,
      uncertainty,
      rangeLow: clamp(playerElo - uncertainty, MIN_ELO, MAX_ELO),
      rangeHigh: clamp(playerElo + uncertainty, MIN_ELO, MAX_ELO),
      confidence: getConfidenceLabel(nextGamesRated),
      lastOpponentElo: safeOpponentElo,
      lastGameSummary: {
        ...(analysisSummary || {}),
        result: gameResult,
        performanceElo: perf.performanceElo,
        performanceRange: perf.performanceRange,
      },
    },
    summary: {
      expectedScore,
      kFactor,
      actualScore,
      alpha,
      maxSwing,
      eloAfterClassic,
      performanceElo: perf.performanceElo,
      performanceRange: perf.performanceRange,
      performanceComponents: perf.components,
      uncertainty,
      confidence: getConfidenceLabel(nextGamesRated),
      clampedLow: lowerBound,
      clampedHigh: upperBound,
    },
  };
}

export function chooseBotElo(ratingState) {
  const gamesRated = ratingState?.gamesRated || 0;

  if (gamesRated === 0) {
    return CALIBRATION_BOT_ELO;
  }

  const baseElo = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;

  // Adaptive hidden opponent: from game 2 onward mirror the current estimate.
  return clamp(Math.round(baseElo), MIN_ELO, MAX_ELO);
}

export function mapMovetimeFromElo(botElo) {
  const clamped = clamp(botElo, MIN_ELO, MAX_ELO);
  const ratio = (clamped - MIN_ELO) / (MAX_ELO - MIN_ELO);
  return Math.round(80 + ratio * (450 - 80));
}
