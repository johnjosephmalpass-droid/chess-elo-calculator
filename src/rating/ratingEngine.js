const DEFAULT_ELO = 1200;
const MIN_ELO = 200;
const MAX_ELO = 2850;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function getQualityAdjustment(acpl) {
  if (acpl <= 20) return 250;
  if (acpl <= 35) return 150;
  if (acpl <= 60) return 50;
  if (acpl <= 90) return -75;
  if (acpl <= 130) return -200;
  return -400;
}

function getUncertainty(gamesRated) {
  if (gamesRated < 5) return 200;
  if (gamesRated < 15) return 140;
  return 90;
}

export function getConfidenceLabel(gamesRated) {
  if (gamesRated < 5) return "Low";
  if (gamesRated < 15) return "Medium";
  return "High";
}

export function getInitialRatingState() {
  return {
    gamesRated: 0,
    playerElo: DEFAULT_ELO,
    uncertainty: getUncertainty(0),
    confidence: getConfidenceLabel(0),
    rangeLow: DEFAULT_ELO - getUncertainty(0),
    rangeHigh: DEFAULT_ELO + getUncertainty(0),
    lastGameSummary: null,
  };
}

function getK(gamesRated) {
  if (gamesRated < 5) return 32;
  if (gamesRated < 20) return 16;
  return 10;
}

function getMaxDelta(gamesRated) {
  if (gamesRated < 5) return 400;
  if (gamesRated < 20) return 200;
  return 120;
}

export function summarizeCpl(cplList = []) {
  const list = cplList.filter((value) => Number.isFinite(value));
  const total = list.reduce((sum, value) => sum + value, 0);
  const movesAnalyzed = list.length;
  const acpl = movesAnalyzed ? Math.round(total / movesAnalyzed) : 0;
  const blunders = list.filter((value) => value >= 300).length;
  const mistakes = list.filter((value) => value >= 150).length;
  const inaccuracies = list.filter((value) => value >= 50).length;

  return { movesAnalyzed, acpl, blunders, mistakes, inaccuracies, cplList: list };
}

export function computePerformanceElo({ opponentElo, result, acpl, blunders, mistakes }) {
  const base = Number.isFinite(opponentElo) ? opponentElo : DEFAULT_ELO;
  const resultAdj = getResultAdjustment(result);
  const qualityAdj = getQualityAdjustment(acpl);
  const blunderPenalty = -Math.min(360, Math.max(0, blunders) * 120);
  const mistakePenalty = -Math.min(240, Math.max(0, mistakes) * 60);

  return clamp(base + resultAdj + qualityAdj + blunderPenalty + mistakePenalty, MIN_ELO, MAX_ELO);
}

export function applyGameResult(ratingState, { opponentElo, result, cplList }) {
  const current = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;
  const metrics = summarizeCpl(cplList);
  const performanceElo = computePerformanceElo({
    opponentElo,
    result,
    acpl: metrics.acpl,
    blunders: metrics.blunders,
    mistakes: metrics.mistakes,
  });

  const alpha = clamp(0.6 - 0.06 * gamesRated, 0.12, 0.6);
  let blended =
    gamesRated === 0 ? Math.round(performanceElo) : Math.round((1 - alpha) * current + alpha * performanceElo);

  const actualScore = getResultScore(result);
  const expectedScore = 1 / (1 + 10 ** ((opponentElo - current) / 400));
  const kFactor = getK(gamesRated);
  blended += Math.round(kFactor * (actualScore - expectedScore));

  const maxDelta = getMaxDelta(gamesRated);
  const clamped = gamesRated === 0 ? blended : clamp(blended, current - maxDelta, current + maxDelta);
  const playerElo = clamp(Math.round(clamped), MIN_ELO, MAX_ELO);

  const nextGamesRated = gamesRated + 1;
  const uncertainty = getUncertainty(nextGamesRated);
  const confidence = getConfidenceLabel(nextGamesRated);
  const nextState = {
    ...ratingState,
    gamesRated: nextGamesRated,
    playerElo,
    uncertainty,
    confidence,
    rangeLow: clamp(playerElo - uncertainty, MIN_ELO, MAX_ELO),
    rangeHigh: clamp(playerElo + uncertainty, MIN_ELO, MAX_ELO),
    lastGameSummary: {
      opponentElo,
      result,
      performanceElo: Math.round(performanceElo),
      ...metrics,
    },
  };

  return {
    nextState,
    summary: {
      opponentElo,
      playerEloBefore: current,
      playerEloAfter: playerElo,
      performanceElo: Math.round(performanceElo),
      uncertainty,
      confidence,
      alpha,
      expectedScore,
      kFactor,
      maxDelta,
      ...metrics,
    },
  };
}

export function chooseOpponentElo(ratingState, lastGamePerformanceElo) {
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;
  if (gamesRated === 0) return DEFAULT_ELO;

  const playerElo = Number.isFinite(ratingState?.playerElo) ? ratingState.playerElo : DEFAULT_ELO;
  const jitter = Math.round(Math.random() * 160 - 80);
  let candidate = playerElo + jitter;

  if (gamesRated < 5 && Number.isFinite(lastGamePerformanceElo)) {
    const gap = lastGamePerformanceElo - playerElo;
    candidate += clamp(Math.round(gap * 0.4), -220, 220);
  }

  return clamp(Math.round(candidate), 600, 2600);
}

export function mapMovetimeFromElo(botElo) {
  const clamped = clamp(botElo, 600, 2600);
  const ratio = (clamped - 600) / 2000;
  return Math.round(80 + ratio * 370);
}
