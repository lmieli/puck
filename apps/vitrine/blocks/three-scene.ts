// Real-time product renderer used by the Product3D block. Builds a studio-lit
// scene with a procedural product (or a .glb model) and eases its rotation and
// camera towards the scroll progress for a smooth, physical feel.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type SceneOptions = {
  shape: string;
  color: string;
  finish: string;
  model: string;
  accent: string;
  dark: boolean;
};

function material(color: string, finish: string) {
  const c = new THREE.Color(color);
  if (finish === "gloss")
    return new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
  if (finish === "matte")
    return new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: 0,
      roughness: 0.78,
      sheen: 0.4,
    });
  return new THREE.MeshPhysicalMaterial({
    color: c,
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
}

const glass = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0x050608,
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
  });
const rubber = (color = 0x1b1c1f) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.6,
  });

function phone(body: THREE.Material) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(1.5, 3.1, 0.16, 8, 0.22), body));
  const screen = new THREE.Mesh(
    new RoundedBoxGeometry(1.4, 3.0, 0.02, 6, 0.18),
    glass()
  );
  screen.position.z = 0.075;
  g.add(screen);
  const island = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.11, 0.01, 4, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  island.position.set(0, 1.33, 0.09);
  g.add(island);
  const bump = new THREE.Mesh(
    new RoundedBoxGeometry(0.66, 0.66, 0.06, 6, 0.16),
    body
  );
  bump.position.set(-0.32, 1.06, -0.1);
  g.add(bump);
  const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 48);
  const ringGeo = new THREE.TorusGeometry(0.125, 0.018, 16, 48);
  [
    [-0.45, 1.2],
    [-0.19, 1.2],
    [-0.45, 0.93],
  ].forEach(([x, y]) => {
    const lens = new THREE.Mesh(lensGeo, glass());
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, -0.15);
    g.add(lens);
    const ring = new THREE.Mesh(ringGeo, body);
    ring.position.set(x, y, -0.18);
    g.add(ring);
  });
  return g;
}

function watch(body: THREE.Material, color: string) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.42, 0.36, 8, 0.28), body));
  const screen = new THREE.Mesh(
    new RoundedBoxGeometry(1.06, 1.28, 0.02, 6, 0.22),
    glass()
  );
  screen.position.z = 0.18;
  g.add(screen);
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.14, 32),
    body
  );
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.66, 0.22, 0);
  g.add(crown);
  const band = rubber(new THREE.Color(color).multiplyScalar(0.55).getHex());
  [1, -1].forEach((dir) => {
    const strap = new THREE.Mesh(
      new RoundedBoxGeometry(0.92, 1.5, 0.08, 4, 0.04),
      band
    );
    strap.position.set(0, dir * 1.35, -0.06);
    strap.rotation.x = dir * 0.18;
    g.add(strap);
  });
  return g;
}

function speaker(body: THREE.Material, color: string, accent: string) {
  const g = new THREE.Group();
  const fabric = rubber(new THREE.Color(color).getHex());
  g.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.3, 96, 1), fabric)
  );
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.83, 0.83, 0.05, 96),
    body
  );
  cap.position.y = 1.17;
  g.add(cap);
  const light = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.035, 16, 96),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 2.2,
    })
  );
  light.rotation.x = Math.PI / 2;
  light.position.y = 1.2;
  g.add(light);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.82, 0.08, 96),
    body
  );
  base.position.y = -1.17;
  g.add(base);
  return g;
}

function headphones(body: THREE.Material) {
  const g = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.065, 24, 120, Math.PI),
    body
  );
  band.position.y = 0.15;
  g.add(band);
  const pad = new THREE.Mesh(
    new THREE.TorusGeometry(1.03, 0.095, 16, 100, Math.PI * 0.6),
    rubber(0x26272b)
  );
  pad.rotation.z = Math.PI * 0.2;
  pad.position.y = 0.13;
  g.add(pad);
  [1, -1].forEach((side) => {
    const arm = new THREE.Mesh(
      new RoundedBoxGeometry(0.09, 0.7, 0.12, 4, 0.04),
      body
    );
    arm.position.set(side * 1.05, -0.15, 0);
    g.add(arm);
    const cup = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.34, 72),
      body
    );
    shell.rotation.z = Math.PI / 2;
    cup.add(shell);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.02, 72),
      glass()
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 0.18;
    cup.add(cap);
    const cushion = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.14, 24, 72),
      rubber(0x1f2023)
    );
    cushion.rotation.y = Math.PI / 2;
    cushion.position.x = -side * 0.2;
    cup.add(cushion);
    cup.position.set(side * 1.12, -0.72, 0);
    g.add(cup);
  });
  g.position.y = 0.2;
  return g;
}

function contactShadow(dark: boolean) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -2.15;
  return mesh;
}

function fit(object: THREE.Object3D, height = 3.2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = height / Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
}

export function createProductScene(
  canvas: HTMLCanvasElement,
  opts: SceneOptions
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.dark ? 1.05 : 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.3, 11);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(opts.accent), 3.2);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const pivot = new THREE.Group();
  scene.add(pivot);
  scene.add(contactShadow(opts.dark));

  const body = material(opts.color, opts.finish);
  const procedural = () => {
    if (opts.shape === "watch") return watch(body, opts.color);
    if (opts.shape === "speaker") return speaker(body, opts.color, opts.accent);
    if (opts.shape === "headphones") return headphones(body);
    return phone(body);
  };

  let product: THREE.Object3D = procedural();
  pivot.add(product);
  if (opts.model) {
    new GLTFLoader().load(
      opts.model,
      (gltf) => {
        pivot.remove(product);
        product = gltf.scene;
        fit(product);
        pivot.add(product);
      },
      undefined,
      () => {
        /* keep the procedural product if the model fails to load */
      }
    );
  }

  const target = { p: 0 };
  const state = { p: 0 };
  let running = false;
  let disposed = false;
  const clock = new THREE.Clock();

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the product framed on narrow (portrait) screens.
    camera.position.z = w / h < 0.8 ? 15 : 11;
    camera.updateProjectionMatrix();
  };

  const frame = () => {
    if (disposed) return;
    const t = clock.getElapsedTime();
    state.p += (target.p - state.p) * 0.085;
    const p = state.p;
    pivot.rotation.y = -0.55 + p * Math.PI * 2.1;
    pivot.rotation.x = 0.12 + Math.sin(p * Math.PI) * 0.32;
    pivot.rotation.z = Math.sin(p * Math.PI * 2) * 0.06;
    pivot.position.y = -0.3 + Math.sin(t * 1.2) * 0.05;
    const zoom = 1 + Math.sin(p * Math.PI) * 0.12;
    pivot.scale.setScalar(zoom);
    renderer.render(scene, camera);
  };

  resize();
  frame();

  return {
    setProgress(p: number) {
      target.p = p;
    },
    start() {
      if (running || disposed) return;
      running = true;
      renderer.setAnimationLoop(frame);
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
    },
    resize,
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const m = mesh.material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => mm.dispose());
      });
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
