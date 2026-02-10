const CALIBRATION_BOT_ELO = 1000;
const DEFAULT_ELO = CALIBRATION_BOT_ELO;
const MIN_ELO = 200;
const MAX_ELO = 2800;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function getResultScore(gameResult) {
  if (gameResult === "win") return 1;
  if (gameResult === "draw") return 0.5;
  return 0;
}

function getResultAdjustment(gameResult) {
  if (gameResult === "win") return 160;
  if (gameResult === "loss") return -160;
  return 0;
}

function normalizeAcpl(acpl) {
  const cp = safeNumber(acpl, 120);
  // 0cp -> +220, 120cp -> ~0, 260cp -> large negative
  return Math.round(clamp(220 - cp * 1.8, -360, 220));
}

function normalizeAccuracy(accuracy) {
  const acc = clamp(safeNumber(accuracy, 70), 0, 100);
  // 75% is neutral anchor
  return Math.round((acc - 75) * 6.2);
}

function getMoveQualityBalance({ movesAnalyzed = 0, bestMoves = 0, excellentMoves = 0, goodMoves = 0 }) {
  const total = Math.max(1, movesAnalyzed);
  const weighted = bestMoves * 1.4 + excellentMoves * 1.0 + goodMoves * 0.6;
  return Math.round(clamp((weighted / total) * 140, 0, 140));
}

function getErrorPenalty({
  movesAnalyzed = 0,
  inaccuracies = 0,
  mistakes = 0,
  blunders = 0,
  catastrophicErrors = 0,
}) {
  const total = Math.max(1, movesAnalyzed);
  const weightedErrors = inaccuracies * 0.8 + mistakes * 2.1 + blunders * 4.5 + catastrophicErrors * 5.5;
  const densityPenalty = (weightedErrors / total) * 210;
  const absolutePenalty = inaccuracies * 10 + mistakes * 34 + blunders * 90 + catastrophicErrors * 120;
  return -Math.round(clamp(densityPenalty + absolutePenalty, 0, 620));
}

function getNoisyRangeBoost({ movesAnalyzed, endedQuickly, mateSeen }) {
  let boost = 0;
  if (movesAnalyzed < 8) boost += 120;
  else if (movesAnalyzed < 14) boost += 60;
  if (endedQuickly) boost += 40;
  if (mateSeen) boost += 30;
  return boost;
}

function getRangeFromGames(gamesRated) {
  if (gamesRated < 1) return 280;
  if (gamesRated < 3) return 220;
  if (gamesRated < 5) return 170;
  if (gamesRated < 10) return 120;
  if (gamesRated < 20) return 90;
  return 70;
}

export function getConfidenceLabel(gamesRated) {
  if (gamesRated < 5) return "Low";
  if (gamesRated < 15) return "Medium";
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

function getVolatilityWeight(gamesRated) {
  // High early influence, then decay toward stability.
  return clamp(0.62 * Math.exp(-0.22 * gamesRated) + 0.14, 0.12, 0.76);
}

function getMaxSwing(gamesRated) {
  if (gamesRated < 1) return 700;
  if (gamesRated < 2) return 420;
  if (gamesRated < 5) return 260;
  if (gamesRated < 10) return 180;
  if (gamesRated < 15) return 140;
  return 110;
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
  catastrophicErrors = 0,
}) {
  const base = Number.isFinite(opponentElo) ? opponentElo : DEFAULT_ELO;
  const resultAdjustment = getResultAdjustment(result);
  const acplAdjustment = normalizeAcpl(acpl);
  const accuracyAdjustment = normalizeAccuracy(accuracy);
  const moveQualityBonus = getMoveQualityBalance({ movesAnalyzed, bestMoves, excellentMoves, goodMoves });
  const errorPenalty = getErrorPenalty({
    movesAnalyzed,
    inaccuracies,
    mistakes,
    blunders,
    catastrophicErrors,
  });

  const rawPerformance =
    base + resultAdjustment + acplAdjustment + accuracyAdjustment + moveQualityBonus + errorPenalty;
  const performanceElo = clamp(Math.round(rawPerformance), MIN_ELO, MAX_ELO);

  const baseRange = getRangeFromGames(0);
  const noiseBoost = getNoisyRangeBoost({ movesAnalyzed, endedQuickly, mateSeen });
  const rangeHalfWidth = clamp(baseRange + noiseBoost, 120, 340);

  return {
    performanceElo,
    performanceRange: {
      low: clamp(performanceElo - rangeHalfWidth, MIN_ELO, MAX_ELO),
      high: clamp(performanceElo + rangeHalfWidth, MIN_ELO, MAX_ELO),
      halfWidth: rangeHalfWidth,
    },
    components: {
      resultAdjustment,
      acplAdjustment,
      accuracyAdjustment,
      moveQualityBonus,
      errorPenalty,
    },
  };
}

export function updatePlayerElo(ratingState, opponentElo, gameResult, analysisSummary) {
  const currentElo = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;
  const safeOpponentElo = Number.isFinite(opponentElo) ? opponentElo : CALIBRATION_BOT_ELO;

  const perf = estimatePerformanceElo({
    ...analysisSummary,
    result: gameResult,
    opponentElo: safeOpponentElo,
  });

  const volatilityWeight = getVolatilityWeight(gamesRated);
  const blendedTarget = Math.round(currentElo + (perf.performanceElo - currentElo) * volatilityWeight);

  const maxSwing = getMaxSwing(gamesRated);
  const lowerBound = currentElo - maxSwing;
  const upperBound = currentElo + maxSwing;
  const playerElo = clamp(blendedTarget, lowerBound, upperBound);

  const nextGamesRated = gamesRated + 1;
  const baseUncertainty = getRangeFromGames(nextGamesRated);
  const noiseBoost = getNoisyRangeBoost(analysisSummary || {});
  const uncertainty = clamp(baseUncertainty + Math.round(noiseBoost * 0.45), 60, 300);

  const actualScore = getResultScore(gameResult);
  const expectedScore = 1 / (1 + 10 ** ((safeOpponentElo - currentElo) / 400));

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
      actualScore,
      kFactor: Math.round(volatilityWeight * 100),
      alpha: volatilityWeight,
      maxSwing,
      eloAfterClassic: blendedTarget,
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
  if (gamesRated === 0) return CALIBRATION_BOT_ELO;

  const baseElo = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;
  return clamp(Math.round(baseElo), MIN_ELO, MAX_ELO);
}

export function mapMovetimeFromElo(botElo) {
  const clamped = clamp(botElo, MIN_ELO, MAX_ELO);
  const ratio = (clamped - MIN_ELO) / (MAX_ELO - MIN_ELO);
  return Math.round(80 + ratio * (450 - 80));
}
