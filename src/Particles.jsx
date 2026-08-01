import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { truckState } from "./raceRuntime";

export default function Particles() {
  const dust = useRef();
  const flames = useRef();
  const dummy = new THREE.Object3D();
  useFrame(() => {
    let d = 0;
    truckState.forEach((truck) => {
      if (!truck.position || d >= 80) return;
      const speed = truck.speed ?? 0;
      if (speed > 4) {
        const p = truck.position;
        for (let i = 0; i < 2 && d < 80; i += 1) {
          dummy.position.set(p[0] + (Math.random() - 0.5) * 1.9, p[1] - 0.38, p[2] + (Math.random() - 0.5) * 1.9);
          const s = 0.08 + Math.random() * 0.22;
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          dust.current?.setMatrixAt(d, dummy.matrix);
          d += 1;
        }
      }
    });
    for (; d < 80; d += 1) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      dust.current?.setMatrixAt(d, dummy.matrix);
    }
    dust.current && (dust.current.instanceMatrix.needsUpdate = true);

    let f = 0;
    truckState.forEach((truck) => {
      if (!truck.boosting || !truck.position || f >= 12) return;
      const p = truck.position;
      dummy.position.set(p[0] - truck.forward[0] * 1.7, p[1] + 0.1, p[2] - truck.forward[2] * 1.7);
      dummy.scale.set(0.45, 0.45, 0.85);
      dummy.updateMatrix();
      flames.current?.setMatrixAt(f, dummy.matrix);
      f += 1;
    });
    for (; f < 12; f += 1) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      flames.current?.setMatrixAt(f, dummy.matrix);
    }
    flames.current && (flames.current.instanceMatrix.needsUpdate = true);
  });
  return (
    <group>
      <instancedMesh ref={dust} args={[null, null, 80]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#c8a26c" transparent opacity={0.28} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[null, null, 12]}>
        <coneGeometry args={[1, 1.8, 12]} />
        <meshBasicMaterial color="#ff8a18" transparent opacity={0.75} />
      </instancedMesh>
    </group>
  );
}
