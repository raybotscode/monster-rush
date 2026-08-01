import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { truckState } from "./raceRuntime";

const desired = new THREE.Vector3();
const look = new THREE.Vector3();

export default function CameraRig() {
  const { camera } = useThree();
  const shake = useRef(0);
  useFrame((_, dt) => {
    const player = truckState.get("player");
    if (!player?.position) return;
    const p = new THREE.Vector3(...player.position);
    const f = new THREE.Vector3(...player.forward);
    desired.copy(p).addScaledVector(f, -8.5).add(new THREE.Vector3(0, player.boosting ? 4.2 : 3.4, 0));
    shake.current = Math.max(0, shake.current - dt);
    camera.position.lerp(desired, 1 - Math.pow(0.002, dt));
    look.copy(p).addScaledVector(f, 5.5).add(new THREE.Vector3(0, 1.2, 0));
    camera.lookAt(look);
    camera.fov = THREE.MathUtils.lerp(camera.fov, player.boosting ? 78 : 70, dt * 3);
    camera.updateProjectionMatrix();
  });
  return null;
}
