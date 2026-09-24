/* ==========================================================================
   viewer.js: the lazy 3D stage (§10). Used by the home hero and the PDP.

     const stage = await createStage(container, { productId, interactive:true });
     stage.setProduct(id); stage.rotateBy(deg); stage.reset(); stage.dispose();

   Only ever loaded with dynamic import() after first paint. three.js comes
   from the import map on the pages that need it.

   Light design: the key spotlight carries the komorebi leaf "cookie" and
   lives on a rig that follows the camera's azimuth, so the product is
   always lit from the upper left as you turn it, and the leaf pattern
   slides across tube and plinth like wind.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { productById, toWebp, imageSize } from "../core/format.js";

const { gsap } = window;

const PLINTH_TOP = -1.62;           // tube cap bottom sits here (model units)
const POLAR = 1.45;                 // fixed viewing elevation (rad from +Y)
const FILL = 0.78;                  // tube fills ~78% of stage height
const AUTO_SPEED = 0.12;            // rad/s idle turn
const IDLE_RESUME = 3000;           // ms after last drag
const FRAME_MIN = 1000 / 61;        // cap at 60fps

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Shared across stages on a page: each GLB is fetched once. */
const gltfLoader = new GLTFLoader();
const glbCache = new Map();
const loadGLB = (url) => {
  if (!glbCache.has(url)) glbCache.set(url, gltfLoader.loadAsync(url));
  return glbCache.get(url);
};

/* A soft radial blot, drawn once, used as the contact shadow. */
function contactTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(43,43,43,0.9)");
  grd.addColorStop(0.35, "rgba(43,43,43,0.45)");
  grd.addColorStop(1, "rgba(43,43,43,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function createStage(container, { productId, interactive = true, autoRotate = true } = {}) {
  /* ---- Renderer ------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);      // transparent: the paper page shows through
  // A GPU that can't compile our shaders, or loses its context, must never leave a blank
  // stage: flag it, and let the page fall back to the still image.
  let gpuFailed = false, contextLost = false;
  renderer.debug.onShaderError = () => { gpuFailed = true; };
  const canvas = renderer.domElement;
  canvas.className = "stage__canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  /* ---- Scene & environment --------------------------------------------------- */
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  // Brief: 0.6. Tuned to 0.3 so the white label isn't already at full brightness from ambient
  // alone; otherwise the leaf cookie has no contrast to work with and the signature disappears.
  scene.environmentIntensity = 0.3;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.set(0, 3.6, 26);
  const target = new THREE.Vector3(0, 2.4, 0);
  camera.lookAt(target);

  /* ---- Lights ----------------------------------------------------------------- */
  const rig = new THREE.Group();            // follows the camera azimuth
  scene.add(rig);

  const texLoader = new THREE.TextureLoader();
  const cookie = texLoader.load("assets/overlays/komorebi-cookie.jpg");
  cookie.colorSpace = THREE.SRGBColorSpace;

  const spot = new THREE.SpotLight(0xFFF3E4, 55);
  spot.position.set(-6, 14, 8);
  spot.angle = 0.55;
  spot.penumbra = 0.85;
  spot.decay = 0.75;                         // softer falloff so 55 reads as a warm key at ~17 units
  spot.castShadow = true;                    // required for spot.map
  spot.map = cookie;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 4;
  spot.shadow.camera.far = 40;
  spot.shadow.bias = -0.0004;
  spot.shadow.radius = 6;
  spot.shadow.blurSamples = 12;
  spot.target.position.set(0, 1.4, 0);
  rig.add(spot, spot.target);
  const spotHome = spot.position.clone();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e2da, 0.2));   // brief: .35, lowered with the environment
  const rim = new THREE.DirectionalLight(0xeef3ff, 0.6);
  rim.position.set(7, 8, -9);                // cool rim from the back right
  rig.add(rim);

  /* ---- Plinth & contact shadow -------------------------------------------------- */
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.32, 96),
    new THREE.MeshStandardMaterial({ color: 0xEFEDE8, roughness: 0.92 }),
  );
  plinth.position.y = PLINTH_TOP - 0.16;
  plinth.receiveShadow = true;
  scene.add(plinth);

  const contactMat = new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, opacity: 0.45, depthWrite: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = PLINTH_TOP + 0.004;
  contact.scale.set(3.1, 2.4, 1);
  scene.add(contact);

  /* ---- World group: everything that rises on reveal ------------------------------ */
  const world = new THREE.Group();
  scene.add(world);
  world.add(plinth, contact);

  /* ---- Products ------------------------------------------------------------------ */
  const objects = new Map();                 // productId → Promise<THREE.Object3D>
  let current = null, currentId = null, currentIsCard = false;

  async function buildTube(p) {
    const gltf = await loadGLB(p.model);
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = o.material.clone();      // own copy so opacity fades don't leak between stages
    });
    const holder = new THREE.Group();
    holder.add(root);
    holder.userData.card = false;
    return holder;
  }

  async function buildCard(p) {
    const src = toWebp(p.images.hero);
    const [w, h] = imageSize(src);
    const map = await texLoader.loadAsync(src);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // The bottle occupies ~93% of its image with ~3.6% padding under it.
    const planeH = 6.3 / 0.929;
    const planeW = planeH * (w / h);
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.35, side: THREE.DoubleSide });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
    card.position.y = PLINTH_TOP - planeH * (41 / 1143) + planeH / 2;
    card.castShadow = true;
    card.receiveShadow = true;
    // Shadows follow the bottle's silhouette, not the plane's rectangle.
    card.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
    const holder = new THREE.Group();
    holder.add(card);
    holder.userData.card = true;
    holder.userData.mesh = card;
    return holder;
  }

  function getObject(id) {
    if (!objects.has(id)) {
      const p = productById(id);
      if (!p) return Promise.reject(new Error(`Unknown product ${id}`));
      objects.set(id, p.model ? buildTube(p) : buildCard(p));
    }
    return objects.get(id);
  }

  const materialsOf = (obj) => {
    const out = [];
    obj.traverse((o) => { if (o.isMesh) out.push(...[].concat(o.material)); });
    return out;
  };
  function setOpacity(obj, v) {
    materialsOf(obj).forEach((m) => {
      m.opacity = v;
      if (!obj.userData.card) m.transparent = v < 1;
      m.depthWrite = v > 0.5;
    });
  }

  /** Swap: the current product sinks (y −0.4, 0.5s), the next rises into the light (0.9s). */
  async function setProduct(id, { instant = false } = {}) {
    if (id === currentId) return;
    currentId = id;
    const next = await getObject(id);
    if (currentId !== id) return;            // a later click won
    const prev = current;
    current = next;
    currentIsCard = next.userData.card;
    contact.scale.set(currentIsCard ? 3.6 : 3.1, currentIsCard ? 1.5 : 2.4, 1);
    const still = instant || reduced();

    if (prev && prev !== next) {
      gsap.killTweensOf(prev.position);
      const fade = { v: 1 };
      if (still) world.remove(prev);
      else {
        gsap.to(prev.position, { y: -0.4, duration: 0.5, ease: "power2.in" });
        gsap.to(fade, { v: 0, duration: 0.5, ease: "power2.in", onUpdate: () => setOpacity(prev, fade.v),
          onComplete: () => { world.remove(prev); setOpacity(prev, 1); prev.position.y = 0; } });
      }
    }
    world.add(next);
    fit();
    if (still) { next.position.y = 0; setOpacity(next, 1); return; }
    next.position.y = -0.4;
    setOpacity(next, 0);
    const fadeIn = { v: 0 };
    gsap.to(next.position, { y: 0, duration: 0.9, ease: "expo.out", delay: prev ? 0.2 : 0 });
    gsap.to(fadeIn, { v: 1, duration: 0.9, ease: "expo.out", delay: prev ? 0.2 : 0, onUpdate: () => setOpacity(next, fadeIn.v) });
  }

  /* ---- Fit: derive camera distance from the product's bounding box -------------- */
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  function fit() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    // Always frame to the tube height so switching products keeps the plinth steady.
    let height = 8.12, width = 4.8;
    if (current && !currentIsCard) {
      box.setFromObject(current.children[0]);
      box.getSize(size);
      height = Math.max(size.y, 1);
    }
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distH = (height / FILL) / (2 * tan);
    const distW = (width / 0.9) / (2 * tan * camera.aspect);
    const dist = Math.max(distH, distW);
    target.set(0, PLINTH_TOP + height / 2 - 0.25, 0);
    spherical.setFromVector3(camera.position.clone().sub(controls ? controls.target : target));
    spherical.radius = dist;
    spherical.phi = POLAR;
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical));
    if (controls) controls.target.copy(target);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  /* ---- Controls ---------------------------------------------------------------- */
  let controls = null;
  let idleTimer = 0;
  const wantsAuto = autoRotate && !reduced();
  if (interactive) {
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.minPolarAngle = controls.maxPolarAngle = POLAR;
    controls.autoRotate = wantsAuto;
    controls.autoRotateSpeed = (AUTO_SPEED * 60) / (2 * Math.PI);   // OrbitControls units → 0.12 rad/s
    canvas.style.touchAction = "pan-y";      // vertical swipes still scroll the page
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      clearTimeout(idleTimer);
      container.dispatchEvent(new CustomEvent("stage:drag"));
    });
    controls.addEventListener("end", () => {
      clearTimeout(idleTimer);
      if (wantsAuto) idleTimer = setTimeout(() => (controls.autoRotate = true), IDLE_RESUME);
    });
  }

  /** Turn the view by `deg` (arrow keys use ±15°). */
  function rotateBy(deg, duration = 0.6) {
    if (!controls) return;
    const offset = camera.position.clone().sub(controls.target);
    spherical.setFromVector3(offset);
    const state = { theta: spherical.theta };
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    gsap.to(state, {
      theta: spherical.theta + THREE.MathUtils.degToRad(deg), duration: reduced() ? 0 : duration, ease: "komorebi",
      onUpdate: () => {
        spherical.theta = state.theta;
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      },
      onComplete: () => { if (wantsAuto) idleTimer = setTimeout(() => (controls.autoRotate = true), IDLE_RESUME); },
    });
  }
  function reset() {
    if (!controls) return;
    spherical.setFromVector3(camera.position.clone().sub(controls.target));
    let d = -spherical.theta;
    d = Math.atan2(Math.sin(d), Math.cos(d));            // shortest way home
    rotateBy(THREE.MathUtils.radToDeg(d), 1);
  }

  /* ---- Loop: runs only while visible ------------------------------------------- */
  const timer = new THREE.Timer();
  let last = 0, running = false, onscreen = true, firstFrame = null;
  const firstFramePromise = new Promise((r) => (firstFrame = r));

  function frame(now) {
    if (now - last < FRAME_MIN) return;
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.1);
    last = now;
    const t = timer.getElapsed();
    if (controls) controls.update(dt);
    const azimuth = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
    rig.rotation.y = azimuth;
    if (!reduced()) {
      // Leaves in the wind: two slow sines (11s and 17s periods).
      spot.position.x = spotHome.x + Math.sin((t * 2 * Math.PI) / 11) * 0.5;
      spot.position.z = spotHome.z + Math.sin((t * 2 * Math.PI) / 17) * 0.5;
    }
    // Perfume cards face the viewer and sway ±10°; never edge-on.
    if (current?.userData.card) {
      current.rotation.y = azimuth + (reduced() ? 0 : Math.sin((t * 2 * Math.PI) / 9) * THREE.MathUtils.degToRad(10));
    }
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame(); firstFrame = null; }
  }
  const setRunning = (yes) => {
    if (yes === running) return;
    running = yes;
    if (yes) timer.reset?.();
    renderer.setAnimationLoop(yes ? frame : null);
  };
  const updateRunning = () => setRunning(onscreen && !document.hidden && !disposed);

  const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; updateRunning(); });
  io.observe(container);
  document.addEventListener("visibilitychange", updateRunning);

  const ro = new ResizeObserver(() => fit());
  ro.observe(container);

  /* ---- Keyboard (the container is the focus target) ------------------------------ */
  const onKey = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); rotateBy(-15); }
    if (e.key === "ArrowRight") { e.preventDefault(); rotateBy(15); }
  };
  if (interactive) container.addEventListener("keydown", onKey);

  canvas.addEventListener("webglcontextlost", () => {
    contextLost = true;
    setRunning(false);
    container.dispatchEvent(new CustomEvent("stage:lost"));
  });

  /* ---- Cleanup ------------------------------------------------------------------ */
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", updateRunning);
    container.removeEventListener("keydown", onKey);
    controls?.dispose();
    if (contextLost || renderer.getContext().isContextLost()) { canvas.remove(); return; }   // nothing left on the GPU to free
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      [].concat(o.material || []).forEach((m) => {
        Object.values(m).forEach((v) => v?.isTexture && v.dispose());
        m.dispose();
      });
      if (o.customDepthMaterial) o.customDepthMaterial.dispose();
    });
    cookie.dispose();
    envRT.dispose();
    renderer.dispose();
    canvas.remove();
  }
  window.addEventListener("pagehide", (e) => { if (!e.persisted) dispose(); }, { once: true });

  /* ---- Go ---------------------------------------------------------------------- */
  fit();
  await setProduct(productId, { instant: true });
  updateRunning();
  await firstFramePromise;
  if (gpuFailed || contextLost) {
    dispose();
    throw new Error("WebGL could not render the stage");
  }

  /** Page-load moment: the stage rises 30px worth and its exposure warms. */
  function intro({ duration = 1.2, delay = 0 } = {}) {
    if (reduced()) return;
    world.position.y = -0.35;
    renderer.toneMappingExposure = 0.72;
    gsap.to(world.position, { y: 0, duration, delay, ease: "expo.out" });
    gsap.to(renderer, { toneMappingExposure: 0.95, duration, delay, ease: "komorebi" });
  }

  return {
    setProduct, rotateBy, reset, dispose, intro,
    get productId() { return currentId; },
    /* for tuning in devtools only */
    get _debug() { return { THREE, renderer, scene, spot, rim, plinth, camera }; },
  };
}
