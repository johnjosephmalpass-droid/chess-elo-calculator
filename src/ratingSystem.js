const DEFAULT_ELO = 1200;
const MIN_ELO = 200;
const MAX_ELO = 2800;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getQualityAdjustment(acpl) {
  if (!Number.isFinite(acpl)) return 0;
  if (acpl <= 20) return 250;
  if (acpl <= 35) return 150;
  if (acpl <= 60) return 50;
  if (acpl <= 90) return -75;
  if (acpl <= 130) return -200;
  return -400;
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
  if (gamesRated < 5) return 200;
  if (gamesRated < 10) return 140;
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
    playerEloInternal: DEFAULT_ELO,
    playerElo: DEFAULT_ELO,
    gamesRated: 0,
    isCalibrated: false,
    uncertainty,
    rangeLow: DEFAULT_ELO - uncertainty,
    rangeHigh: DEFAULT_ELO + uncertainty,
    confidence: getConfidenceLabel(0),
    lastOpponentElo: DEFAULT_ELO,
    lastGameSummary: null,
  };
}

function getKFactor(gamesRated) {
  if (gamesRated < 5) return 40;
  if (gamesRated < 20) return 20;
  return 12;
}

function getAlpha(gamesRated) {
  return clamp(0.65 - 0.08 * gamesRated, 0.15, 0.65);
}

function getMaxSwing(gamesRated) {
  if (gamesRated < 5) return 400;
  if (gamesRated < 20) return 200;
  return 120;
}

export function estimatePerformanceElo({
  acpl,
  blunders = 0,
  mistakes = 0,
  result,
  opponentElo,
  movesAnalyzed = 0,
  endedQuickly = false,
  mateSeen = false,
}) {
  const base = Number.isFinite(opponentElo) ? opponentElo : DEFAULT_ELO;
  const resultAdjustment = getResultAdjustment(result);
  const qualityAdjustment = getQualityAdjustment(acpl);
  const blunderPenalty = -Math.min(360, Math.max(0, blunders) * 120);
  const mistakePenalty = -Math.min(240, Math.max(0, mistakes) * 60);
  const rawPerformance = base + resultAdjustment + qualityAdjustment + blunderPenalty + mistakePenalty;
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
      blunderPenalty,
      mistakePenalty,
    },
  };
}

export function updatePlayerElo(ratingState, opponentElo, gameResult, analysisSummary) {
  const currentElo = Number.isFinite(ratingState?.playerEloInternal)
    ? ratingState.playerEloInternal
    : Number.isFinite(ratingState?.playerElo)
    ? ratingState.playerElo
    : DEFAULT_ELO;
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;

  const actualScore = getResultScore(gameResult);
  const expectedScore = 1 / (1 + 10 ** ((opponentElo - currentElo) / 400));
  const kFactor = getKFactor(gamesRated);
  const eloAfterClassic = Math.round(currentElo + kFactor * (actualScore - expectedScore));

  const perf = estimatePerformanceElo({
    ...analysisSummary,
    result: gameResult,
    opponentElo,
  });

  const alpha = getAlpha(gamesRated);
  const blendedBase = gamesRated === 0
    ? perf.performanceElo
    : Math.round((1 - alpha) * currentElo + alpha * perf.performanceElo);
  const blended = Math.round((blendedBase + eloAfterClassic) / 2);
  const maxSwing = getMaxSwing(gamesRated);
  const lowerBound = currentElo - maxSwing;
  const upperBound = currentElo + maxSwing;
  const playerElo = gamesRated === 0 ? perf.performanceElo : clamp(blended, lowerBound, upperBound);

  const nextGamesRated = gamesRated + 1;
  const baseUncertainty = getRangeFromGames(nextGamesRated);
  const noiseBoost = getNoisyRangeBoost(analysisSummary || {});
  const uncertainty = clamp(baseUncertainty + Math.round(noiseBoost * 0.5), 60, 300);

  return {
    nextState: {
      ...ratingState,
      playerEloInternal: playerElo,
      playerElo,
      gamesRated: nextGamesRated,
      isCalibrated: nextGamesRated > 0,
      uncertainty,
      rangeLow: clamp(playerElo - uncertainty, MIN_ELO, MAX_ELO),
      rangeHigh: clamp(playerElo + uncertainty, MIN_ELO, MAX_ELO),
      confidence: getConfidenceLabel(nextGamesRated),
      lastOpponentElo: opponentElo,
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

export function chooseBotElo(ratingState, lastGameSummary) {
  const gamesRated = ratingState?.gamesRated || 0;

  if (gamesRated === 0) {
    return DEFAULT_ELO;
  }

  const baseElo = Number.isFinite(ratingState?.playerEloInternal)
    ? ratingState.playerEloInternal
    : Number.isFinite(ratingState?.playerElo)
    ? ratingState.playerElo
    : DEFAULT_ELO;

  if (gamesRated < 5) {
    let adjustmentFromLastResult = 0;
    if (lastGameSummary?.result === "win") adjustmentFromLastResult = 120;
    if (lastGameSummary?.result === "loss") adjustmentFromLastResult = -120;

    let candidate = Math.round(baseElo + adjustmentFromLastResult);

    if (Number.isFinite(lastGameSummary?.performanceElo)) {
      const gap = lastGameSummary.performanceElo - (ratingState?.lastOpponentElo || DEFAULT_ELO);
      if (gap >= 220) candidate += 250;
      if (gap <= -220) candidate -= 250;
    }

    return clamp(candidate, 600, 2600);
  }

  const probeGame = Math.random() < 0.2;
  if (probeGame) {
    return clamp(Math.round(baseElo + 160), 600, 2600);
  }

  const jitter = Math.round(Math.random() * 160 - 80);
  return clamp(Math.round(baseElo + jitter), 600, 2600);
}

export function mapMovetimeFromElo(botElo) {
  const clamped = clamp(botElo, 600, 2600);
  const ratio = (clamped - 600) / (2600 - 600);
  return Math.round(80 + ratio * (450 - 80));
}
