import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FACADE_ANGLE, type GeoFacade } from "../model/geo";
import { NoiseScenePlaceholder } from "./noise-scene-placeholder";

export interface NoiseSceneProps {
  period: "day" | "night";
  selected?: GeoFacade | undefined;
  rotation: number;
  floors: number;
  reducedMotion: boolean;
  sides: { facade: GeoFacade; color: string; known: boolean }[];
  onSelect(facade: GeoFacade): void;
}

function Block({
  at,
  size,
  color,
  radius = 0.04,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(
    () => new RoundedBoxGeometry(width, height, depth, 2, radius),
    [width, height, depth, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh position={at} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

function Windows({ floors, night }: { floors: number; night: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const count = floors * 4 * 8;
  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    let index = 0;
    for (let side = 0; side < 8; side++) {
      const angle = (side * Math.PI) / 4;
      for (let floor = 0; floor < floors; floor++) {
        for (let column = 0; column < 4; column++) {
          const across = (column - 1.5) * 0.3;
          object.position.set(
            Math.sin(angle) * 1.866 + Math.cos(angle) * across,
            0.67 + (floor * 2.68) / floors,
            Math.cos(angle) * 1.866 - Math.sin(angle) * across,
          );
          object.rotation.set(0, angle, 0);
          object.scale.set(1, 6 / floors, 1);
          object.updateMatrix();
          mesh.current.setMatrixAt(index, object.matrix);
          const lit = (side * 17 + floor * 7 + column * 3) % 5 !== 0;
          color.set(night ? (lit ? "#ffcf85" : "#466279") : "#86a4b3");
          mesh.current.setColorAt(index, color);
          index++;
        }
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [floors, night]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.19, 0.23, 0.032]} />
      <meshStandardMaterial
        color="white"
        roughness={0.42}
        emissive={night ? "#e2b881" : "#000000"}
        emissiveIntensity={night ? 0.38 : 0}
      />
    </instancedMesh>
  );
}

function Tree({ x, z, scale, night }: { x: number; z: number; scale: number; night: boolean }) {
  return (
    <group position={[x, 0.12, z]} scale={scale}>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 0.54, 7]} />
        <meshStandardMaterial color={night ? "#8b9c9f" : "#8e9c84"} />
      </mesh>
      <mesh position={[0, 0.68, 0]} scale={[0.8, 1.25, 0.8]} castShadow>
        <icosahedronGeometry args={[0.35, 2]} />
        <meshStandardMaterial color={night ? "#709c9a" : "#9cbb9f"} roughness={1} />
      </mesh>
      <mesh position={[0.13, 0.5, 0.05]} castShadow>
        <icosahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color={night ? "#5f8b88" : "#88ac93"} roughness={1} />
      </mesh>
    </group>
  );
}

function Architecture({ period, selected, floors, sides, onSelect }: NoiseSceneProps) {
  const night = period === "night";
  const body = night ? "#b7c8d7" : "#f0eee4";
  const trim = night ? "#dce5e7" : "#ffffff";
  const roof = night ? "#526d83" : "#c4d5d3";
  return (
    <>
      <Block
        at={[0, -0.16, 0]}
        size={[7.2, 0.35, 6.4]}
        color={night ? "#34465f" : "#d4e0dc"}
        radius={0.18}
      />
      <Block
        at={[0, 0.035, 0]}
        size={[6.9, 0.075, 6.1]}
        color={night ? "#526475" : "#e5ebe4"}
        radius={0.035}
      />
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2, 2, 3.4, 8]} />
        <meshStandardMaterial color={body} roughness={0.8} />
      </mesh>
      {Array.from({ length: floors + 1 }, (_, index) => (
        <mesh
          key={index}
          position={[0, 0.45 + (index * 3.1) / floors, 0]}
          rotation={[0, Math.PI / 8, 0]}
          castShadow
        >
          <cylinderGeometry args={[2.05, 2.05, 0.055, 8]} />
          <meshStandardMaterial color={trim} roughness={0.7} />
        </mesh>
      ))}
      <Windows floors={floors} night={night} />
      <mesh position={[0, 3.71, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.12, 2.12, 0.14, 8]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.79, 0]} rotation={[0, Math.PI / 8, 0]}>
        <cylinderGeometry args={[1.94, 1.94, 0.045, 8]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      <Block at={[-0.42, 4.03, -0.32]} size={[1.3, 0.48, 0.9]} color={body} />
      <Block at={[-0.42, 4.29, -0.32]} size={[1.4, 0.065, 1]} color={trim} radius={0.02} />
      {[0, 1, 2].map((index) => (
        <Block
          key={index}
          at={[0.75, 3.88, -0.6 + index * 0.43]}
          size={[0.6, 0.12, 0.25]}
          color={night ? "#91a9b7" : "#7b96a6"}
          radius={0.02}
        />
      ))}
      <Block
        at={[0, 0.62, 1.895]}
        size={[0.55, 0.72, 0.045]}
        color={night ? "#f9cc8d" : "#648597"}
        radius={0.01}
      />
      <Block at={[0, 1.05, 2.08]} size={[0.95, 0.08, 0.6]} color={trim} radius={0.025} />
      <Block at={[0, 0.14, 2.14]} size={[1.05, 0.12, 0.67]} color={trim} radius={0.025} />
      {sides.map((side) => {
        const angle = Math.PI - (FACADE_ANGLE[side.facade] * Math.PI) / 180;
        const active = side.facade === selected;
        const color = active ? "#587aff" : side.known ? side.color : night ? "#6b7d97" : "#a5b3c1";
        return (
          <group key={side.facade} rotation={[0, angle, 0]}>
            <mesh
              position={[0, 1.96, 1.899]}
              onClick={(event) => {
                event.stopPropagation();
                if (event.delta < 8) onSelect(side.facade);
              }}
            >
              <planeGeometry args={[1.47, 3.2]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={active ? 0.15 : 0.025}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {active && (
              <>
                {[-0.73, 0.73].map((x) => (
                  <mesh key={x} position={[x, 1.96, 1.91]}>
                    <boxGeometry args={[0.035, 3.2, 0.035]} />
                    <meshBasicMaterial color="#7c99ff" />
                  </mesh>
                ))}
                {[0.36, 3.56].map((y) => (
                  <mesh key={y} position={[0, y, 1.91]}>
                    <boxGeometry args={[1.49, 0.035, 0.035]} />
                    <meshBasicMaterial color="#7c99ff" />
                  </mesh>
                ))}
              </>
            )}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.083, 0]}>
              <ringGeometry
                args={[2.56, active ? 2.69 : 2.61, 16, 1, (Math.PI * 3) / 8, Math.PI / 4]}
              />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={active ? 0.9 : 0.45}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
      {[
        [-2.6, -1.9, 0.9],
        [-2.7, -0.9, 0.75],
        [2.55, -1.85, 1.05],
        [2.8, 0.1, 0.8],
        [-2.6, 1.5, 0.85],
        [2.5, 2.1, 0.8],
      ].map(([x, z, scale], index) => (
        <Tree key={index} x={x!} z={z!} scale={scale!} night={night} />
      ))}
      {[-2.3, 2.3].map((x) => (
        <group key={x}>
          <Block
            at={[x, 0.24, 2.5]}
            size={[0.65, 0.12, 0.27]}
            color={night ? "#92aca9" : "#a4b6a1"}
            radius={0.025}
          />
          <Block at={[x - 0.2, 0.135, 2.5]} size={[0.06, 0.16, 0.21]} color={roof} radius={0.01} />
          <Block at={[x + 0.2, 0.135, 2.5]} size={[0.06, 0.16, 0.21]} color={roof} radius={0.01} />
        </group>
      ))}
    </>
  );
}

function Rig(props: NoiseSceneProps) {
  const group = useRef<THREE.Group>(null!);
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    orthographic.zoom = Math.min(size.width / 9.2, size.height / 7.5);
    orthographic.lookAt(0, 1.2, 0);
    orthographic.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    invalidate();
  }, [props.rotation, props.reducedMotion, invalidate]);
  useFrame((_, delta) => {
    const difference = Math.atan2(
      Math.sin(props.rotation - group.current.rotation.y),
      Math.cos(props.rotation - group.current.rotation.y),
    );
    if (props.reducedMotion || Math.abs(difference) < 0.001)
      group.current.rotation.y = props.rotation;
    else {
      group.current.rotation.y += difference * (1 - Math.exp(-8 * Math.min(delta, 0.05)));
      invalidate();
    }
  });
  return (
    <group ref={group}>
      <Architecture {...props} />
    </group>
  );
}

export default function NoiseScene(props: NoiseSceneProps) {
  const night = props.period === "night";
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: [7, 6, 8], near: 0.1, far: 60, zoom: 65 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={<NoiseScenePlaceholder />}
    >
      <ambientLight intensity={night ? 0.7 : 1.2} color={night ? "#b6cfff" : "#ffffff"} />
      <hemisphereLight
        args={[night ? "#bbd4ff" : "#d8ecff", night ? "#455d7f" : "#9bad98", night ? 1.1 : 1.5]}
      />
      <directionalLight
        position={[-3, 8, 6]}
        intensity={night ? 2.7 : 3.2}
        color={night ? "#e2eaff" : "#fff5dc"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-normalBias={0.025}
        shadow-bias={-0.00015}
      />
      <directionalLight
        position={[4, 3, -5]}
        intensity={night ? 1.6 : 1.0}
        color={night ? "#85a8e9" : "#d4e8ec"}
      />
      <Rig {...props} floors={Math.min(8, Math.max(3, props.floors))} />
    </Canvas>
  );
}
