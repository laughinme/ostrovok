import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const FORWARD = new THREE.Vector3(0, 0, 1);

function polygon(points: [number, number][]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

export function GlobePlane({
  curve,
  reducedMotion,
}: {
  curve: THREE.CatmullRomCurve3;
  reducedMotion: boolean;
}) {
  const plane = useRef<THREE.Group>(null!);
  const started = useRef<number | null>(null);
  const frame = useMemo(
    () => ({
      tangent: new THREE.Vector3(),
      radial: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      bank: new THREE.Quaternion(),
    }),
    [],
  );
  const wings = useMemo(
    () =>
      polygon([
        [-0.024, 0.035],
        [-0.112, -0.018],
        [-0.112, -0.034],
        [-0.024, -0.012],
        [0.024, -0.012],
        [0.112, -0.034],
        [0.112, -0.018],
        [0.024, 0.035],
      ]),
    [],
  );
  const fin = useMemo(
    () =>
      polygon([
        [-0.018, 0],
        [0.023, 0],
        [0.014, 0.054],
      ]),
    [],
  );

  useFrame(() => {
    const now = performance.now();
    started.current ??= now;
    const time = reducedMotion ? 0.5 : Math.min(1, (now - started.current) / 1100);
    const progress = time * time * (3 - 2 * time);
    const current = plane.current;
    curve.getPoint(progress, current.position);
    curve.getTangent(progress, frame.tangent).normalize();
    frame.radial.copy(current.position).normalize();
    frame.right.crossVectors(frame.radial, frame.tangent).normalize();
    frame.up.crossVectors(frame.tangent, frame.right).normalize();
    frame.basis.makeBasis(frame.right, frame.up, frame.tangent);
    current.quaternion.setFromRotationMatrix(frame.basis);
    frame.bank.setFromAxisAngle(FORWARD, reducedMotion ? 0 : -Math.sin(progress * Math.PI) * 0.16);
    current.quaternion.multiply(frame.bank);
    const appearance = reducedMotion ? 1 : Math.min(1, time / 0.08, (1 - time) / 0.12);
    current.scale.setScalar(Math.max(0.0001, appearance));
    current.visible = appearance > 0.01;
  });

  return (
    <group ref={plane} name="flight-airplane" scale={0.0001}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.019, 0.12, 4, 10]} />
        <meshStandardMaterial color="#fff9eb" roughness={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <extrudeGeometry
          args={[
            wings,
            {
              depth: 0.006,
              bevelEnabled: true,
              bevelSize: 0.002,
              bevelThickness: 0.001,
              bevelSegments: 1,
              curveSegments: 1,
            },
          ]}
        />
        <meshStandardMaterial color="#dce9ff" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.003, -0.062]}>
        <boxGeometry args={[0.082, 0.006, 0.025]} />
        <meshStandardMaterial color="#b7f28d" roughness={1} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.003, 0.012, -0.063]}>
        <extrudeGeometry args={[fin, { depth: 0.006, bevelEnabled: false, curveSegments: 1 }]} />
        <meshStandardMaterial color="#315be7" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.015, 0.044]} scale={[0.8, 0.45, 1.5]}>
        <sphereGeometry args={[0.016, 10, 8]} />
        <meshStandardMaterial color="#2452b9" roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[side * 0.047, -0.011, -0.002]}>
            <capsuleGeometry args={[0.008, 0.025, 3, 8]} />
            <meshStandardMaterial color="#315be7" roughness={1} />
          </mesh>
          <mesh position={[side * 0.099, 0.005, -0.022]}>
            <boxGeometry args={[0.013, 0.005, 0.018]} />
            <meshStandardMaterial color="#b7f28d" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
