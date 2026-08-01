import { create } from "zustand";
import { circuits } from "./circuits";
import { GAME } from "./config";

const emptyProgress = () => ({
  player: { lap: 0, checkpoint: 0, progress: 0, finished: false, time: 0 },
  ai0: { lap: 0, checkpoint: 0, progress: 0, finished: false, time: 0 },
  ai1: { lap: 0, checkpoint: 0, progress: 0, finished: false, time: 0 },
  ai2: { lap: 0, checkpoint: 0, progress: 0, finished: false, time: 0 },
});

export const useGame = create((set, get) => ({
  phase: "title",
  selectedCircuit: 0,
  unlocked: 1,
  stars: [0, 0, 0, 0],
  score: 0,
  raceTime: 0,
  countdown: 3,
  muted: false,
  speed: 0,
  boost: 1,
  airborne: false,
  flipReady: false,
  finalLapFlash: false,
  popups: [],
  positions: ["player", "ai0", "ai1", "ai2"],
  progress: emptyProgress(),
  result: null,
  controls: { steer: 0, gas: false, brake: false, boost: false, flip: false },

  goSelect: () => set({ phase: "select" }),
  selectCircuit: (index) => set({ selectedCircuit: index }),
  startRace: (index = get().selectedCircuit) => {
    set({
      selectedCircuit: index,
      phase: "race",
      countdown: 3,
      score: 0,
      raceTime: 0,
      speed: 0,
      boost: 1,
      airborne: false,
      flipReady: false,
      finalLapFlash: false,
      popups: [],
      positions: ["player", "ai0", "ai1", "ai2"],
      progress: emptyProgress(),
      result: null,
    });
  },
  victory: () => set({ phase: "victory" }),
  setMuted: (muted) => set({ muted }),
  setControls: (patch) => set((s) => ({ controls: { ...s.controls, ...patch } })),
  setTelemetry: (patch) => set(patch),
  tickRace: (dt) => set((s) => (s.phase === "race" && s.countdown <= 0 ? { raceTime: s.raceTime + dt } : {})),
  tickCountdown: (dt) => set((s) => {
    if (s.phase !== "race" || s.countdown <= 0) return {};
    return { countdown: Math.max(0, s.countdown - dt) };
  }),
  addScore: (amount, label, worldPos) => set((s) => ({
    score: s.score + amount,
    popups: [...s.popups.slice(-7), { id: crypto.randomUUID(), label, t: 1.2, worldPos }],
  })),
  tickPopups: (dt) => set((s) => ({ popups: s.popups.map((p) => ({ ...p, t: p.t - dt })).filter((p) => p.t > 0) })),
  updateProgress: (id, patch) => set((s) => {
    const progress = { ...s.progress, [id]: { ...s.progress[id], ...patch } };
    const entries = Object.entries(progress).sort((a, b) => b[1].progress - a[1].progress);
    return { progress, positions: entries.map(([key]) => key) };
  }),
  finishRaceIfNeeded: () => {
    const s = get();
    const player = s.progress.player;
    const circuit = circuits[s.selectedCircuit];
    const laps = circuit.laps ?? GAME.laps;
    if (!player.finished || s.result) return;
    const pos = s.positions.indexOf("player") + 1;
    const starsEarned = pos === 1 ? 3 : pos === 2 ? 2 : pos === 3 ? 1 : 0;
    const nextStars = [...s.stars];
    nextStars[s.selectedCircuit] = Math.max(nextStars[s.selectedCircuit], starsEarned);
    set({
      phase: "results",
      stars: nextStars,
      unlocked: Math.max(s.unlocked, starsEarned > 0 ? Math.min(4, s.selectedCircuit + 2) : s.unlocked),
      result: { position: pos, stars: starsEarned, score: s.score + (GAME.score.finishBase[pos - 1] ?? 0), time: s.raceTime },
    });
  },
}));

export function ordinal(n) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
