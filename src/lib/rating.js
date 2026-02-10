const DEFAULT_BOT_ELO = 1200;
const MIN_ELO = 100;
const MAX_ELO = 2900;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashStringToSeed(input) {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicJitter(userId, gameIndex) {
  const seedFactory = hashStringToSeed(`${userId}:${gameIndex}`);
  const random = mulberry32(seedFactory());
  return Math.round(random() * 160 - 80);
}

export function getInitialRatingState() {
  return {
    gamesRated: 0,
    estElo: null,
    playerElo: null,
    sigma: null,
    confidence: "Uncalibrated",
    rangeLow: null,
    rangeHigh: null,
    lastGameSummary: null,
  };
}

export function summarizeCpl(cplList = []) {
  const list = cplList.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, value));
  const movesAnalyzed = list.length;
  const acpl = movesAnalyzed ? list.reduce((sum, value) => sum + value, 0) / movesAnalyzed : 0;
  const weightedACPL = movesAnalyzed
    ? list.reduce((sum, value) => sum + Math.pow(Math.min(600, value), 1.15), 0) / movesAnalyzed
    : 0;

  const blunders = list.filter((value) => value >= 300).length;
  const mistakes = list.filter((value) => value >= 150 && value < 300).length;
  const inaccuracies = list.filter((value) => value >= 50 && value < 150).length;
  const catastrophic = list.filter((value) => value >= 600).length;

  return {
    cplList: list,
    movesAnalyzed,
    acpl: Math.round(acpl),
    weightedACPL: Number(weightedACPL.toFixed(2)),
    blunders,
    mistakes,
    inaccuracies,
    catastrophic,
  };
}

export function getResultScore(result) {
  if (result === "win") return 1;
  if (result === "draw") return 0.5;
  return 0;
}

export function computePerformanceElo({ botElo, estElo, result, weightedACPL, blunders, mistakes, inaccuracies }) {
  const baseline = Number.isFinite(estElo) ? estElo : DEFAULT_BOT_ELO;
  const expectedScore = 1 / (1 + 10 ** ((botElo - baseline) / 400));
  const actualScore = getResultScore(result);

  const q1 = clamp((70 - weightedACPL) / 70, -1.5, 1.5);
  const blPenalty = 0.35 * blunders + 0.15 * mistakes + 0.05 * inaccuracies;
  const qualityScore = q1 - blPenalty;
  const qualityEloDelta = 260 * Math.tanh(qualityScore / 0.9);
  const resultDelta = 220 * (actualScore - expectedScore);

  const severeErrorPenalty = weightedACPL > 170 ? -(weightedACPL - 170) * 1.7 : 0;
  const cleanGameBonus = weightedACPL <= 25 && blunders === 0 ? 260 : 0;
  const instabilityGuard = -(blunders >= 4 ? (blunders - 3) * 35 : 0);

  const performanceElo = clamp(
    Math.round(botElo + resultDelta + qualityEloDelta + severeErrorPenalty + cleanGameBonus + instabilityGuard),
    MIN_ELO,
    MAX_ELO,
  );

  return {
    expectedScore,
    actualScore,
    q1,
    blPenalty,
    qualityScore,
    qualityEloDelta,
    resultDelta,
    severeErrorPenalty,
    cleanGameBonus,
    instabilityGuard,
    performanceElo,
  };
}

export function getConfidenceLabelFromSigma(sigma) {
  if (!Number.isFinite(sigma)) return "Uncalibrated";
  if (sigma > 200) return "Low";
  if (sigma > 120) return "Medium";
  return "High";
}

export function applyGameResult(ratingState, { opponentElo, result, cplList }) {
  const currentGames = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;
  const currentEst = Number.isFinite(ratingState?.estElo) ? ratingState.estElo : null;
  const currentSigma = Number.isFinite(ratingState?.sigma) ? ratingState.sigma : null;

  const metrics = summarizeCpl(cplList);
  const performance = computePerformanceElo({
    botElo: opponentElo,
    estElo: currentEst,
    result,
    weightedACPL: metrics.weightedACPL,
    blunders: metrics.blunders,
    mistakes: metrics.mistakes,
    inaccuracies: metrics.inaccuracies,
  });

  let nextEst = performance.performanceElo;
  let nextSigma = 260;
  let alpha = 1;

  if (currentGames > 0 && Number.isFinite(currentEst) && Number.isFinite(currentSigma)) {
    alpha = clamp(0.32 * (currentSigma / 260), 0.06, 0.28);
    nextEst = currentEst + alpha * (performance.performanceElo - currentEst);
    nextSigma = Math.max(70, currentSigma * 0.88);
  }

  const roundedEst = Math.round(nextEst);
  const roundedSigma = Math.round(nextSigma);
  const rangeLow = Math.round(nextEst - nextSigma);
  const rangeHigh = Math.round(nextEst + nextSigma);
  const confidence = getConfidenceLabelFromSigma(nextSigma);

  const nextState = {
    ...ratingState,
    gamesRated: currentGames + 1,
    estElo: roundedEst,
    playerElo: roundedEst,
    sigma: roundedSigma,
    confidence,
    rangeLow,
    rangeHigh,
    lastGameSummary: {
      opponentElo,
      result,
      performanceElo: performance.performanceElo,
      ...metrics,
    },
  };

  return {
    nextState,
    summary: {
      botEloUsedThisGame: opponentElo,
      estEloBefore: currentEst,
      estEloAfter: roundedEst,
      sigmaBefore: currentSigma,
      sigmaAfter: roundedSigma,
      rangeLow,
      rangeHigh,
      alpha,
      ...metrics,
      ...performance,
    },
  };
}

export function chooseOpponentElo(ratingState, { userId = "anon", gameIndex }) {
  const gamesRated = Number.isFinite(ratingState?.gamesRated) ? ratingState.gamesRated : 0;
  if (gamesRated === 0) return DEFAULT_BOT_ELO;

  const estimate = Number.isFinite(ratingState?.estElo) ? ratingState.estElo : DEFAULT_BOT_ELO;
  const deterministicGameIndex = Number.isFinite(gameIndex) ? gameIndex : gamesRated + 1;
  const jitter = deterministicJitter(userId, deterministicGameIndex);

  return clamp(Math.round(estimate + jitter), 300, 2600);
}

export function mapMovetimeFromElo() {
  return 300;
}
