export const RATING_STORAGE_KEY = "chess-elo-calculator:rating-state";

export function resetCalibrationStorage() {
  localStorage.removeItem(RATING_STORAGE_KEY);
}
