const DEFAULT_ELO = 1200;
const MIN_ELO = 600;
const MAX_ELO = 2600;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getUncertainty(gamesRated) {
  if (gamesRated < 5) return 200;
  if (gamesRated < 10) return 140;
  if (gamesRated < 20) return 90;
  return 60;
}

export function getConfidenceLabel(gamesRated) {
  if (gamesRated < 5) return "Low";
  if (gamesRated < 20) return "Medium";
  return "High";
}

export function getInitialRatingState() {
  return {
    playerElo: DEFAULT_ELO,
    gamesRated: 0,
    confidence: getConfidenceLabel(0),
    lastOpponentElo: DEFAULT_ELO,
  };
}

function getKFactor(gamesRated) {
  if (gamesRated < 5) return 48;
  if (gamesRated < 20) return 24;
  return 16;
}

function computePerformanceAdjustment(optionalMetrics = {}) {
  if (!Number.isFinite(optionalMetrics?.avgLoss) || !Number.isFinite(optionalMetrics?.blunders)) {
    return 0;
  }

  const cplAdjustment = clamp((120 - optionalMetrics.avgLoss) / 800, -0.1, 0.1);
  const blunderAdjustment = clamp(-optionalMetrics.blunders * 0.03, -0.15, 0);
  return clamp(cplAdjustment + blunderAdjustment, -0.15, 0.15);
}

function normalizeResult(gameResult) {
  if (gameResult === "win") return 1;
  if (gameResult === "draw") return 0.5;
  return 0;
}

export function updatePlayerElo(ratingState, opponentElo, gameResult, optionalMetrics) {
  const actualScore = normalizeResult(gameResult);
  const expectedScore = 1 / (1 + 10 ** ((opponentElo - ratingState.playerElo) / 400));
  const kFactor = getKFactor(ratingState.gamesRated);

  const performanceAdjustment = computePerformanceAdjustment(optionalMetrics);
  const effectiveScore = clamp(actualScore + performanceAdjustment, 0, 1);

  const playerElo = Math.round(ratingState.playerElo + kFactor * (effectiveScore - expectedScore));
  const gamesRated = ratingState.gamesRated + 1;

  return {
    nextState: {
      ...ratingState,
      playerElo,
      gamesRated,
      confidence: getConfidenceLabel(gamesRated),
      lastOpponentElo: opponentElo,
    },
    summary: {
      expectedScore,
      kFactor,
      actualScore,
      effectiveScore,
      performanceAdjustment,
      uncertainty: getUncertainty(gamesRated),
      confidence: getConfidenceLabel(gamesRated),
    },
  };
}

function getCloseGameAdjustment(lastGameSummary) {
  if (!lastGameSummary) return null;
  const { avgLoss, blunders } = lastGameSummary;
  if (!Number.isFinite(avgLoss) || !Number.isFinite(blunders)) return null;

  const close = avgLoss <= 120 && blunders <= 1;
  const rough = avgLoss >= 200 || blunders >= 2;
  return { close, rough };
}

export function chooseBotElo(ratingState, lastGameSummary) {
  const gamesRated = ratingState.gamesRated;

  if (gamesRated === 0) {
    return DEFAULT_ELO;
  }

  if (gamesRated < 5) {
    const prevOpponent = ratingState.lastOpponentElo ?? DEFAULT_ELO;
    const lastResult = lastGameSummary?.result;
    const closeness = getCloseGameAdjustment(lastGameSummary);

    let delta = 0;
    if (lastResult === "win") {
      delta = closeness?.close ? 150 : 250;
    } else if (lastResult === "draw") {
      delta = 100;
    } else if (lastResult === "loss") {
      delta = closeness?.close ? -150 : -250;
    }

    return clamp(Math.round(prevOpponent + delta), MIN_ELO, MAX_ELO);
  }

  const shouldProbe = Math.random() < 0.2;
  if (shouldProbe) {
    return clamp(Math.round(ratingState.playerElo + 180), MIN_ELO, MAX_ELO);
  }

  const jitter = Math.round(Math.random() * 160 - 80);
  return clamp(Math.round(ratingState.playerElo + jitter), MIN_ELO, MAX_ELO);
}

export function mapMovetimeFromElo(botElo) {
  const clamped = clamp(botElo, MIN_ELO, MAX_ELO);
  const ratio = (clamped - MIN_ELO) / (MAX_ELO - MIN_ELO);
  return Math.round(80 + ratio * (450 - 80));
}
