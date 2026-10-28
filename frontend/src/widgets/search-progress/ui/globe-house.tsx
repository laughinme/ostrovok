import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { globePosition } from "../model/globe-geometry";
import type { GlobePin } from "../model/globe-pins";

const WINDOW_POSITIONS: [number, number, number][] = [
  [-0.033, 0.058, 0.045],
  [0.033, 0.058, 0.045],
];

export function GlobeHouse({
  pin,
  visible,
  current,
  reducedMotion,
}: {
  pin: GlobePin;
  visible: boolean;
  current: boolean;
  reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const house = useRef<THREE.Group>(null!);
  const wave = useRef<THREE.Mesh>(null!);
  const appearance = useRef(0);
  const pulse = useRef(0);
  const { camera } = useThree();
  const position = useMemo(() => globePosition(pin.lat, pin.lon, 1.008), [pin]);
  const surface = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        position.clone().normalize(),
      ),
    [position],
  );
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const pose = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, -0.55, 0)),
    [],
  );
  const roof = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.065, 0.092);
    shape.lineTo(0, 0.15);
    shape.lineTo(0.065, 0.092);
    shape.closePath();
    return shape;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    appearance.current = reducedMotion
      ? Number(visible)
      : THREE.MathUtils.damp(appearance.current, Number(visible), 8, dt);
    const pop = reducedMotion ? 1 : 1 + Math.sin(appearance.current * Math.PI) * 0.16;
    const emphasis = (current ? 1.12 : 0.88) * (pin.main ? 1.25 : 1);
    root.current.scale.setScalar(Math.max(0.0001, appearance.current * pop * emphasis));
    root.current.visible = appearance.current > 0.02;
    root.current.getWorldQuaternion(orientation);
    house.current.quaternion.copy(orientation).invert().multiply(camera.quaternion).multiply(pose);
    pulse.current = current ? (pulse.current + dt / 1.35) % 1 : 0;
    wave.current.visible = current;
    wave.current.scale.setScalar(reducedMotion ? 1.25 : 1 + pulse.current * 1.4);
    (wave.current.material as THREE.MeshBasicMaterial).opacity = reducedMotion
      ? 0.25
      : (1 - pulse.current) * 0.45;
  }, -1);

  return (
    <group
      ref={root}
      name={`hotel-house-${pin.name}`}
      position={position}
      quaternion={surface}
      scale={0.0001}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <circleGeometry args={[0.064, 32]} />
        <meshBasicMaterial color="#15379b" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={wave} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.065, 0.069, 48]} />
        <meshBasicMaterial color="#c3ff9a" transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={house} position={[0, 0.025, 0]}>
        <mesh position={[0, -0.003, 0]}>
          <boxGeometry args={[0.127, 0.012, 0.108]} />
          <meshStandardMaterial color="#e2e9ff" roughness={1} />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.104, 0.09, 0.084]} />
          <meshStandardMaterial color="#fff1d5" roughness={1} />
        </mesh>
        <mesh position={[0, 0, -0.054]}>
          <extrudeGeometry
            args={[
              roof,
              {
                depth: 0.108,
                bevelEnabled: true,
                bevelSize: 0.002,
                bevelThickness: 0.002,
                bevelSegments: 1,
                curveSegments: 1,
              },
            ]}
          />
          <meshStandardMaterial
            color={pin.main ? "#315be7" : "#fa9478"}
            roughness={1}
            flatShading
          />
        </mesh>
        <mesh position={[0.031, 0.135, -0.017]}>
          <boxGeometry args={[0.016, 0.043, 0.018]} />
          <meshStandardMaterial color={pin.main ? "#fa9478" : "#315be7"} roughness={1} />
        </mesh>
        <mesh position={[0, 0.023, 0.0435]}>
          <boxGeometry args={[0.022, 0.046, 0.004]} />
          <meshStandardMaterial color="#3155b4" roughness={1} />
        </mesh>
        {WINDOW_POSITIONS.map((position, index) => (
          <mesh key={index} position={position}>
            <boxGeometry args={[0.02, 0.022, 0.004]} />
            <meshStandardMaterial
              color="#83c9ed"
              emissive="#b5e9ff"
              emissiveIntensity={0.12}
              roughness={1}
            />
          </mesh>
        ))}
        <mesh position={[0.053, 0.055, 0.006]}>
          <boxGeometry args={[0.004, 0.024, 0.025]} />
          <meshStandardMaterial color="#83c9ed" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
