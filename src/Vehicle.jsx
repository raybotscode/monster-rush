import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS, GAME, PHYSICS } from "./config";
import { useGame } from "./store";
import { getAIControls } from "./AIDriver.jsx";
import { setTruckState } from "./raceRuntime";
import { audio } from "./Audio";

const wheelOffsets = [
  [-0.92, -0.42, -1.02],
  [0.92, -0.42, -1.02],
  [-0.92, -0.42, 1.05],
  [0.92, -0.42, 1.05],
];
const forward = new THREE.Vector3(0, 0, -1);
const up = new THREE.Vector3(0, 1, 0);

function startPose(circuit, lane) {
  const a = circuit.waypoints[0];
  const b = circuit.waypoints[1];
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(-dx, -dz);
  // Grid spacing 2.9 (trucks are ~1.8 wide) so they don't spawn touching —
  // touching at GO = start-line pileup that flips the player before driving.
  // Spawn y = rest height (chassis center ~0.85 above track). Spawning higher
  // makes the raycast vehicle's suspension initialize fully extended in mid-air
  // and violently "snap" on first contact — flipping every truck in place.
  return {
    position: [a[0] + (-dz / len) * lane * 2.9, a[1] + 0.85, a[2] + (dx / len) * lane * 2.9],
    rotation: [0, yaw, 0],
  };
}

export default function Vehicle({ id, circuit, lane = 0, color = COLORS.player, ai = false }) {
  const body = useRef();
  const wheels = useRef([]);
  const vehicle = useRef(null);
  const steerNow = useRef(0);
  const boostTimer = useRef(0);
  const boostEnergy = useRef(1);
  const flipWait = useRef(0);
  const flipCooldown = useRef(0);
  const airTime = useRef(0);
  const airPaid = useRef(false);
  const pose = useMemo(() => startPose(circuit, lane), [circuit, lane]);
  const { world } = useRapier();
  const controls = useGame((s) => s.controls);
  const countdown = useGame((s) => s.countdown);
  const progress = useGame((s) => s.progress);
  const muted = useGame((s) => s.muted);
  const updateProgress = useGame((s) => s.updateProgress);
  const setTelemetry = useGame((s) => s.setTelemetry);
  const addScore = useGame((s) => s.addScore);
  const finishRaceIfNeeded = useGame((s) => s.finishRaceIfNeeded);

  useEffect(() => {
    const rawWorld = world?.raw?.() ?? world;
    const rawBody = body.current?.raw?.() ?? body.current;
    if (!rawWorld || !rawBody) return;
    const make = rawWorld.createVehicleController ?? rawWorld.createDynamicRayCastVehicleController;
    if (!make) return;
    const ctrl = make.call(rawWorld, rawBody);
    wheelOffsets.forEach((o) => {
      try {
        ctrl.addWheel({
          chassisConnectionPointCs: { x: o[0], y: o[1], z: o[2] },
          directionCs: { x: 0, y: -1, z: 0 },
          axleCs: { x: 1, y: 0, z: 0 },
          suspensionRestLength: PHYSICS.wheels.suspensionRestLength,
          radius: PHYSICS.wheels.radius,
          maxSuspensionTravel: PHYSICS.wheels.maxSuspensionTravel,
          suspensionStiffness: PHYSICS.wheels.suspensionStiffness,
          wheelsDampingCompression: PHYSICS.wheels.dampingCompression,
          wheelsDampingRelaxation: PHYSICS.wheels.dampingRelaxation,
          frictionSlip: PHYSICS.wheels.frictionSlip,
        });
      } catch {
        ctrl.addWheel(
          { x: o[0], y: o[1], z: o[2] },
          { x: 0, y: -1, z: 0 },
          { x: 1, y: 0, z: 0 },
          PHYSICS.wheels.suspensionRestLength,
          PHYSICS.wheels.radius,
        );
      }
    });
    for (let i = 0; i < 4; i += 1) {
      ctrl.setWheelSuspensionStiffness?.(i, PHYSICS.wheels.suspensionStiffness);
      ctrl.setWheelSuspensionCompression?.(i, PHYSICS.wheels.dampingCompression);
      ctrl.setWheelSuspensionRelaxation?.(i, PHYSICS.wheels.dampingRelaxation);
      ctrl.setWheelFrictionSlip?.(i, PHYSICS.wheels.frictionSlip);
      ctrl.setWheelSideFrictionStiffness?.(i, 1.25);
      ctrl.setWheelMaxSuspensionTravel?.(i, PHYSICS.wheels.maxSuspensionTravel);
      ctrl.setWheelMaxSuspensionForce?.(i, 80);
    }
    vehicle.current = ctrl;
    return () => {
      rawWorld.removeVehicleController?.(ctrl);
    };
  }, [world]);

  useFrame((_, dt) => {
    const rb = body.current;
    if (!rb) return;
    const p = rb.translation();
    const rot = rb.rotation();
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const fwd = forward.clone().applyQuaternion(q).normalize();
    const vel = rb.linvel();
    const speed = Math.hypot(vel.x, vel.y, vel.z);
    const truckUp = up.clone().applyQuaternion(q);
    const state = progress[id];
    const laps = circuit.laps ?? GAME.laps;
    const racing = countdown <= 0 && !state.finished;
    const input = ai ? getAIControls(rb, circuit, progress.player, state) : controls;
    const targetSteer = racing ? (input.steer ?? 0) * (input.maxSteer ?? PHYSICS.maxSteer) : 0;
    steerNow.current = THREE.MathUtils.lerp(steerNow.current, targetSteer, Math.min(1, dt * PHYSICS.steerSpeed));
    const engine = racing && input.gas ? PHYSICS.engineForce * (input.forceScale ?? 1) : racing && input.brake && speed < 4 ? -PHYSICS.reverseForce : 0;
    const brake = racing && input.brake && speed >= 4 ? PHYSICS.brakeForce : 0;

    const ctrl = vehicle.current;
    if (ctrl) {
      ctrl.setWheelSteering?.(0, steerNow.current);
      ctrl.setWheelSteering?.(1, steerNow.current);
      // Anti-wheelie: cut front-wheel drive when the nose pitches up hard.
      // Nose-up = forward vector gains +y (rotation around x-axis).
      const noseUp = fwd.y > 0.1 && truckUp.y > 0.2;
      [0, 1, 2, 3].forEach((i) => {
        ctrl.setWheelEngineForce?.(i, i > 1 ? engine : engine * (noseUp ? 0.05 : 0.3));
        ctrl.setWheelBrake?.(i, brake);
      });
      ctrl.updateVehicle?.(dt);
      // Mild forward assist ONLY when airborne so jumps keep momentum.
      // Never add raw torque on top of wheel steering — it fights the
      // suspension and makes the truck spin out (the "chaos" bug).
      const p = rb.translation();
      const groundY = circuit.waypoints[state.checkpoint % circuit.waypoints.length][1];
      if (p.y > groundY + 0.8 && engine !== 0) {
        rb.applyImpulse({ x: fwd.x * engine * dt * 0.22, y: 0, z: fwd.z * engine * dt * 0.22 }, true);
      }
    } else if (engine !== 0) {
      // No vehicle controller (fallback): raw impulses so the truck still moves.
      rb.applyImpulse({ x: fwd.x * engine * dt * 0.38, y: 0, z: fwd.z * engine * dt * 0.38 }, true);
      rb.applyTorqueImpulse({ x: 0, y: -steerNow.current * speed * dt * 0.35, z: 0 }, true);
    }

    boostEnergy.current = Math.min(1, boostEnergy.current + dt * 0.12);
    if (boostTimer.current > 0) boostTimer.current -= dt;
    if (racing && input.boost && boostEnergy.current >= 1) {
      boostEnergy.current = 0;
      boostTimer.current = PHYSICS.boostDuration;
      rb.applyImpulse({ x: fwd.x * PHYSICS.boostImpulse, y: PHYSICS.boostUp, z: fwd.z * PHYSICS.boostImpulse }, true);
      if (!ai) audio.blip("boost");
    }
    if (boostTimer.current > 0) rb.applyImpulse({ x: fwd.x * 18 * dt, y: 0, z: fwd.z * 18 * dt }, true);

    const groundY = circuit.waypoints[state.checkpoint % circuit.waypoints.length][1];
    const airborne = p.y > groundY + 1.05;
    airTime.current = airborne ? airTime.current + dt : 0;
    if (airTime.current > GAME.airBonusSeconds && !airPaid.current && !ai) {
      airPaid.current = true;
      addScore(GAME.score.air, "AIR +250", [p.x, p.y + 1.5, p.z]);
    }
    if (!airborne) airPaid.current = false;

    if (p.y < -8) {
      const cp = circuit.waypoints[Math.max(0, state.checkpoint - 1) % circuit.waypoints.length];
      rb.setTranslation({ x: cp[0], y: cp[1] + 2, z: cp[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    const upside = truckUp.y < -0.28 && speed < 3.2;
    flipWait.current = upside ? flipWait.current + dt : 0;
    flipCooldown.current = Math.max(0, flipCooldown.current - dt);
    const canFlip = flipWait.current > PHYSICS.upsideDownSeconds && flipCooldown.current <= 0;
    if ((ai && canFlip) || (!ai && canFlip && input.flip)) {
      rb.applyImpulse({ x: 0, y: 5, z: 0 }, true);
      rb.applyTorqueImpulse({ x: 8 + Math.random() * 2, y: 0, z: 7 }, true);
      flipCooldown.current = PHYSICS.flipCooldown;
      flipWait.current = 0;
    }

    const target = circuit.waypoints[state.checkpoint % circuit.waypoints.length];
    const dist = Math.hypot(p.x - target[0], p.z - target[2]);
    let checkpoint = state.checkpoint;
    let lap = state.lap;
    let finished = state.finished;
    if (dist < GAME.checkpointRadius && !finished) {
      checkpoint += 1;
      if (checkpoint >= circuit.waypoints.length) {
        checkpoint = 0;
        lap += 1;
        if (lap >= laps) finished = true;
      }
    }
    const next = circuit.waypoints[checkpoint % circuit.waypoints.length];
    const prev = circuit.waypoints[(checkpoint - 1 + circuit.waypoints.length) % circuit.waypoints.length];
    const segLen = Math.hypot(next[0] - prev[0], next[2] - prev[2]) || 1;
    const frac = THREE.MathUtils.clamp(1 - Math.hypot(p.x - next[0], p.z - next[2]) / segLen, 0, 0.99);
    updateProgress(id, { lap, checkpoint, finished, raceTime: useGame.getState().raceTime, time: finished ? state.time || useGame.getState().raceTime : 0, progress: lap * circuit.waypoints.length + checkpoint + frac });
    if (!ai) {
      setTelemetry({ speed: Math.round(speed * 5.2), boost: boostEnergy.current, airborne, flipReady: canFlip });
      audio.setMuted(muted);
      audio.update(speed * 5.2, boostTimer.current > 0);
      finishRaceIfNeeded();
    }
    setTruckState(id, { position: [p.x, p.y, p.z], forward: [fwd.x, fwd.y, fwd.z], speed, body: rb, boosting: boostTimer.current > 0 });

    wheels.current.forEach((wheel, i) => {
      if (!wheel) return;
      wheel.position.y = wheelOffsets[i][1] - (airborne ? 0.05 : Math.sin(performance.now() * 0.018 + i) * 0.035);
      wheel.rotation.x -= speed * dt * 2.4;
      wheel.rotation.y = i < 2 ? steerNow.current : 0;
    });
  });

  return (
    <RigidBody
      ref={body}
      position={pose.position}
      rotation={pose.rotation}
      colliders={false}
      canSleep={false}
      ccd
      linearDamping={PHYSICS.chassis.linearDamping}
      angularDamping={PHYSICS.chassis.angularDamping}
      restitution={PHYSICS.chassis.restitution}
    >
      <CuboidCollider args={[0.9, 0.39, 1.52]} mass={PHYSICS.chassis.mass} friction={0.85} restitution={PHYSICS.chassis.restitution} />
      <group position={[0, -0.08, 0]}>
        <mesh castShadow>
          <boxGeometry args={PHYSICS.chassis.size} />
          <meshStandardMaterial color={color} roughness={0.58} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.48, -0.12]} castShadow>
          <boxGeometry args={[1.36, 0.52, 1.35]} />
          <meshStandardMaterial color="#222831" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.84, -0.18]}>
          <boxGeometry args={[1.05, 0.08, 0.82]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
        {wheelOffsets.map((o, i) => (
          <group key={i} position={o} ref={(el) => (wheels.current[i] = el)}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[PHYSICS.wheels.radius, PHYSICS.wheels.radius, PHYSICS.wheels.width, 18]} />
              <meshStandardMaterial color={COLORS.rubber} roughness={0.82} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, PHYSICS.wheels.width + 0.03, 12]} />
              <meshStandardMaterial color="#d8d2bf" roughness={0.35} metalness={0.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.18, 1.72]}>
          <boxGeometry args={[1.05, 0.15, 0.16]} />
          <meshStandardMaterial color="#171717" />
        </mesh>
        {boostTimer.current > 0 && (
          <mesh position={[0, -0.05, 1.95]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.26, 0.9, 16]} />
            <meshBasicMaterial color="#ff7a18" transparent opacity={0.7} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}
