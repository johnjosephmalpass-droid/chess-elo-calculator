import { useEffect } from "react";

export default function useMoveSound(moves) {
  useEffect(() => {
    if (!moves.length) return;
    const last = moves[moves.length - 1];
    let sound = "move";
    if (last.loss > 300) sound = "blunder";
    else if (last.loss > 120) sound = "mistake";
    else if (last.loss < 20) sound = "good";
    // Play sound (simple browser API)
    const audio = new Audio(`/assets/${sound}.mp3`);
    audio.volume = 0.3;
    audio.play();
  }, [moves]);
}
