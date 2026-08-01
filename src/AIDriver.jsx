import * as THREE from "three";
import { PHYSICS } from "./config";

const forward = new THREE.Vector3(0, 0, -1);

export function getAIControls(body, circuit, playerProgress, aiProgress) {
  if (!body) return { steer: 0, gas: false, brake: false, boost: false };
  const pos = body.translation();
  const rot = body.rotation();
  const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
  const dir = forward.clone().applyQuaternion(q);
  // At spawn (lap 0, checkpoint 0) the truck IS on waypoint 0 — target the
  // first real waypoint or the AI steers toward its own feet and slams
  // sideways into the player at launch.
  const cp = aiProgress.lap === 0 && aiProgress.checkpoint === 0
    ? 1
    : (aiProgress.checkpoint % circuit.waypoints.length);
  const target = circuit.waypoints[cp];
  const toTarget = new THREE.Vector3(target[0] - pos.x, 0, target[2] - pos.z).normalize();
  const signed = Math.atan2(dir.x * toTarget.z - dir.z * toTarget.x, dir.x * toTarget.x + dir.z * toTarget.z);
  const v = body.linvel();
  const speed = Math.hypot(v.x, v.y, v.z);
  // Launch straight for the first 2s of racing — trucks are already aligned
  // with the track at spawn; steering immediately at GO makes AI swing into
  // each other and the player (start-line pileup → everyone flips).
  if (aiProgress.raceTime < 2) {
    return {
      steer: 0,
      gas: true,
      brake: false,
      boost: false,
      forceScale: 1,
      maxSteer: PHYSICS.maxSteer * 0.88,
    };
  }
  // Gentle steering at low speed but NOT too weak — full gain at launch makes
  // AI swing wide into other trucks; near-zero gain makes it unable to turn
  // at all and get stuck. Floor at 0.9 so trucks can always make the turn.
  const gain = THREE.MathUtils.clamp(0.9 + speed * 0.12, 0.9, 1.8);
  const steer = THREE.MathUtils.clamp(-signed * gain, -1, 1);
  const diff = (playerProgress?.progress ?? 0) - (aiProgress?.progress ?? 0);
  const rubber = THREE.MathUtils.clamp(1 + diff * 0.018, 0.9, 1.15);
  const sharpTurn = Math.abs(signed) > 0.85;
  // Never fully stop: braking only helps when moving fast. At low speed keep
  // gassing so steering has something to act on (steering at 0 speed does
  // nothing → truck stuck at spawn forever = deadlock).
  return {
    steer,
    gas: !(sharpTurn && speed > 8),
    brake: sharpTurn && speed > 8,
    boost: diff > 5,
    forceScale: rubber,
    maxSteer: PHYSICS.maxSteer * 0.88,
  };
}
