import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { circuits } from "./circuits";
import { COLORS, GAME, PHYSICS } from "./config";
import { ordinal, useGame } from "./store";
import Track from "./Track.jsx";
import Vehicle from "./Vehicle.jsx";
import CameraRig from "./CameraRig.jsx";
import Particles from "./Particles.jsx";
import HUD from "./HUD.jsx";
import { resetRuntime } from "./raceRuntime";

function RaceTicker() {
  const tickCountdown = useGame((s) => s.tickCountdown);
  const tickRace = useGame((s) => s.tickRace);
  const tickPopups = useGame((s) => s.tickPopups);
  useFrame((_, dt) => {
    const step = Math.min(0.05, dt);
    tickCountdown(step);
    tickRace(step);
    tickPopups(step);
  });
  return null;
}

function RaceScene() {
  const selected = useGame((s) => s.selectedCircuit);
  const circuit = circuits[selected];
  useEffect(() => resetRuntime(), [selected]);
  return (
    <>
      <HUD />
      <Canvas shadows={false} dpr={[1, 1.5]} camera={{ fov: 70, position: [0, 8, 12], near: 0.1, far: 500 }}>
        <color attach="background" args={[circuit.theme === "alpine" ? "#b8d4df" : "#201d19"]} />
        <fog attach="fog" args={[circuit.theme === "alpine" ? "#c7dde5" : "#302a22", 65, 150]} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[10, 18, 8]} intensity={1.65} />
        <Suspense fallback={null}>
          <Physics gravity={PHYSICS.gravity} timeStep={1 / 60} maxStabilizationIterations={8}>
            <Track circuit={circuit} />
            <Vehicle id="player" circuit={circuit} lane={-1.5} color={COLORS.player} />
            <Vehicle id="ai0" circuit={circuit} lane={-0.5} color={COLORS.ai[0]} ai />
            <Vehicle id="ai1" circuit={circuit} lane={0.5} color={COLORS.ai[1]} ai />
            <Vehicle id="ai2" circuit={circuit} lane={1.5} color={COLORS.ai[2]} ai />
          </Physics>
          <Particles />
          <CameraRig />
          <RaceTicker />
        </Suspense>
      </Canvas>
    </>
  );
}

function Title() {
  const goSelect = useGame((s) => s.goSelect);
  return (
    <main className="screen title">
      <div className="trackWash" />
      <section>
        <p className="eyebrow">3D physics racing</p>
        <h1>MONSTER RUSH</h1>
        <p className="copy">Launch, crush, boost, recover rollovers, and fight three AI trucks across four circuits.</p>
        <button className="primary" onClick={goSelect}>START ENGINES</button>
      </section>
    </main>
  );
}

function Select() {
  const stars = useGame((s) => s.stars);
  const unlocked = useGame((s) => s.unlocked);
  const startRace = useGame((s) => s.startRace);
  const selectCircuit = useGame((s) => s.selectCircuit);
  return (
    <main className="screen select">
      <header>
        <h2>Circuit Select</h2>
        <p>{stars.reduce((a, b) => a + b, 0)} / 12 stars</p>
      </header>
      <div className="circuitGrid">
        {circuits.map((c, i) => {
          const locked = i >= unlocked;
          return (
            <button className={`circuit ${locked ? "locked" : ""}`} key={c.id} disabled={locked} onClick={() => { selectCircuit(i); startRace(i); }}>
              <span className="swatch" style={{ background: c.color }} />
              <strong>{c.name}</strong>
              <small>{c.description}</small>
              <span className="stars">{"★".repeat(stars[i])}{locked ? " LOCKED" : "☆".repeat(3 - stars[i])}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function Results() {
  const result = useGame((s) => s.result);
  const selected = useGame((s) => s.selectedCircuit);
  const startRace = useGame((s) => s.startRace);
  const unlocked = useGame((s) => s.unlocked);
  const victory = useGame((s) => s.victory);
  const goSelect = useGame((s) => s.goSelect);
  if (!result) return null;
  const next = selected + 1;
  return (
    <main className="screen results">
      <section>
        <p className="eyebrow">{circuits[selected].name}</p>
        <h2>{ordinal(result.position)} Place</h2>
        <div className="bigStars">{"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>
        <p>Score {result.score} · Time {result.time.toFixed(1)}s</p>
        <div className="row">
          <button className="secondary" onClick={() => startRace(selected)}>RETRY</button>
          {next < circuits.length && next < unlocked ? <button className="primary" onClick={() => startRace(next)}>NEXT CIRCUIT</button> : next >= circuits.length ? <button className="primary" onClick={victory}>VICTORY</button> : <button className="primary" onClick={goSelect}>SELECT</button>}
        </div>
      </section>
    </main>
  );
}

function Victory() {
  const goSelect = useGame((s) => s.goSelect);
  return (
    <main className="screen victory">
      <section>
        <p className="eyebrow">Champion</p>
        <h2>Overlord Defeated</h2>
        <p>You cleared every circuit in Monster Rush.</p>
        <button className="primary" onClick={goSelect}>RACE AGAIN</button>
      </section>
    </main>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  return (
    <>
      {phase === "title" && <Title />}
      {phase === "select" && <Select />}
      {phase === "race" && <RaceScene />}
      {phase === "results" && <Results />}
      {phase === "victory" && <Victory />}
    </>
  );
}
