import { useEffect } from "react";
import { circuits } from "./circuits";
import { GAME } from "./config";
import { ordinal, useGame } from "./store";

function press(patch) {
  return {
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      useGame.getState().setControls(patch);
    },
    onPointerUp: (e) => {
      e.preventDefault();
      const reset = {};
      Object.keys(patch).forEach((k) => {
        reset[k] = k === "steer" ? 0 : false;
      });
      useGame.getState().setControls(reset);
    },
    onPointerCancel: () => {
      const reset = {};
      Object.keys(patch).forEach((k) => {
        reset[k] = k === "steer" ? 0 : false;
      });
      useGame.getState().setControls(reset);
    },
  };
}

export default function HUD() {
  const phase = useGame((s) => s.phase);
  const selectedCircuit = useGame((s) => s.selectedCircuit);
  const progress = useGame((s) => s.progress.player);
  const positions = useGame((s) => s.positions);
  const countdown = useGame((s) => s.countdown);
  const speed = useGame((s) => s.speed);
  const boost = useGame((s) => s.boost);
  const airborne = useGame((s) => s.airborne);
  const flipReady = useGame((s) => s.flipReady);
  const score = useGame((s) => s.score);
  const popups = useGame((s) => s.popups);
  const muted = useGame((s) => s.muted);
  const setControls = useGame((s) => s.setControls);
  const setMuted = useGame((s) => s.setMuted);
  const laps = circuits[selectedCircuit]?.laps ?? GAME.laps;

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      if (["ArrowUp", "w", "W"].includes(e.key)) setControls({ gas: true });
      if (["ArrowDown", "s", "S"].includes(e.key)) setControls({ brake: true });
      if (["ArrowLeft", "a", "A"].includes(e.key)) setControls({ steer: 1 });
      if (["ArrowRight", "d", "D"].includes(e.key)) setControls({ steer: -1 });
      if (e.code === "Space") setControls({ boost: true });
      if (["f", "F"].includes(e.key)) setControls({ flip: true });
    };
    const up = (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) setControls({ gas: false });
      if (["ArrowDown", "s", "S"].includes(e.key)) setControls({ brake: false });
      if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D"].includes(e.key)) setControls({ steer: 0 });
      if (e.code === "Space") setControls({ boost: false });
      if (["f", "F"].includes(e.key)) setControls({ flip: false });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setControls]);

  if (phase !== "race") return null;
  const position = positions.indexOf("player") + 1;
  return (
    <div className="hud">
      <div className="hudTop left">
        <strong>{ordinal(position)}/4</strong>
        <span>LAP {Math.min(laps, progress.lap + 1)}/{laps}</span>
      </div>
      <div className="hudTop right">
        <strong>{speed}</strong>
        <span>KM/H</span>
        <div className="boostMeter"><i style={{ width: `${Math.round(boost * 100)}%` }} /></div>
      </div>
      <button className="mute" onClick={() => setMuted(!muted)}>{muted ? "SOUND OFF" : "SOUND ON"}</button>
      {countdown > 0 ? <div className="countdown">{countdown > 0.2 ? Math.ceil(countdown) : "GO"}</div> : progress.lap === laps - 1 ? <div className="finalLap">FINAL LAP</div> : null}
      {airborne && <div className="airBadge">AIR</div>}
      {popups.map((p) => <div className="scorePopup" key={p.id}>{p.label}</div>)}
      <div className="scoreReadout">SCORE {score}</div>
      <div className="controls leftPad">
        <button aria-label="Steer left" {...press({ steer: 1 })}>‹</button>
        <button aria-label="Steer right" {...press({ steer: -1 })}>›</button>
      </div>
      <div className="controls rightPad">
        <button className="gas" {...press({ gas: true })}>GAS</button>
        <button className="brake" {...press({ brake: true })}>BRAKE</button>
        <button className="boost" {...press({ boost: true })}>BOOST</button>
        {flipReady && <button className="flip" {...press({ flip: true })}>FLIP</button>}
      </div>
    </div>
  );
}
