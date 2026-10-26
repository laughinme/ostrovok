import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { PINS, pinsLitFor, type GlobePin } from "../model/globe-pins";

const COLOR = {
  pin: "#e0483d",
  pinGlow: "#ff8a72",
  ocean: "#1642d3",
  oceanDeep: "#0b2878",
  land: "#b2f08c",
  relief: "#72c98e",
  atmosphere: new THREE.Color("#1642d3"),
  star: "#8fa8ff",
};

function toVec3(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 0.45 - camera.position.x) * 0.045;
    camera.position.y += (pointer.y * 0.32 - camera.position.y) * 0.045;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Stars() {
  const geo = useMemo(() => {
    const n = 700;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 5 + Math.random() * 8;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.cos(p);
      arr[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.022} color={COLOR.star} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

const COASTS: Array<Array<[number, number]>> = [
  [
    [70, -160],
    [71, -120],
    [68, -90],
    [60, -78],
    [52, -60],
    [45, -67],
    [38, -75],
    [30, -81],
    [25, -82],
    [26, -92],
    [30, -97],
    [20, -100],
    [15, -92],
    [9, -78],
  ],

  [
    [80, -40],
    [78, -18],
    [72, -19],
    [68, -30],
    [70, -50],
    [76, -62],
  ],

  [
    [10, -76],
    [8, -60],
    [2, -50],
    [-2, -44],
    [-8, -35],
    [-14, -39],
    [-20, -40],
    [-25, -48],
    [-33, -52],
    [-40, -62],
    [-46, -67],
    [-52, -68],
    [-55, -70],
    [-50, -74],
    [-42, -74],
    [-33, -72],
    [-23, -70],
    [-16, -72],
    [-8, -79],
    [-3, -80],
    [2, -78],
    [6, -77],
  ],

  [
    [35, -6],
    [37, 3],
    [37, 10],
    [33, 12],
    [33, 20],
    [31, 25],
    [31, 32],
    [28, 34],
    [24, 36],
    [20, 38],
    [15, 40],
    [11, 44],
    [11, 51],
    [6, 43],
    [2, 41],
    [-2, 40],
    [-8, 40],
    [-12, 40],
    [-17, 37],
    [-22, 35],
    [-26, 33],
    [-30, 31],
    [-34, 26],
    [-35, 19],
    [-30, 16],
    [-25, 15],
    [-18, 12],
    [-12, 13],
    [-6, 10],
    [-2, 9],
    [4, 8],
    [6, 2],
    [5, -4],
    [4, -8],
    [8, -13],
    [12, -17],
    [16, -17],
    [21, -17],
    [26, -14],
    [30, -10],
    [33, -8],
  ],

  [
    [36, -9],
    [43, -9],
    [48, -5],
    [50, 1],
    [53, 5],
    [57, 9],
    [63, 10],
    [71, 26],
    [68, 40],
    [66, 58],
    [68, 90],
    [69, 110],
    [66, 130],
    [62, 145],
    [58, 163],
    [53, 158],
    [55, 145],
    [50, 140],
    [46, 136],
    [43, 131],
    [39, 128],
    [35, 127],
    [31, 122],
    [26, 120],
    [22, 114],
    [18, 110],
    [12, 109],
    [9, 105],
    [12, 100],
    [16, 97],
    [20, 93],
    [22, 88],
    [26, 88],
    [28, 80],
    [32, 76],
    [30, 70],
    [27, 64],
    [25, 60],
    [30, 50],
    [34, 44],
    [37, 36],
    [40, 30],
    [38, 24],
    [38, 14],
    [39, 4],
    [36, -6],
  ],

  [
    [31, 34],
    [34, 36],
    [37, 44],
    [30, 48],
    [27, 50],
    [24, 52],
    [23, 57],
    [22, 60],
    [17, 56],
    [13, 45],
    [13, 43],
    [16, 40],
    [22, 38],
    [28, 35],
  ],

  [
    [34, 72],
    [30, 75],
    [25, 68],
    [24, 67],
    [20, 72],
    [15, 74],
    [10, 77],
    [13, 80],
    [18, 84],
    [22, 88],
    [26, 89],
    [28, 85],
    [30, 80],
    [32, 76],
  ],

  [
    [-12, 132],
    [-11, 142],
    [-18, 146],
    [-25, 152],
    [-32, 152],
    [-38, 146],
    [-35, 137],
    [-32, 130],
    [-22, 124],
    [-20, 118],
    [-14, 127],
  ],

  [
    [-64, -180],
    [-62, -110],
    [-66, -40],
    [-63, 30],
    [-67, 100],
    [-64, 170],
    [-72, 180],
    [-72, -180],
  ],

  [
    [45, 141],
    [40, 140],
    [35, 137],
    [33, 131],
    [35, 132],
    [40, 136],
    [44, 142],
  ],

  [
    [58, -5],
    [55, -2],
    [51, 1],
    [50, -5],
    [53, -7],
  ],

  [
    [-12, 49],
    [-16, 50],
    [-24, 47],
    [-20, 44],
    [-15, 44],
  ],

  [
    [-35, 174],
    [-40, 175],
    [-46, 168],
    [-42, 167],
    [-37, 172],
  ],

  [
    [2, 100],
    [-2, 105],
    [-6, 110],
    [-8, 115],
    [-5, 120],
    [-2, 118],
    [1, 110],
  ],

  [
    [-5, 140],
    [-8, 147],
    [-10, 150],
    [-6, 146],
  ],

  [
    [66, -18],
    [64, -15],
    [65, -22],
  ],

  [
    [9, 80],
    [7, 81],
    [6, 80],
    [8, 79],
  ],

  [
    [23, -82],
    [21, -77],
    [22, -80],
  ],
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jr = mulberry32(11);
const LAND = COASTS.map((ring) =>
  ring.map(
    ([lat, lon]) => [lat + (jr() - 0.5) * 1.4, lon + (jr() - 0.5) * 1.4] as [number, number],
  ),
);

function makeEarthTexture() {
  const W = 1600;
  const H = 800;

  const M = 90;
  const surface = (wide: boolean) => {
    const c = document.createElement("canvas");
    c.width = wide ? W + M * 2 : W;
    c.height = H;
    return c;
  };
  const earth = surface(false);
  const ctx = earth.getContext("2d")!;

  const px = (lon: number) => ((lon + 180) / 360) * W + M;
  const py = (lat: number) => ((90 - lat) / 180) * H;

  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, COLOR.oceanDeep);
  sea.addColorStop(0.28, COLOR.ocean);
  sea.addColorStop(0.72, COLOR.ocean);
  sea.addColorStop(1, COLOR.oceanDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  const paint = (c: CanvasRenderingContext2D, color: string) => {
    c.fillStyle = color;
    for (const ring of LAND) {
      const p = ring.map(([lat, lon]) => [px(lon), py(lat)] as [number, number]);
      const n = p.length;
      for (const off of [-W, 0, W]) {
        c.beginPath();
        c.moveTo((p[n - 1]![0] + p[0]![0]) / 2 + off, (p[n - 1]![1] + p[0]![1]) / 2);
        for (let i = 0; i < n; i++) {
          const a = p[i]!;
          const b = p[(i + 1) % n]!;
          c.quadraticCurveTo(a[0] + off, a[1], (a[0] + b[0]) / 2 + off, (a[1] + b[1]) / 2);
        }
        c.closePath();
        c.fill();
      }
    }
  };

  const landLayer = surface(true);
  paint(landLayer.getContext("2d")!, COLOR.land);
  const reliefLayer = surface(true);
  paint(reliefLayer.getContext("2d")!, COLOR.relief);

  ctx.save();
  ctx.filter = "blur(26px)";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(reliefLayer, -M, 0);
  ctx.restore();

  ctx.save();
  ctx.filter = "blur(9px)";
  ctx.drawImage(reliefLayer, -M, 0);
  ctx.restore();
  ctx.drawImage(landLayer, -M, 0);

  const speck = surface(true);
  const sctx = speck.getContext("2d")!;
  const rnd = mulberry32(7);
  sctx.fillStyle = COLOR.relief;
  for (let i = 0; i < 900; i++) {
    sctx.globalAlpha = 0.2 + rnd() * 0.5;
    sctx.beginPath();
    sctx.arc(rnd() * (W + M * 2), rnd() * H, 6 + rnd() * 18, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(landLayer, 0, 0);
  ctx.save();
  ctx.filter = "blur(5px)";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(speck, -M, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(earth);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function Pin({ pin, active }: { pin: GlobePin; active: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const grow = useRef(0);
  const pulse = useRef(0);
  const pos = useMemo(() => toVec3(pin.lat, pin.lon, 1.002), [pin]);
  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        pos.clone().normalize(),
      ),
    [pos],
  );
  const k = pin.main ? 1.7 : 1;

  useFrame((state, dt) => {
    const step = Math.min(1, dt * 6);
    grow.current += ((active ? 1 : 0) - grow.current) * step;
    const overshoot = 1 + Math.sin(Math.min(1, grow.current) * Math.PI) * 0.3;
    const s = Math.max(0.0001, grow.current * overshoot * k);
    group.current.scale.setScalar(s);
    group.current.visible = grow.current > 0.02;
    if (ring.current && active) {
      pulse.current = (pulse.current + dt * (pin.main ? 0.9 : 0.55)) % 1;
      ring.current.scale.setScalar(1 + pulse.current * 2.4);
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity = (1 - pulse.current) * 0.75;
    }
  });

  return (
    <group ref={group} position={pos} quaternion={quat} scale={0.0001}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.1, 6]} />
        <meshBasicMaterial color={COLOR.pin} />
      </mesh>
      <mesh position={[0, 0.108, 0]}>
        <sphereGeometry args={[0.017, 18, 18]} />
        <meshBasicMaterial color={COLOR.pin} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <torusGeometry args={[0.032, 0.004, 6, 40]} />
        <meshBasicMaterial color={COLOR.pinGlow} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Earth({ lit }: { lit: number }) {
  const globe = useRef<THREE.Group>(null!);

  const target = useRef(new THREE.Quaternion());

  const drift = useRef(0);

  const texture = useMemo(() => makeEarthTexture(), []);

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { tint: { value: COLOR.atmosphere } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 tint;
          varying vec3 vNormal;
          void main() {
            float glow = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
            gl_FragColor = vec4(tint, 1.0) * clamp(glow, 0.0, 1.0);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      }),
    [],
  );

  const focus = lit > 0 ? PINS[lit - 1]! : (PINS.find((p) => p.main) ?? PINS[0]!);
  useMemo(() => {
    const v = toVec3(focus.lat, focus.lon, 1).normalize();
    target.current.setFromUnitVectors(v, new THREE.Vector3(0, 0.08, 1).normalize());
  }, [focus]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (globe.current) {
      const k = 1 - Math.exp(-5.5 * dt);
      globe.current.quaternion.slerp(target.current, k);
      drift.current += dt;
      const wobble = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.sin(t * 0.4) * 0.02, Math.sin(t * 0.23) * 0.05, 0),
      );
      globe.current.quaternion.multiply(wobble);
    }
  });

  return (
    <group ref={globe}>
      <mesh>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
      </mesh>

      <mesh scale={1.16}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmosphere} attach="material" />
      </mesh>

      {PINS.map((p, i) => (
        <Pin key={p.name} pin={p} active={i < lit} />
      ))}
    </group>
  );
}

export function Globe({ progress }: { progress: number }) {
  const lit = pinsLitFor(progress);
  return (
    <Canvas
      camera={{ position: [0, 0, 3.1], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Rig />
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 2, 4]} intensity={0.55} color="#eaf2ff" />
        <Earth lit={lit} />
        <Stars />
      </Suspense>
    </Canvas>
  );
}
