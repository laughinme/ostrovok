import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface HotelScene {
  setFloor(n: number): void;
  setSide(s: "sea" | "yard"): void;
  setProgress(p: number): void;
  dispose(): void;
}

export function createHotelScene(host: HTMLElement): HotelScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 6.2, -6.2, 0.1, 100);
  camera.position.set(9, 7.5, 11);
  camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight("#ffffff", "#8da3cf", 2.1));
  const sun = new THREE.DirectionalLight("#fff4d9", 3);
  sun.position.set(-5, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -8,
    right: 8,
    top: 8,
    bottom: -8,
    near: 0.1,
    far: 30,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#9bbaff", 2);
  fill.position.set(5, 2, -7);
  scene.add(fill);
  const world = new THREE.Group();
  scene.add(world);
  world.rotation.y = -0.1;
  const mat = (color: string, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0.02,
      ...extra,
    });
  const white = mat("#f8faff"),
    blue = mat("#1b4de4"),
    navy = mat("#0b205c"),
    glass = mat("#5d8eec", { metalness: 0.35, roughness: 0.24 });
  const lime = mat("#c2ec92"),
    land = mat("#b8d699"),
    sand = mat("#e8e3cc"),
    sea = mat("#719ce8", { roughness: 0.35, metalness: 0.18 });
  const rail = mat("#91a9ce", { metalness: 0.5, roughness: 0.3 });
  const boxGeometries = new Map<string, RoundedBoxGeometry>();
  function box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = world,
    radius = 0.04,
  ) {
    const key = `${w},${h},${d},${radius}`;
    let geometry = boxGeometries.get(key);
    if (!geometry) {
      geometry = new RoundedBoxGeometry(w, h, d, 2, radius);
      boxGeometries.set(key, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    r: number,
    height: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = world,
  ) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 48), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(5.2, 0.34, sea, 0, -1.3, 0);
  const ground = cylinder(4.35, 0.26, sand, 0, -1.02, -1.05);
  ground.scale.z = 0.76;
  const grass = cylinder(3.93, 0.13, land, 0, -0.84, -1.25);
  grass.scale.z = 0.76;
  const road = box(7.3, 0.045, 0.43, white, 0, -0.74, 1.02);
  road.rotation.y = -0.1;
  box(1.05, 0.04, 3.5, white, 1.78, -0.72, 0.8);
  const building = new THREE.Group();
  building.position.set(-0.7, -0.67, -0.88);
  world.add(building);
  box(3.2, 0.26, 2.4, navy, 0, 0.06, 0, building);
  box(2.94, 5.25, 1.98, white, 0, 2.78, 0, building);
  const floorBand = box(3.18, 0.14, 2.26, lime, 0, 3.8, 0, building);
  const selectedWindow = box(0.48, 0.38, 0.06, lime, 0.38, 3.6, 1.028, building);
  const sideWindow = box(0.06, 0.38, 0.55, lime, 1.49, 3.6, 0.25, building);
  for (let f = 1; f <= 8; f++) {
    const y = f * 0.6;
    box(3.16, 0.12, 2.26, white, 0, y + 0.21, 0, building);
    for (let col = 0; col < 5; col++) {
      const x = -1.13 + col * 0.56;
      box(0.38, 0.36, 0.025, glass, x, y - 0.07, 1.005, building, 0.007);
      box(0.42, 0.025, 0.28, white, x, y - 0.28, 1.14, building, 0.007);
      box(0.42, 0.11, 0.022, rail, x, y - 0.21, 1.27, building, 0.005);
      box(0.36, 0.36, 0.025, glass, x, y - 0.07, -1.005, building, 0.007);
    }
    for (const z of [-0.62, 0.15, 0.69]) {
      box(0.024, 0.36, 0.35, glass, 1.48, y - 0.07, z, building, 0.007);
      box(0.024, 0.36, 0.35, glass, -1.48, y - 0.07, z, building, 0.007);
    }
  }
  box(3.4, 0.18, 2.55, white, 0, 5.22, 0, building);
  box(1.2, 0.23, 0.9, navy, -0.65, 5.42, -0.2, building);
  box(0.75, 0.018, 0.55, blue, 0.6, 5.33, 0.1, building);
  for (const x of [-1.34, 1.34]) box(0.15, 4.9, 0.17, white, x, 2.6, 1.09, building);
  box(0.52, 0.53, 0.06, navy, 0.25, 0.34, 1.04, building);
  box(1.7, 0.065, 0.7, white, 0.15, 0.67, 1.25, building);
  const neighbour = box(1.6, 1.35, 1.3, white, 2.52, -0.05, -0.85);
  box(1.76, 0.12, 1.45, navy, 2.52, 0.68, -0.85);
  for (const x of [2.12, 2.52, 2.92]) box(0.21, 0.36, 0.02, glass, x, 0.07, -0.188);
  neighbour.rotation.y = 0.06;
  box(1.45, 0.06, 1.6, white, -2.75, -0.65, 0.1);
  box(1.17, 0.065, 1.33, blue, -2.75, -0.612, 0.1, world, 0.1);
  for (let i = 0; i < 4; i++) {
    box(0.29, 0.055, 0.6, white, -2.05 + i * 0.61, -0.66, 1.63);
  }
  box(0.62, 0.09, 2.0, sand, 2.45, -1, 2.15);
  for (let i = 0; i < 7; i++) box(0.61, 0.025, 0.022, white, 2.45, -0.94, 1.36 + i * 0.24);
  function tree(x: number, z: number, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, -0.7, z);
    g.scale.setScalar(scale);
    world.add(g);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 1.05, 8), navy);
    trunk.position.y = 0.47;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 6), i % 2 ? lime : land);
      leaf.scale.set(0.36, 0.12, 1.35);
      leaf.rotation.y = (i * Math.PI) / 3;
      leaf.rotation.x = 0.25;
      leaf.position.set(
        Math.sin((i * Math.PI) / 3) * 0.22,
        1.05,
        Math.cos((i * Math.PI) / 3) * 0.22,
      );
      leaf.castShadow = true;
      g.add(leaf);
    }
  }
  tree(-3.5, -1.6, 1.2);
  tree(3.3, 0.15, 1.05);
  tree(1.8, -2.6, 0.9);
  tree(-1.4, -3, 1.1);
  for (const r of [4.5, 4.85]) {
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0.15, Math.PI * 1.1, false, 0);
    const points = curve.getPoints(80).map((p) => new THREE.Vector3(p.x, -1.11, p.y));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: "#cfdcff",
        transparent: true,
        opacity: 0.65,
      }),
    );
    world.add(line);
  }
  world.updateMatrixWorld(true);
  const inverse = world.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh[]>();
  const moving = new Set([floorBand, selectedWindow, sideWindow]);
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || moving.has(object) || Array.isArray(object.material))
      return;
    const key = `${object.material.id},${object.castShadow},${object.receiveShadow}`;
    const batch = batches.get(key) ?? [];
    batch.push(object);
    batches.set(key, batch);
  });
  const movingGeometries = new Set<THREE.BufferGeometry>([...moving].map((mesh) => mesh.geometry));
  const retiredGeometries = new Set<THREE.BufferGeometry>();
  for (const batch of batches.values()) {
    const geometries = batch.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    });
    const geometry = mergeGeometries(geometries);
    geometries.forEach((part) => part.dispose());
    if (!geometry) continue;
    const first = batch[0]!;
    const merged = new THREE.Mesh(geometry, first.material);
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    world.add(merged);
    for (const mesh of batch) {
      mesh.removeFromParent();
      if (!movingGeometries.has(mesh.geometry)) retiredGeometries.add(mesh.geometry);
    }
  }
  retiredGeometries.forEach((geometry) => geometry.dispose());
  boxGeometries.clear();
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true,
    disposed = false,
    frame = 0;
  let targetRotation = -0.1,
    rotation = -0.1,
    targetFloor = 3.6,
    floorY = 3.6;
  const render = () => {
    frame = 0;
    if (disposed || !visible) return;
    const changed =
      Math.abs(targetRotation - rotation) > 0.00001 || Math.abs(targetFloor - floorY) > 0.00001;
    rotation += (targetRotation - rotation) * (mq.matches ? 1 : 0.08);
    floorY += (targetFloor - floorY) * (mq.matches ? 1 : 0.12);
    world.rotation.y = rotation;
    floorBand.position.y = floorY + 0.21;
    selectedWindow.position.y = floorY - 0.07;
    sideWindow.position.y = floorY - 0.07;
    if (changed) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    if (Math.abs(targetRotation - rotation) > 0.001 || Math.abs(targetFloor - floorY) > 0.001)
      frame = requestAnimationFrame(render);
  };
  const draw = () => {
    if (!frame && !disposed && visible) frame = requestAnimationFrame(render);
  };
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    const aspect = w / h,
      size = 6.1;
    camera.left = -size * aspect;
    camera.right = size * aspect;
    camera.top = size;
    camera.bottom = -size;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    draw();
  });
  resize.observe(host);
  const visibility = new IntersectionObserver(
    ([e]) => {
      visible = e?.isIntersecting ?? false;
      if (visible) draw();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { rootMargin: "150px" },
  );
  visibility.observe(host);
  const pointer = (e: PointerEvent) => {
    if (mq.matches || e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    camera.position.x = 9 + ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    camera.lookAt(0, 0.8, 0);
    draw();
  };
  host.addEventListener("pointermove", pointer);
  const motionChange = () => draw();
  mq.addEventListener("change", motionChange);
  draw();
  return {
    setFloor(n) {
      targetFloor = n * 0.6;
      draw();
    },
    setSide(s) {
      targetRotation = s === "sea" ? -0.1 : Math.PI - 0.4;
      draw();
    },
    setProgress(p) {
      targetRotation = -0.1 + p * 0.5;
      draw();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      host.removeEventListener("pointermove", pointer);
      mq.removeEventListener("change", motionChange);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
