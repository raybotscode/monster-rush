import * as THREE from "three";
import { PHYSICS } from "./config";

const forward = new THREE.Vector3(0, 0, -1);

export function getAIControls(body, circuit, playerProgress, aiProgress) {
  if (!body) return { steer: 0, gas: false, brake: false, boost: false };
  const pos = body.translation();
  const rot = body.rotation();
  const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
  const dir = forward.clone().applyQuaternion(q);
  const target = circuit.waypoints[aiProgress.checkpoint % circuit.waypoints.length];
  const toTarget = new THREE.Vector3(target[0] - pos.x, 0, target[2] - pos.z).normalize();
  const signed = Math.atan2(dir.x * toTarget.z - dir.z * toTarget.x, dir.x * toTarget.x + dir.z * toTarget.z);
  const steer = THREE.MathUtils.clamp(-signed * 1.8, -1, 1);
  const diff = (playerProgress?.progress ?? 0) - (aiProgress?.progress ?? 0);
  const rubber = THREE.MathUtils.clamp(1 + diff * 0.018, 0.9, 1.15);
  const sharpTurn = Math.abs(signed) > 0.75;
  const v = body.linvel();
  const speed = Math.hypot(v.x, v.y, v.z);
  return {
    steer,
    gas: !sharpTurn,
    brake: sharpTurn && speed > 10,
    boost: diff > 5,
    forceScale: rubber,
    maxSteer: PHYSICS.maxSteer * 0.88,
  };
}
