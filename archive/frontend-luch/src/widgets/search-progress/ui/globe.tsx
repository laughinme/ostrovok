import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PINS, pinsLitFor, type GlobePin } from "../model/globe-pins";
import { flightCurve, globePosition } from "../model/globe-geometry";
import { GlobeHouse } from "./globe-house";
import { GlobePlane } from "./globe-plane";
import { COASTS } from "../model/world-shapes";
import { GlobePlaceholder } from "./globe-placeholder";

const COLOR = {
  ocean: "#214be0",
  oceanDeep: "#1338a8",
  land: "#b7f28d",
  landShade: "#a7e87e",
  trail: "#c3ff9a",
  atmosphere: "#315fff",
  star: "#829bdf",
};

function randomSequence(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, pointer } = useThree();
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      reducedMotion ? 0 : pointer.x * 0.18,
      3,
      dt,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      reducedMotion ? 0 : pointer.y * 0.12,
      3,
      dt,
    );
    camera.lookAt(0, 0, 0);
  }, -3);
  return null;
}

function Stars() {
  const positions = useMemo(() => {
    const random = randomSequence(13);
    const result = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      const radius = 4 + random() * 3;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      result[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      result[i * 3 + 1] = radius * Math.cos(phi);
      result[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return result;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.013}
        color={COLOR.star}
        transparent
        opacity={0.48}
        depthWrite={false}
      />
    </points>
  );
}

function makeEarthTexture() {
  const width = 1536;
  const height = 768;
  const margin = 80;
  const earth = document.createElement("canvas");
  earth.width = width;
  earth.height = height;
  const context = earth.getContext("2d")!;
  const sea = context.createLinearGradient(0, 0, 0, height);
  sea.addColorStop(0, COLOR.oceanDeep);
  sea.addColorStop(0.3, COLOR.ocean);
  sea.addColorStop(0.7, COLOR.ocean);
  sea.addColorStop(1, COLOR.oceanDeep);
  context.fillStyle = sea;
  context.fillRect(0, 0, width, height);

  const layer = document.createElement("canvas");
  layer.width = width + margin * 2;
  layer.height = height;
  const land = layer.getContext("2d")!;
  const gradient = land.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, COLOR.land);
  gradient.addColorStop(1, COLOR.landShade);
  land.fillStyle = gradient;
  land.strokeStyle = "rgba(20, 62, 176, 0.2)";
  land.lineWidth = 1.5;
  for (const coast of COASTS) {
    const points = coast.map(
      ([lat, lon]) => [((lon + 180) / 360) * width + margin, ((90 - lat) / 180) * height] as const,
    );
    for (const offset of [-width, 0, width]) {
      const last = points.at(-1)!;
      const first = points[0]!;
      land.beginPath();
      land.moveTo((last[0] + first[0]) / 2 + offset, (last[1] + first[1]) / 2);
      for (let i = 0; i < points.length; i++) {
        const point = points[i]!;
        const next = points[(i + 1) % points.length]!;
        land.quadraticCurveTo(
          point[0] + offset,
          point[1],
          (point[0] + next[0]) / 2 + offset,
          (point[1] + next[1]) / 2,
        );
      }
      land.closePath();
      land.fill();
      land.stroke();
    }
  }
  context.drawImage(layer, -margin, 0);
  context.strokeStyle = "rgba(225, 242, 255, 0.12)";
  context.lineWidth = 1;
  context.beginPath();
  for (let longitude = -150; longitude <= 180; longitude += 30) {
    const x = ((longitude + 180) / 360) * width;
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = ((90 - latitude) / 180) * height;
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
  const texture = new THREE.CanvasTexture(earth);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function FlightPath({
  from,
  to,
  active,
  reducedMotion,
}: {
  from: GlobePin;
  to: GlobePin;
  active: boolean;
  reducedMotion: boolean;
}) {
  const curve = useMemo(() => flightCurve(from, to), [from, to]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 48, 0.0018, 4, false]} />
        <meshBasicMaterial
          color={COLOR.trail}
          transparent
          opacity={active ? 0.52 : 0.12}
          depthWrite={false}
        />
      </mesh>
      {active && <GlobePlane curve={curve} reducedMotion={reducedMotion} />}
    </group>
  );
}

function Orbit({ reducedMotion }: { reducedMotion: boolean }) {
  const bead = useRef<THREE.Mesh>(null!);
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (!reducedMotion) phase.current += Math.min(delta, 0.05) * 0.3;
    bead.current.position.set(Math.cos(phase.current) * 1.19, Math.sin(phase.current) * 1.19, 0);
  });
  return (
    <group rotation={[1.08, 0.3, -0.28]}>
      <mesh>
        <torusGeometry args={[1.19, 0.0018, 4, 128]} />
        <meshBasicMaterial color={COLOR.trail} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={bead}>
        <sphereGeometry args={[0.011, 12, 8]} />
        <meshBasicMaterial color={COLOR.trail} />
      </mesh>
    </group>
  );
}

function Earth({ lit, reducedMotion }: { lit: number; reducedMotion: boolean }) {
  const globe = useRef<THREE.Group>(null!);
  const tilt = useRef<THREE.Group>(null!);
  const time = useRef(0);
  const focus = PINS[lit - 1]!;
  const target = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        globePosition(focus.lat, focus.lon, 1).normalize(),
        new THREE.Vector3(0.08, 0.1, 1).normalize(),
      ),
    [focus],
  );
  const orientation = useRef(target.clone());
  const texture = useMemo(makeEarthTexture, []);
  const uniforms = useMemo(() => ({ tint: { value: new THREE.Color(COLOR.atmosphere) } }), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    if (reducedMotion) orientation.current.copy(target);
    else orientation.current.slerp(target, 1 - Math.exp(-3.4 * dt));
    globe.current.quaternion.copy(orientation.current);
    tilt.current.rotation.set(
      reducedMotion ? 0 : Math.sin(time.current * 0.45) * 0.012,
      reducedMotion ? 0 : Math.sin(time.current * 0.28) * 0.018,
      0,
    );
  }, -2);
  return (
    <>
      <group ref={globe}>
        <group ref={tilt}>
          <mesh>
            <sphereGeometry args={[1, 80, 56]} />
            <meshStandardMaterial map={texture} roughness={1} metalness={0} />
          </mesh>
          <mesh scale={1.08}>
            <sphereGeometry args={[1, 40, 32]} />
            <shaderMaterial
              uniforms={uniforms}
              vertexShader={`varying vec3 vNormal;
                void main() {
                  vNormal = normalize(normalMatrix * normal);
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`}
              fragmentShader={`uniform vec3 tint;
                varying vec3 vNormal;
                void main() {
                  float rim = pow(max(0.0, 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)))), 2.4);
                  gl_FragColor = vec4(tint, rim * 0.24);
                }`}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              transparent
              depthWrite={false}
            />
          </mesh>
          {PINS.map((pin, index) => (
            <GlobeHouse
              key={pin.name}
              pin={pin}
              visible={index < lit}
              current={index === lit - 1}
              reducedMotion={reducedMotion}
            />
          ))}
          {PINS.slice(1, lit).map((pin, index) => (
            <FlightPath
              key={pin.name}
              from={PINS[index]!}
              to={pin}
              active={index === lit - 2}
              reducedMotion={reducedMotion}
            />
          ))}
        </group>
      </group>
      <Orbit reducedMotion={reducedMotion} />
    </>
  );
}

export function Globe({
  progress,
  reducedMotion = false,
}: {
  progress: number;
  reducedMotion?: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.6], fov: 40 }}
      dpr={[1, 1.5]}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      fallback={<GlobePlaceholder />}
    >
      <Rig reducedMotion={reducedMotion} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[-3, 4, 5]} intensity={0.7} color="#ffffff" />
      <Earth lit={pinsLitFor(progress)} reducedMotion={reducedMotion} />
      <Stars />
    </Canvas>
  );
}
