import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GAME, PHYSICS } from "./config";
import { pointOnSegment } from "./circuits";
import { boostPadHits, truckState } from "./raceRuntime";
import { useGame } from "./store";
import { audio } from "./Audio";

function segmentData(circuit) {
  return circuit.waypoints.map((a, i) => {
    const b = circuit.waypoints[(i + 1) % circuit.waypoints.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) + 0.5;
    return {
      key: `${circuit.id}-${i}`,
      pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.18, (a[2] + b[2]) / 2],
      len,
      yaw: Math.atan2(dx, dz),
      pitch: -Math.atan2(dy, Math.hypot(dx, dz)),
      ramp: circuit.ramps.find((r) => r.segment === i),
    };
  });
}

function TrackSegment({ data, circuit }) {
  const isRamp = Boolean(data.ramp);
  const pitch = isRamp ? data.ramp.angle : data.pitch;
  return (
    <RigidBody type="fixed" colliders={false} position={data.pos} rotation={[pitch, data.yaw, 0]}>
      <CuboidCollider args={[5.4, 0.22, data.len / 2]} friction={0.88} restitution={0.05} />
      {/* Guard rails — colliders so trucks bounce back instead of flying off */}
      <CuboidCollider args={[0.32, 0.9, data.len / 2]} position={[-5.75, 0.85, 0]} friction={0.55} restitution={0.3} />
      <CuboidCollider args={[0.32, 0.9, data.len / 2]} position={[5.75, 0.85, 0]} friction={0.55} restitution={0.3} />
      <mesh receiveShadow>
        <boxGeometry args={[10.8, 0.44, data.len]} />
        <meshStandardMaterial color={isRamp ? circuit.accent : circuit.color} roughness={0.82} />
      </mesh>
      <mesh position={[-5.75, 0.7, 0]}>
        <boxGeometry args={[0.62, 1.4, data.len]} />
        <meshStandardMaterial color="#2c2924" roughness={0.7} />
      </mesh>
      <mesh position={[5.75, 0.7, 0]}>
        <boxGeometry args={[0.62, 1.4, data.len]} />
        <meshStandardMaterial color="#2c2924" roughness={0.7} />
      </mesh>
      {isRamp && (
        <mesh position={[0, 0.42, -data.len * 0.42]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[8.4, 0.16, 0.42]} />
          <meshStandardMaterial color="#fff0b0" emissive="#ff9b23" emissiveIntensity={0.3} />
        </mesh>
      )}
    </RigidBody>
  );
}

function BoostPad({ pad, circuit, index }) {
  const ref = useRef();
  const pos = useMemo(() => pointOnSegment(circuit, pad.segment, pad.t, 0), [circuit, pad]);
  useFrame((_, dt) => {
    const key = `${circuit.id}-boost-${index}`;
    const left = Math.max(0, (boostPadHits.get(key) ?? 0) - dt);
    boostPadHits.set(key, left);
    if (ref.current) ref.current.material.emissiveIntensity = left > 0 ? 0.12 : 1.25 + Math.sin(performance.now() * 0.01) * 0.25;
    if (left > 0) return;
    truckState.forEach((truck, id) => {
      const p = truck.position;
      if (!p) return;
      const d = Math.hypot(p[0] - pos[0], p[2] - pos[2]);
      if (d < 3.4 && truck.body) {
        truck.body.applyImpulse({ x: truck.forward[0] * PHYSICS.boostImpulse * 0.85, y: 0.5, z: truck.forward[2] * PHYSICS.boostImpulse * 0.85 }, true);
        boostPadHits.set(key, GAME.boostPadRecharge);
        if (id === "player") audio.blip("boost");
      }
    });
  });
  return (
    <mesh ref={ref} position={[pos[0], pos[1] + 0.09, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.3, 2.25]} />
      <meshStandardMaterial color="#ffe466" emissive="#ff8a00" emissiveIntensity={1.1} transparent opacity={0.82} />
    </mesh>
  );
}

function CrushCar({ car, circuit, index }) {
  const [crushed, setCrushed] = useState(false);
  const addScore = useGame((s) => s.addScore);
  const pos = useMemo(() => pointOnSegment(circuit, car.segment, car.t, car.side), [circuit, car]);
  useFrame(() => {
    if (crushed) return;
    truckState.forEach((truck, id) => {
      const p = truck.position;
      if (!p) return;
      if (Math.hypot(p[0] - pos[0], p[2] - pos[2]) < 2.1 && truck.speed > 7.5) {
        setCrushed(true);
        if (id === "player") addScore(GAME.score.crush, "CRUSH +250", [pos[0], pos[1] + 1.4, pos[2]]);
        if (id === "player") audio.blip("crush");
      }
    });
  });
  return (
    <RigidBody type="fixed" colliders={false} position={[pos[0], pos[1] + (crushed ? 0.13 : 0.28), pos[2]]}>
      <CuboidCollider args={[0.9, crushed ? 0.08 : 0.2, 1.45]} friction={0.8} restitution={0.1} />
      <group scale={[1, crushed ? 0.22 : 1, 1]}>
        <mesh>
          <boxGeometry args={[1.8, 0.42, 2.8]} />
          <meshStandardMaterial color={crushed ? "#5f5149" : ["#9b1d20", "#28536b", "#f6ae2d"][index % 3]} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.32, -0.18]}>
          <boxGeometry args={[1.2, 0.36, 1.25]} />
          <meshStandardMaterial color={crushed ? "#3a3330" : "#d6f4ff"} roughness={0.2} />
        </mesh>
      </group>
    </RigidBody>
  );
}

export default function Track({ circuit }) {
  const segments = useMemo(() => segmentData(circuit), [circuit]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color={circuit.theme === "alpine" ? "#d7e3e6" : "#4c463b"} roughness={0.95} />
      </mesh>
      {segments.map((s) => <TrackSegment key={s.key} data={s} circuit={circuit} />)}
      {circuit.boosts.map((b, i) => <BoostPad key={i} pad={b} circuit={circuit} index={i} />)}
      {circuit.cars.map((c, i) => <CrushCar key={i} car={c} circuit={circuit} index={i} />)}
      <StartGantry circuit={circuit} />
      {circuit.waypoints.map((p, i) => (
        <mesh key={i} position={[p[0], p[1] + 0.05, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.6, 3.0, 32]} />
          <meshBasicMaterial color={i === 0 ? "#ffffff" : circuit.accent} transparent opacity={i === 0 ? 0.35 : 0.12} />
        </mesh>
      ))}
      <RigidBody type="fixed" position={[0, -20, 0]}>
        <CuboidCollider args={[100, 0.2, 100]} sensor />
      </RigidBody>
    </group>
  );
}

function StartGantry({ circuit }) {
  const p = circuit.waypoints[0];
  return (
    <group position={[p[0], p[1], p[2]]}>
      <mesh position={[-5.7, 2.3, 0]}><boxGeometry args={[0.28, 4.6, 0.28]} /><meshStandardMaterial color="#151515" /></mesh>
      <mesh position={[5.7, 2.3, 0]}><boxGeometry args={[0.28, 4.6, 0.28]} /><meshStandardMaterial color="#151515" /></mesh>
      <mesh position={[0, 4.25, 0]}>
        <boxGeometry args={[11.8, 1.1, 0.26]} />
        <meshStandardMaterial color="#f3ca40" emissive="#d65a31" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
