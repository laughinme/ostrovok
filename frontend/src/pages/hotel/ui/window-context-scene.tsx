import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FACADE_ANGLE } from "../model/geo";
import {
  contextTrees,
  type ContextBuilding,
  type GroundPoint,
  type WindowContext,
  type WindowSceneData,
} from "../model/window-context";

export interface ContextSceneProps {
  context: WindowContext;
  data: WindowSceneData;
  mode: "overview" | "eye";
  rotation: number;
  zoom: number;
  reducedMotion: boolean;
  onReady(): void;
  onUnavailable(): void;
  labelRef: RefObject<HTMLSpanElement | null>;
}
const SCALE = 1 / 20;
function shapeFor(points: GroundPoint[]) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) =>
    index ? shape.lineTo(x * SCALE, -z * SCALE) : shape.moveTo(x * SCALE, -z * SCALE),
  );
  shape.closePath();
  return shape;
}

function Building({ building, index }: { building: ContextBuilding; index: number }) {
  const height = Math.max(2.5, Math.min(85, building.height)) * SCALE;
  const [body, roof] = useMemo(() => {
    const shape = shapeFor(building.points);
    const volume = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 1,
      steps: 1,
    });
    volume.rotateX(-Math.PI / 2);
    const top = new THREE.ShapeGeometry(shape);
    top.rotateX(-Math.PI / 2);
    return [volume, top];
  }, [building.points, height]);
  useEffect(
    () => () => {
      body.dispose();
      roof.dispose();
    },
    [body, roof],
  );
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial
          color={
            building.hotel ? "#3760e6" : ["#f2eee3", "#e6e8df", "#f4e8d8", "#e6e9e7"][index % 4]!
          }
          roughness={0.9}
        />
      </mesh>
      <mesh geometry={roof} position={[0, height + 0.025, 0]} receiveShadow>
        <meshStandardMaterial
          color={building.hotel ? "#8ba5ff" : ["#c6ccc5", "#ddc5ae", "#c0c9c4"][index % 3]!}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
}

function BuildingWindows({ buildings }: { buildings: ContextBuilding[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const panes = useMemo(
    () =>
      buildings.flatMap((building) => {
        const result: { position: [number, number, number]; rotation: number; hotel: boolean }[] =
          [];
        const floors = Math.min(14, Math.max(1, Math.floor(building.height / 3)));
        const winding =
          Math.sign(
            building.points.slice(1).reduce((sum, [x, z], index) => {
              const [px, pz] = building.points[index]!;
              return sum + px * z - x * pz;
            }, 0),
          ) || 1;
        for (let side = 0; side < building.points.length - 1; side++) {
          const [ax, az] = building.points[side]!,
            [bx, bz] = building.points[side + 1]!;
          const dx = bx - ax,
            dz = bz - az,
            length = Math.hypot(dx, dz);
          const columns = Math.min(16, Math.floor(length / 3.7));
          if (columns < 1) continue;
          for (let floor = 0; floor < floors; floor++)
            for (let column = 0; column < columns; column++) {
              const t = (column + 0.5) / columns;
              result.push({
                position: [
                  (ax + dx * t + winding * (dz / length) * 0.5) * SCALE,
                  (1.8 + floor * 3) * SCALE,
                  (az + dz * t - winding * (dx / length) * 0.5) * SCALE,
                ],
                rotation: Math.atan2(winding * dz, -winding * dx),
                hotel: building.hotel,
              });
            }
        }
        return result;
      }),
    [buildings],
  );
  useLayoutEffect(() => {
    const object = new THREE.Object3D(),
      color = new THREE.Color();
    panes.forEach((pane, index) => {
      object.position.set(...pane.position);
      object.rotation.set(0, pane.rotation, 0);
      object.updateMatrix();
      mesh.current.setMatrixAt(index, object.matrix);
      color.set(pane.hotel ? "#d8e6ff" : "#7895a0");
      mesh.current.setColorAt(index, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [panes]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, panes.length]}>
      <boxGeometry args={[0.065, 0.085, 0.014]} />
      <meshStandardMaterial color="white" roughness={0.5} />
    </instancedMesh>
  );
}

function Water({ points }: { points: GroundPoint[] }) {
  const geometry = useMemo(() => {
    const plane = new THREE.ShapeGeometry(shapeFor(points));
    plane.rotateX(-Math.PI / 2);
    return plane;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0.012, 0]} receiveShadow>
      <meshStandardMaterial
        color="#79c0d0"
        roughness={0.35}
        metalness={0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Road({ points }: { points: GroundPoint[] }) {
  return (
    <group>
      {points.slice(1).map(([x, z], index) => {
        const [ax, az] = points[index]!,
          dx = x - ax,
          dz = z - az;
        return (
          <mesh
            key={index}
            position={[((x + ax) * SCALE) / 2, 0.018, ((z + az) * SCALE) / 2]}
            rotation={[0, Math.atan2(dx, dz), 0]}
            receiveShadow
          >
            <boxGeometry args={[0.19, 0.02, Math.hypot(dx, dz) * SCALE + 0.07]} />
            <meshStandardMaterial color="#fbf8ed" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

function Trees({ context }: { context: WindowContext }) {
  const trees = useMemo(() => contextTrees(context), [context]);
  return (
    <group>
      {trees.map(([x, z], index) => (
        <group key={index} position={[x * SCALE, 0, z * SCALE]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.022, 0.24, 5]} />
            <meshStandardMaterial color="#897e65" />
          </mesh>
          <mesh position={[0, 0.3, 0]} scale={[1, 1.4, 1]} castShadow>
            <icosahedronGeometry args={[0.15, 1]} />
            <meshStandardMaterial color={index % 2 ? "#6f9c79" : "#98b489"} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Stage(props: ContextSceneProps) {
  const { context, data, mode, rotation, zoom, reducedMotion, onReady, onUnavailable, labelRef } =
    props;
  const { camera, size, invalidate, gl } = useThree();
  const angle = (FACADE_ANGLE[data.facade] * Math.PI) / 180;
  const target = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const base = useMemo(() => new RoundedBoxGeometry(14.2, 0.45, 14.2, 3, 0.18), []);
  const ground = useMemo(() => new RoundedBoxGeometry(14, 0.08, 14, 2, 0.08), []);
  useEffect(
    () => () => {
      base.dispose();
      ground.dispose();
    },
    [base, ground],
  );
  useLayoutEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const yaw = angle + rotation;
    if (mode === "overview") {
      goal.set(Math.sin(yaw + Math.PI + 0.55) * 22, 18, -Math.cos(yaw + Math.PI + 0.55) * 22);
      target.set(0, 0.3, 0);
      if (camera instanceof THREE.OrthographicCamera)
        camera.zoom = Math.min(size.width / 21, size.height / 18) * zoom;
    } else {
      const eye = (data.floor * 3 - 1.5) * SCALE;
      goal.set(0, eye, 0);
      target.set(Math.sin(yaw) * 20, eye - 0.2, -Math.cos(yaw) * 20);
      perspective.fov = 65 / zoom;
    }
    perspective.updateProjectionMatrix();
    if (reducedMotion || mode === "eye") camera.position.copy(goal);
    invalidate();
  }, [
    angle,
    rotation,
    zoom,
    mode,
    data.floor,
    size.width,
    size.height,
    camera,
    goal,
    target,
    invalidate,
    reducedMotion,
  ]);
  useFrame(() => {
    camera.position.lerp(goal, reducedMotion ? 1 : 0.14);
    camera.lookAt(target);
    if (labelRef.current && mode === "overview") {
      const projected = new THREE.Vector3(0, selectedY + 0.15, 0).project(camera);
      labelRef.current.style.left = `${(projected.x * 0.5 + 0.5) * size.width}px`;
      labelRef.current.style.top = `${(-projected.y * 0.5 + 0.5) * size.height - 24}px`;
    }
    if (camera.position.distanceTo(goal) > 0.002) invalidate();
  });
  useEffect(() => {
    onReady();
  }, [onReady]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    const restored = () => {
      onReady();
      invalidate();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, invalidate, onUnavailable, onReady]);
  const selectedY = (data.floor * 3 - 1.5) * SCALE;
  const buildings = useMemo(
    () => context.buildings.filter((building) => mode !== "eye" || !building.hotel),
    [context.buildings, mode],
  );
  return (
    <>
      <color attach="background" args={[mode === "eye" ? "#d5e5e9" : "#edf3f1"]} />
      <fog
        attach="fog"
        args={[
          mode === "eye" ? "#d5e5e9" : "#edf3f1",
          mode === "eye" ? 12 : 45,
          mode === "eye" ? 50 : 100,
        ]}
      />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#e5f2ff", "#b7c3aa", 0.8]} />
      <directionalLight
        position={[-8, 18, 10]}
        intensity={1.8}
        color="#fff9ed"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-normalBias={0.035}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[9, 8, -10]} intensity={0.35} color="#c4e1ee" />
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#edf3f1" />
      </mesh>
      <mesh geometry={base} position={[0, -0.27, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#bacbc3" roughness={1} />
      </mesh>
      <mesh geometry={ground} position={[0, -0.04, 0]} receiveShadow>
        <meshStandardMaterial color="#d4e2c6" roughness={1} />
      </mesh>
      {context.water.map((points, index) => (
        <Water key={index} points={points} />
      ))}
      {context.roads.map((points, index) => (
        <Road key={index} points={points} />
      ))}
      {buildings.map((building, index) => (
        <Building key={`${building.id}-${index}`} building={building} index={index} />
      ))}
      <BuildingWindows buildings={buildings} />
      <Trees context={context} />
      {mode === "overview" && (
        <group>
          <mesh position={[0, selectedY + 0.12, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#7399ff" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, selectedY / 2 + 0.05, 0]}>
            <cylinderGeometry args={[0.025, 0.025, selectedY, 8]} />
            <meshBasicMaterial color="#2146e4" />
          </mesh>
          <mesh
            position={[Math.sin(angle) * 0.8, 0.04, -Math.cos(angle) * 0.8]}
            rotation={[-Math.PI / 2, 0, -angle]}
          >
            <circleGeometry args={[2.5, 40, Math.PI / 2 - Math.PI / 3, (Math.PI * 2) / 3]} />
            <meshBasicMaterial
              color="#436bfa"
              transparent
              opacity={0.14}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

export default function WindowContextScene(props: ContextSceneProps) {
  return (
    <Canvas
      key={props.mode}
      orthographic={props.mode === "overview"}
      flat
      shadows
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: [18, 18, 22], fov: 35, near: 0.02, far: 250 }}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
    >
      <Stage {...props} />
    </Canvas>
  );
}
