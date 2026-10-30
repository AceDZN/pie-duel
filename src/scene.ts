// The 3D booth: table, Pie-o-Matic, rivals, projectiles, splats and confetti. It renders what the game controller tells it.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fitHeight, shadowsOn, type Models, type ModelName } from './models';
import { backdrop, chalkboard, neonSign, radialGlow, stripes, tableTop, wheelFace } from './textures';
import { Tweens, ease } from './tween';

export type Seat = 'you' | 'r1' | 'r2';
export type Anim = 'idle' | 'hit' | 'laugh' | 'cheer' | 'defeat';
export type StageLook = 'booth' | 'dim' | 'rooftop';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const TABLE_Y = 0.78;
const CAM_HOME = V(0.05, 1.3, 1.95);
const LOOK_HOME = V(0.14, 1.12, -0.9);

// ---------------------------------------------------------------- rivals

class Rival {
  root = new THREE.Group();
  mixer: THREE.AnimationMixer | null = null;
  actions = new Map<Anim, THREE.AnimationAction>();
  current: THREE.AnimationAction | null = null;
  head: THREE.Object3D | null = null;
  face = new THREE.Group(); // cream blobs stuck here
  faceOffset = V(0, 0, 0.12);
  height = 1.75;
  procedural: THREE.Group | null = null;
  bob = Math.random() * 10;

  constructor(gltf: GLTF | undefined, tint: number | null, height: number) {
    this.height = height;
    if (gltf) {
      const model = cloneSkinned(gltf.scene);
      if (tint !== null)
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.material) {
            const mat = (m.material as THREE.MeshStandardMaterial).clone();
            mat.color = new THREE.Color(tint);
            m.material = mat;
          }
        });
      shadowsOn(model, true, false);
      const wrap = fitHeight(model, height);
      this.root.add(wrap);
      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        const n = clip.name.toLowerCase();
        const key: Anim | null = /idle/.test(n) ? 'idle' : /hit|flinch|react/.test(n) ? 'hit' : /laugh|taunt/.test(n) ? 'laugh' : /cheer|celebr|victory/.test(n) ? 'cheer' : /defeat|lose|sad/.test(n) ? 'defeat' : null;
        if (key && !this.actions.has(key)) this.actions.set(key, this.mixer.clipAction(clip));
      }
      model.traverse((o) => {
        if (!this.head && /head/i.test(o.name) && !/top|end|nub/i.test(o.name)) this.head = o;
      });
      this.play('idle');
    } else {
      this.procedural = proceduralRival(height);
      this.root.add(this.procedural);
    }
    this.root.add(this.face);
  }

  play(a: Anim, fade = 0.25) {
    const act = this.actions.get(a) ?? this.actions.get('idle');
    if (!act || !this.mixer) return 0;
    if (this.current === act && a === 'idle') return 0;
    act.reset();
    act.setLoop(a === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, a === 'idle' ? Infinity : 1);
    act.clampWhenFinished = a !== 'idle';
    act.timeScale = a === 'hit' ? 1.15 : 1;
    act.enabled = true;
    if (this.current && this.current !== act) act.crossFadeFrom(this.current, fade, false);
    act.play();
    this.current = act;
    return act.getClip().duration / act.timeScale;
  }

  /** World position of the face (where pies land). */
  facePos(out = new THREE.Vector3()) {
    if (this.head) {
      this.head.getWorldPosition(out);
      out.y += this.height * 0.02;
      out.z += 0.1;
      return out;
    }
    return this.root.localToWorld(out.set(0, this.height * 0.88, 0.15));
  }

  update(dt: number) {
    this.mixer?.update(dt);
    this.bob += dt;
    if (this.procedural) this.procedural.position.y = Math.sin(this.bob * 2) * 0.01;
    // keep the cream on the face as it moves
    const p = this.facePos(new THREE.Vector3());
    this.root.worldToLocal(p);
    this.face.position.copy(p);
  }
}

function proceduralRival(h: number) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3b48f, roughness: 0.6 });
  const coat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(h * 0.24, 24, 16), coat);
  body.scale.set(1.1, 1.25, 0.9);
  body.position.y = h * 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.13, 24, 16), skin);
  head.position.y = h * 0.84;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(h * 0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff6b6b }));
  nose.position.set(0, h * 0.83, h * 0.13);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.1, h * 0.08, h * 0.16, 20), coat);
  hat.position.y = h * 1.0;
  for (const m of [body, head, nose, hat]) {
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- particles

class Confetti {
  mesh: THREE.InstancedMesh;
  pos: THREE.Vector3[] = [];
  vel: THREE.Vector3[] = [];
  rot: THREE.Euler[] = [];
  life: number[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3(1, 1, 1);
  constructor(n: number) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.035, 0.022), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n);
    this.mesh.frustumCulled = false;
    const colors = [0xff4fa3, 0x3ee6ff, 0xffc35a, 0x7ee07a, 0xb36bff, 0xffffff];
    for (let i = 0; i < n; i++) {
      this.pos.push(new THREE.Vector3(0, -99, 0));
      this.vel.push(new THREE.Vector3());
      this.rot.push(new THREE.Euler());
      this.life.push(0);
      this.mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
  }
  private cursor = 0;
  burst(at: THREE.Vector3, n = 120, speed = 2.2, up = 1.2) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor++ % this.pos.length;
      this.pos[i].copy(at);
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      this.vel[i].set(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.6 + up * 0.6, Math.sin(a) * Math.cos(b)).multiplyScalar(speed * (0.4 + Math.random()));
      this.rot[i].set(Math.random() * 6, Math.random() * 6, 0);
      this.life[i] = 2.4 + Math.random();
    }
  }
  update(dt: number) {
    for (let i = 0; i < this.pos.length; i++) {
      if (this.life[i] <= 0) {
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      this.life[i] -= dt;
      const v = this.vel[i];
      v.y -= 3.2 * dt;
      v.multiplyScalar(1 - 2.2 * dt);
      v.x += Math.sin(this.life[i] * 7 + i) * 0.4 * dt;
      this.pos[i].addScaledVector(v, dt);
      if (this.pos[i].y < TABLE_Y + 0.005 && Math.hypot(this.pos[i].x, this.pos[i].z - 0) < 1.25) {
        this.pos[i].y = TABLE_Y + 0.005;
        v.set(0, 0, 0);
      }
      this.rot[i].x += dt * 8;
      this.rot[i].y += dt * 5;
      this.q.setFromEuler(this.rot[i]);
      this.m.compose(this.pos[i], this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class Cream {
  mesh: THREE.InstancedMesh;
  pos: THREE.Vector3[] = [];
  vel: THREE.Vector3[] = [];
  size: number[] = [];
  life: number[] = [];
  private m = new THREE.Matrix4();
  private cursor = 0;
  constructor(n: number) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.35 }), n);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      this.pos.push(new THREE.Vector3(0, -99, 0));
      this.vel.push(new THREE.Vector3());
      this.size.push(0);
      this.life.push(0);
    }
  }
  burst(at: THREE.Vector3, dir: THREE.Vector3, n = 70) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor++ % this.pos.length;
      this.pos[i].copy(at);
      this.vel[i]
        .set(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5)
        .multiplyScalar(3.2)
        .addScaledVector(dir, -0.8 - Math.random());
      this.size[i] = 0.012 + Math.random() * 0.028;
      this.life[i] = 1.2 + Math.random() * 0.8;
    }
  }
  update(dt: number) {
    for (let i = 0; i < this.pos.length; i++) {
      if (this.life[i] <= 0) {
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      this.life[i] -= dt;
      this.vel[i].y -= 6 * dt;
      this.pos[i].addScaledVector(this.vel[i], dt);
      if (this.pos[i].y < TABLE_Y + 0.01 && Math.abs(this.pos[i].x) < 1.3 && Math.abs(this.pos[i].z) < 1.3) {
        this.pos[i].y = TABLE_Y + 0.01;
        this.vel[i].set(0, 0, 0);
      }
      const s = this.size[i] * Math.min(1, this.life[i] * 2);
      this.m.makeScale(s, s * 0.8, s).setPosition(this.pos[i]);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- stage

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 80);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  tweens = new Tweens();
  models: Models;
  reducedMotion = false;

  rivals = new Map<Seat, Rival>();
  cannon = new THREE.Group(); // swivel
  barrelTip = new THREE.Object3D();
  hopper = new THREE.Group(); // visible shells
  lever = new THREE.Group();
  bulbs: THREE.Mesh[] = [];
  wheelGroup = new THREE.Group();
  wheels: THREE.Mesh[] = [];
  coin = new THREE.Mesh();
  dummy = new THREE.Group();
  trayPie = new THREE.Group(); // dare-bonus spring tray on your side
  confetti = new Confetti(900);
  cream = new Cream(500);
  private yourCream = 0;
  private piePrototype: THREE.Object3D;
  private shake = 0;
  private camLook = LOOK_HOME.clone();
  private camPos = CAM_HOME.clone();
  private camTarget = { pos: CAM_HOME.clone(), look: LOOK_HOME.clone() };
  private stringLights: THREE.Mesh[] = [];
  private lights: { key: THREE.DirectionalLight; hemi: THREE.HemisphereLight; neon: THREE.PointLight[] };
  private rooftop = new THREE.Group();
  private booth = new THREE.Group();
  private bursts: { mesh: THREE.Points; t: number; vel: Float32Array }[] = [];
  private elapsed = 0;
  private aimYaw = 0;
  private aimYawTarget = 0;
  private aimPitch = 0;

  constructor(canvas: HTMLCanvasElement, models: Models) {
    this.models = models;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color(0x1c1033);
    this.scene.fog = new THREE.Fog(0x24113f, 9, 26);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    const hemi = new THREE.HemisphereLight(0xb9a6ff, 0x3a1830, 0.9);
    const key = new THREE.DirectionalLight(0xffe2b8, 2.0);
    key.position.set(1.6, 4.2, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0006;
    const pink = new THREE.PointLight(0xff4fa3, 6, 8, 1.6);
    pink.position.set(-2.2, 2.2, -1.2);
    const cyan = new THREE.PointLight(0x3ee6ff, 5, 8, 1.6);
    cyan.position.set(2.4, 2.0, -0.6);
    const warm = new THREE.PointLight(0xffb45a, 5, 6, 1.8);
    warm.position.set(0, 2.3, 0.4);
    this.scene.add(hemi, key, pink, cyan, warm);
    this.lights = { key, hemi, neon: [pink, cyan, warm] };

    this.buildBooth();
    this.buildTable();
    this.buildCannon();
    this.buildWheels();
    this.buildDummy();
    this.buildRooftop();
    this.piePrototype = this.makePie();
    this.scene.add(this.confetti.mesh, this.cream.mesh);
    this.camera.position.copy(CAM_HOME);
    this.camera.lookAt(LOOK_HOME);
  }

  // ------------------------------------------------------------ building

  private buildBooth() {
    const b = this.booth;
    this.scene.add(b);
    // ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x2a1a33, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    b.add(ground);
    // backdrop cylinder
    const bd = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 9, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshBasicMaterial({ map: backdrop(), side: THREE.BackSide, fog: false }));
    bd.position.set(0, 3.8, 2);
    b.add(bd);
    // canopy: striped slanted roof + scalloped valance
    const canopyTex = stripes('#d9343b', '#f8efe0', 18);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), new THREE.MeshStandardMaterial({ map: canopyTex, side: THREE.DoubleSide, roughness: 0.9 }));
    roof.position.set(0, 3.15, -1.0);
    roof.rotation.x = Math.PI / 2 - 0.42;
    b.add(roof);
    const valTex = stripes('#d9343b', '#f8efe0', 28);
    const valance = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.35, 64, 1, true, Math.PI * 0.68, Math.PI * 0.64), new THREE.MeshStandardMaterial({ map: valTex, side: THREE.DoubleSide }));
    valance.position.set(0, 2.62, 1.6);
    b.add(valance);
    // posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a2a12, roughness: 0.7 });
    for (const x of [-2.6, 2.6]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.2, 12), postMat);
      p.position.set(x, 1.6, -0.6);
      p.castShadow = true;
      b.add(p);
    }
    // back wall with prize shelves
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.8), new THREE.MeshStandardMaterial({ color: 0x4b1f3e, roughness: 0.9 }));
    wall.position.set(0, 1.4, -2.6);
    wall.receiveShadow = true;
    b.add(wall);
    this.buildShelf();
    // chalkboards
    const cb1 = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), new THREE.MeshStandardMaterial({ map: chalkboard(['עוגות', 'מגישות', 'עולם טוב', 'יותר!']) }));
    cb1.position.set(-2.05, 1.05, -0.9);
    cb1.rotation.y = 0.55;
    const cb2 = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), new THREE.MeshStandardMaterial({ map: chalkboard(['תמיד', 'יש מקום', 'לעוגה', 'נוספת!']) }));
    cb2.position.set(1.65, 1.55, -2.45);
    b.add(cb1, cb2);
    // neon sign
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshBasicMaterial({ map: neonSign('PIE DUEL'), transparent: true, toneMapped: false }));
    sign.position.set(-2.4, 2.35, -1.6);
    sign.rotation.y = 0.5;
    b.add(sign);
    // ferris wheel far left
    const fw = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.05, 8, 64), new THREE.MeshStandardMaterial({ color: 0x8a6cff, emissive: 0x5a3cff, emissiveIntensity: 0.6 }));
    fw.add(ring);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe7a0, toneMapped: false });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x6a52c8 }));
      s.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0);
      s.rotation.z = a - Math.PI / 2;
      fw.add(s);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bulbMat);
      bulb.position.set(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0);
      fw.add(bulb);
    }
    fw.position.set(-5.5, 3.2, -6);
    fw.rotation.y = 0.4;
    fw.userData.spin = true;
    b.add(fw);
    this.booth.userData.ferris = fw;
    // string lights: catenaries across the canopy
    const glow = radialGlow('rgba(255,210,120,0.9)');
    const bulbM = new THREE.MeshBasicMaterial({ color: 0xffd98a, toneMapped: false });
    const wireM = new THREE.LineBasicMaterial({ color: 0x221122 });
    const strings: [THREE.Vector3, THREE.Vector3, number][] = [
      [V(-2.6, 2.75, -0.6), V(2.6, 2.75, -0.6), 0.35],
      [V(-2.6, 2.55, 0.9), V(2.6, 2.55, 0.9), 0.3],
      [V(-2.6, 2.2, -2.5), V(2.6, 2.2, -2.5), 0.25],
    ];
    for (const [a, c, sag] of strings) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 18; i++) {
        const k = i / 18;
        const p = a.clone().lerp(c, k);
        p.y -= Math.sin(k * Math.PI) * sag;
        pts.push(p);
        if (i % 1 === 0 && i > 0 && i < 18) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbM.clone());
          bulb.position.copy(p).add(V(0, -0.05, 0));
          b.add(bulb);
          this.stringLights.push(bulb);
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
          sp.scale.set(0.3, 0.3, 1);
          sp.position.copy(bulb.position);
          b.add(sp);
        }
      }
      b.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
    }
    // popcorn cart (right)
    const cart = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.45), new THREE.MeshStandardMaterial({ color: 0xc8202c, roughness: 0.5 }));
    box.position.y = 0.75;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.42), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.6, transparent: true, opacity: 0.35, roughness: 0.1 }));
    glass.position.y = 1.31;
    const corn = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.38), new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0x6a4a10, emissiveIntensity: 0.4, roughness: 1 }));
    corn.position.y = 1.17;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.6 }));
    wheel.position.set(0.36, 0.3, 0);
    wheel.rotation.y = Math.PI / 2;
    cart.add(box, glass, corn, wheel);
    cart.position.set(2.3, 0, -1.3);
    cart.rotation.y = -0.6;
    shadowsOn(cart);
    b.add(cart);
  }

  private buildShelf() {
    const g = this.models['prize-shelf'];
    if (g) {
      const shelf = fitHeight(g.scene.clone(), 2.0);
      shelf.position.set(-0.2, 0, -2.45);
      shadowsOn(shelf);
      this.booth.add(shelf);
      return;
    }
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a3e1c, roughness: 0.8 });
    const colors = [0xff9ec7, 0xffe066, 0x9fe3ff, 0xc7a6ff, 0xffffff, 0x9be59b];
    for (let row = 0; row < 3; row++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 0.4), wood);
      plank.position.set(-0.2, 0.9 + row * 0.55, -2.4);
      plank.castShadow = plank.receiveShadow = true;
      this.booth.add(plank);
      for (let k = 0; k < 9; k++) {
        const plush = new THREE.Group();
        const col = colors[(k + row * 2) % colors.length];
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat);
        body.scale.y = 1.1;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), mat);
        head.position.y = 0.16;
        const eyeM = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (const ex of [-0.03, 0.03]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), eyeM);
          eye.position.set(ex, 0.18, 0.08);
          plush.add(eye);
        }
        for (const ex of [-0.06, 0.06]) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat);
          ear.position.set(ex, 0.25, 0);
          plush.add(ear);
        }
        plush.add(body, head);
        plush.position.set(-1.9 + k * 0.42, 0.9 + row * 0.55 + 0.14, -2.35);
        plush.rotation.y = (Math.random() - 0.5) * 0.6;
        shadowsOn(plush);
        this.booth.add(plush);
      }
    }
  }

  private buildTable() {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 64), [
      new THREE.MeshStandardMaterial({ color: 0x7b1a2a, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: tableTop(), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x7b1a2a }),
    ]);
    top.position.set(0, TABLE_Y - 0.03, 0);
    top.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 10, 80), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.8, roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = TABLE_Y - 0.01;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, TABLE_Y - 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x3a1020 }));
    leg.position.y = (TABLE_Y - 0.05) / 2;
    this.scene.add(top, rim, leg);
    // stacks of pie tins and chips for set dressing
    const tin = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.012, 24), tin);
      t.position.set(-0.85, TABLE_Y + 0.008 + i * 0.013, -0.15);
      t.castShadow = true;
      this.scene.add(t);
    }
    const chipCols = [0xff4fa3, 0x29c7e8, 0xffc35a];
    for (let s = 0; s < 3; s++)
      for (let i = 0; i < 4 + s * 2; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), new THREE.MeshStandardMaterial({ color: chipCols[s], roughness: 0.4 }));
        c.position.set(0.7 + s * 0.1, TABLE_Y + 0.007 + i * 0.013, 0.7 - s * 0.06);
        c.castShadow = true;
        this.scene.add(c);
      }
    // first-person hands resting on the table edge
    const skin = new THREE.MeshStandardMaterial({ color: 0xf0b48c, roughness: 0.6 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x2f3a6e, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.1, 6, 12), skin);
      hand.rotation.x = Math.PI / 2;
      hand.scale.set(1.25, 1, 0.7);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.3, 14), sleeve);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.z = 0.22;
      arm.add(hand, cuff);
      arm.position.set(side * 0.55, TABLE_Y + 0.05, 1.05);
      arm.rotation.y = -side * 0.35;
      shadowsOn(arm);
      this.scene.add(arm);
    }
  }

  private buildCannon() {
    const c = this.cannon;
    c.position.set(-0.32, TABLE_Y, 0.05);
    this.scene.add(c);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x3a2a24, metalness: 0.6, roughness: 0.4 }));
    base.position.y = 0.03;
    base.receiveShadow = true;
    this.scene.add(base);
    base.position.copy(c.position).add(V(0, 0.03, 0));
    const g = this.models['pie-o-matic'];
    const swivel = new THREE.Group();
    c.add(swivel);
    if (g) {
      // the Tripo horn points -x: turn it so the horn faces +z (the swivel's forward)
      const inner = g.scene.clone();
      inner.rotation.y = Math.PI / 2;
      const m = fitHeight(inner, 0.6);
      shadowsOn(m);
      swivel.add(m);
      // the model's dome has pies baked in and reads as frosted glass; the real mix shows in a clear loading jar on top
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.11, 0.24, 32, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
      );
      jar.position.set(0, 0.74, -0.02);
      const jarRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 32), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.9, roughness: 0.3 }));
      jarRim.rotation.x = Math.PI / 2;
      jarRim.position.set(0, 0.86, -0.02);
      swivel.add(jar, jarRim);
      c.userData.jarY = 0.63;
      this.barrelTip.position.set(0, 0.28, 0.34);
    } else {
      const brass = new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.9, roughness: 0.28 });
      const red = new THREE.MeshStandardMaterial({ color: 0xb3202e, metalness: 0.3, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.36), red);
      body.position.y = 0.2;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.38), brass);
      trim.position.y = 0.34;
      // trumpet-bell barrel (lathe)
      const prof: THREE.Vector2[] = [];
      for (let i = 0; i <= 20; i++) {
        const k = i / 20;
        prof.push(new THREE.Vector2(0.05 + 0.12 * k ** 3, k * 0.42));
      }
      const bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshStandardMaterial({ color: 0xd8a24a, metalness: 0.95, roughness: 0.22, side: THREE.DoubleSide }));
      bell.rotation.x = Math.PI / 2;
      bell.position.set(0, 0.3, 0.08);
      const hopper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.3, 32, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, side: THREE.DoubleSide }),
      );
      hopper.position.set(0, 0.53, -0.06);
      const rimTop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 32), brass);
      rimTop.rotation.x = Math.PI / 2;
      rimTop.position.set(0, 0.68, -0.06);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: neonSign('PIE-O-MATIC', '#ffc35a'), transparent: true }));
      plate.position.set(0, 0.2, 0.181);
      swivel.add(body, trim, bell, hopper, rimTop, plate);
      for (let i = 0; i < 3; i++) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb340, toneMapped: false }));
        bulb.position.set(-0.1 + i * 0.1, 0.36, 0.17);
        swivel.add(bulb);
        this.bulbs.push(bulb);
      }
      shadowsOn(swivel);
      hopper.castShadow = false;
      this.barrelTip.position.set(0, 0.3, 0.52);
    }
    // lever with red knob
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.9, roughness: 0.3 }));
    stick.position.y = 0.11;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe0202c, roughness: 0.25 }));
    knob.position.y = 0.23;
    this.lever.add(stick, knob);
    this.lever.position.set(0.21, 0.22, 0.0);
    this.lever.rotation.z = -0.3;
    shadowsOn(this.lever);
    swivel.add(this.lever);
    this.hopper.position.set(0, (c.userData.jarY as number | undefined) ?? 0.42, -0.04);
    swivel.add(this.hopper);
    swivel.add(this.barrelTip);
    c.userData.swivel = swivel;
  }

  private buildWheels() {
    // spinner wheels stand on the table, right of the cannon; shown only for spinner/coin rounds
    this.scene.add(this.wheelGroup);
    this.wheelGroup.position.set(0.55, TABLE_Y, 0.15);
    for (let i = 0; i < 2; i++) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.22, 48), new THREE.MeshStandardMaterial({ map: wheelFace(1, 4), roughness: 0.5 }));
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.8 }));
      stand.position.y = 0.14;
      const holder = new THREE.Group();
      holder.add(stand);
      w.position.y = 0.48;
      w.rotation.y = -0.25;
      holder.add(w);
      const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      pointer.position.set(0, 0.73, 0.01);
      pointer.rotation.z = Math.PI;
      holder.add(pointer);
      holder.position.x = i * 0.5;
      shadowsOn(holder);
      this.wheelGroup.add(holder);
      this.wheels.push(w);
    }
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), [
      new THREE.MeshStandardMaterial({ color: 0xd8a24a, metalness: 0.9, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ map: neonSign('A', '#ff4fa3'), metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: neonSign('B', '#3ee6ff'), metalness: 0.5 }),
    ]);
    this.coin.position.set(0.3, TABLE_Y + 0.01, 0.55);
    this.coin.visible = false;
    this.scene.add(this.coin);
    this.wheelGroup.visible = false;
  }

  private buildDummy() {
    const d = this.dummy;
    const sack = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 1 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 6, 12), sack);
    body.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), sack);
    head.position.y = 1.5;
    const target = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ map: neonSign('◎', '#ff4fa3'), transparent: true }));
    target.position.set(0, 1.1, 0.19);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x5a2a12 }));
    pole.position.y = 0.5;
    d.add(body, head, target, pole);
    shadowsOn(d);
    d.position.set(-1.25, 0, -1.6);
    d.visible = false;
    this.scene.add(d);
  }

  private buildRooftop() {
    const r = this.rooftop;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x23202e, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    floor.receiveShadow = true;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xc8913a, metalness: 0.7 }));
    rail.position.set(0, 1.05, -3.2);
    const city = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const h = 1 + Math.random() * 6;
      const bld = new THREE.Mesh(new THREE.BoxGeometry(0.8 + Math.random(), h, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a1430, emissive: 0x2a1a50, emissiveIntensity: 0.3 }));
      bld.position.set(-12 + i * 0.65, h / 2 - 3, -9 - Math.random() * 6);
      city.add(bld);
    }
    r.add(floor, rail, city);
    r.visible = false;
    this.scene.add(r);
  }

  private makePie(): THREE.Object3D {
    const g = this.models['cream-pie'];
    if (g) {
      const inner = g.scene.clone();
      inner.scale.y = 0.6;
      const m = fitHeight(inner, 0.08);
      shadowsOn(m);
      return m;
    }
    const pie = new THREE.Group();
    const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0xc98a3c, roughness: 0.7 }));
    const cream = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.3 }));
    cream.position.y = 0.02;
    cream.scale.y = 0.6;
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0202c, roughness: 0.2 }));
    cherry.position.y = 0.08;
    pie.add(crust, cream, cherry);
    shadowsOn(pie);
    return pie;
  }

  private makeConfettiBall(): THREE.Object3D {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 20, 14),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.05, clearcoat: 1 }),
    );
    const inner = new THREE.Group();
    const cols = [0xff4fa3, 0x3ee6ff, 0xffc35a, 0x7ee07a, 0xb36bff];
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
      b.position.set((Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.09);
      b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      inner.add(b);
    }
    const g = new THREE.Group();
    g.add(ball, inner);
    return g;
  }

  // ------------------------------------------------------------ level setup

  setLevel(rivalModel: string, seats: 1 | 2, look: StageLook) {
    for (const r of this.rivals.values()) this.scene.remove(r.root);
    this.rivals.clear();
    const gltf = this.models[rivalModel as ModelName] ?? this.models['rival-bubu'];
    const tall = ({ 'rival-mo': 1.85, 'rival-twin': 1.35, 'rival-rina': 1.45, 'rival-robo': 1.55 } as Record<string, number>)[rivalModel] ?? 1.6;
    const tint = !this.models[rivalModel as ModelName] && rivalModel !== 'rival-bubu' ? fallbackTint(rivalModel) : null;
    if (seats === 1) {
      const r = new Rival(gltf, tint, tall);
      r.root.position.set(0.5, 0.18, -1.0);
      r.root.rotation.y = -0.12;
      this.scene.add(r.root);
      this.rivals.set('r1', r);
    } else {
      const a = new Rival(gltf, tint, tall);
      a.root.position.set(-0.05, 0.15, -1.1);
      a.root.rotation.y = 0.05;
      const b = new Rival(gltf, tint === null ? 0xb8d8ff : tint, tall);
      b.root.position.set(0.85, 0.15, -0.95);
      b.root.rotation.y = -0.3;
      this.scene.add(a.root, b.root);
      this.rivals.set('r1', a);
      this.rivals.set('r2', b);
    }
    this.booth.visible = look !== 'rooftop';
    this.rooftop.visible = look === 'rooftop';
    const dim = look === 'dim';
    this.lights.hemi.intensity = dim ? 0.35 : look === 'rooftop' ? 0.6 : 0.9;
    this.lights.key.intensity = dim ? 0.9 : 2.0;
    this.lights.neon.forEach((l) => (l.intensity = dim ? 2.2 : 5.5));
    this.scene.fog = new THREE.Fog(dim ? 0x0e0820 : 0x24113f, dim ? 5 : 9, dim ? 16 : 26);
    for (const b of this.stringLights) b.visible = !dim || Math.random() < 0.4;
    this.clearCream();
    this.aimYaw = this.aimYawTarget = this.yawTo('r1');
  }

  clearCream() {
    for (const r of this.rivals.values()) r.face.clear();
  }

  /** Show what's loaded: pies and confetti balls tumbling into the glass hopper. */
  setHopper(pies: number, duds: number, unknown = 0) {
    this.hopper.clear();
    const n = pies + duds + unknown;
    const items: THREE.Object3D[] = [];
    for (let i = 0; i < pies; i++) items.push(this.piePrototype.clone());
    for (let i = 0; i < duds; i++) items.push(this.makeConfettiBall());
    for (let i = 0; i < unknown; i++) {
      const q = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8a7aa8, roughness: 0.4 }));
      items.push(q);
    }
    // mix them so the order looks hidden
    for (let i = items.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.forEach((it, i) => {
      const layer = Math.floor(i / 4);
      const a = (i % 4) * (Math.PI / 2) + layer * 0.7;
      const r = n === 1 ? 0 : 0.07;
      it.scale.multiplyScalar(0.8);
      it.position.set(Math.cos(a) * r, 0.06 + layer * 0.075, Math.sin(a) * r);
      it.rotation.set(Math.random() * 0.4, Math.random() * 6, 0);
      it.userData.drop = 0.35 + i * 0.06;
      this.hopper.add(it);
    });
    // tumble in
    const start = this.hopper.children.map((c) => c.position.y);
    this.tweens.tween(900, (k) => {
      this.hopper.children.forEach((c, i) => {
        const d = c.userData.drop as number;
        const kk = Math.max(0, Math.min(1, (k * 1.6 - i * 0.05) / 1));
        c.position.y = start[i] + d * (1 - ease.out(kk));
      });
    });
  }

  /** Spin the hopper to show the shuffle. */
  shuffleHopper() {
    return this.tweens.tween(700, (k) => {
      this.hopper.rotation.y = ease.inOut(k) * Math.PI * 4;
    });
  }

  removeFromHopper(kind: 'pie' | 'dud') {
    const isPie = (o: THREE.Object3D) => o.children.length !== 2 || !(o.children[1] instanceof THREE.Group);
    const idx = [...this.hopper.children].reverse().findIndex((o) => (kind === 'pie' ? isPie(o) : !isPie(o)));
    const real = idx < 0 ? this.hopper.children.length - 1 : this.hopper.children.length - 1 - idx;
    const o = this.hopper.children[real];
    if (o) this.hopper.remove(o);
  }

  showWheels(mode: 'none' | 'spin' | 'coin' | 'mystery', a?: { n: number; d: number }, b?: { n: number; d: number }) {
    this.wheelGroup.visible = mode !== 'none';
    this.coin.visible = mode === 'coin';
    this.hopper.visible = mode === 'none';
    const holders = this.wheelGroup.children;
    holders[1].visible = mode === 'coin';
    if (mode === 'none') return;
    const face = (f: { n: number; d: number } | undefined, label?: string) => {
      if (!f) return wheelFace(0, 8, '?');
      // draw with a denominator that makes nice sectors
      let d = f.d;
      let n = f.n;
      while (d < 4) {
        d *= 2;
        n *= 2;
      }
      return wheelFace(n, d, label);
    };
    (this.wheels[0].material as THREE.MeshStandardMaterial).map = mode === 'mystery' ? mysteryFace() : face(a, mode === 'coin' ? 'A' : undefined);
    (this.wheels[0].material as THREE.MeshStandardMaterial).needsUpdate = true;
    if (mode === 'coin') {
      (this.wheels[1].material as THREE.MeshStandardMaterial).map = face(b, 'B');
      (this.wheels[1].material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
    this.wheelGroup.position.x = mode === 'coin' ? 0.32 : 0.55;
    this.dummy.visible = mode === 'mystery';
  }

  /** Spin wheel `i` to land on a pie or confetti sector of a wheel with pie fraction n/d. */
  spinWheel(i: number, isPie: boolean, frac: { n: number; d: number }) {
    const w = this.wheels[i];
    let d = frac.d;
    let n = frac.n;
    while (d < 4) {
      d *= 2;
      n *= 2;
    }
    const sector = isPie ? Math.floor(Math.random() * Math.max(1, n)) : n + Math.floor(Math.random() * Math.max(1, d - n));
    const center = ((sector + 0.5) / d) * Math.PI * 2;
    const start = w.rotation.z % (Math.PI * 2);
    const end = Math.PI * 2 * 4 + center;
    return this.tweens.tween(this.reducedMotion ? 200 : 1300, (k) => (w.rotation.z = start + (end - start) * ease.out(k)));
  }

  flipCoin(isA: boolean) {
    const c = this.coin;
    const y0 = TABLE_Y + 0.01;
    return this.tweens.tween(this.reducedMotion ? 200 : 900, (k) => {
      c.position.y = y0 + Math.sin(k * Math.PI) * 0.45;
      c.rotation.x = k * Math.PI * 7 + (isA ? 0 : Math.PI);
    });
  }

  // ------------------------------------------------------------ aiming and shooting

  private yawTo(seat: Seat | 'dummy') {
    const from = this.cannon.position;
    let to: THREE.Vector3;
    if (seat === 'you') to = this.camera.position.clone();
    else if (seat === 'dummy') to = this.dummy.position.clone().add(V(0, 1.1, 0));
    else to = this.rivals.get(seat)?.facePos() ?? V(0.4, 1.5, -1.2);
    return Math.atan2(to.x - from.x, to.z - from.z);
  }

  aim(seat: Seat | 'dummy', ms = 650) {
    this.aimYawTarget = this.yawTo(seat);
    const from = this.aimYaw;
    let to = this.aimYawTarget;
    while (to - from > Math.PI) to -= Math.PI * 2;
    while (to - from < -Math.PI) to += Math.PI * 2;
    this.aimPitch = seat === 'you' ? 0.12 : -0.08;
    return this.tweens.tween(this.reducedMotion ? 100 : ms, (k) => {
      this.aimYaw = from + (to - from) * ease.back(k);
    });
  }

  pullLever() {
    return this.tweens.tween(260, (k) => {
      this.lever.rotation.x = Math.sin(k * Math.PI) * 0.9;
    });
  }

  /** Camera framing: home, leaning in toward the cannon, or toward a target. */
  frame(mode: 'home' | 'lean' | Seat | 'dummy' | 'shop', ms = 500) {
    const pos = CAM_HOME.clone();
    const look = LOOK_HOME.clone();
    if (mode === 'lean') {
      pos.add(V(-0.1, -0.06, -0.35));
      look.set(-0.1, 1.05, -0.6);
    } else if (mode === 'r1' || mode === 'r2') {
      const f = this.rivals.get(mode)?.facePos() ?? V(0.4, 1.5, -1.2);
      pos.lerp(f, 0.32).add(V(0, -0.04, 0));
      look.copy(f).add(V(0, -0.08, 0));
    } else if (mode === 'you') {
      pos.add(V(0, 0.02, 0.15));
      look.copy(this.cannon.position).add(V(0, 0.3, 0));
    } else if (mode === 'dummy') {
      look.copy(this.dummy.position).add(V(0, 1.1, 0));
    } else if (mode === 'shop') {
      pos.add(V(0, 0.25, -0.15));
      look.set(0.1, 0.8, -0.2);
    }
    const p0 = this.camTarget.pos.clone();
    const l0 = this.camTarget.look.clone();
    if (this.reducedMotion) ms = 0;
    return this.tweens.tween(ms, (k) => {
      const e = ease.inOut(k);
      this.camTarget.pos.lerpVectors(p0, pos, e);
      this.camTarget.look.lerpVectors(l0, look, e);
    });
  }

  private targetPoint(seat: Seat | 'dummy') {
    if (seat === 'you') return this.camera.position.clone().add(V(0, -0.02, -0.12));
    if (seat === 'dummy') return this.dummy.position.clone().add(V(0, 1.1, 0.18));
    return this.rivals.get(seat)?.facePos() ?? V(0.4, 1.5, -1.2);
  }

  /** Fire a pie or a confetti ball from the cannon at a seat; resolves on impact. */
  async shoot(kind: 'pie' | 'dud', seat: Seat | 'dummy', slow: boolean) {
    const from = new THREE.Vector3();
    this.barrelTip.getWorldPosition(from);
    const to = this.targetPoint(seat);
    const proj = kind === 'pie' ? this.piePrototype.clone() : this.makeConfettiBall();
    proj.position.copy(from);
    this.scene.add(proj);
    this.shake = Math.max(this.shake, 0.4);
    for (const b of this.bulbs) (b.material as THREE.MeshBasicMaterial).color.set(0xffffff);
    if (slow && !this.reducedMotion) this.tweens.timeScale = 0.32;
    const dist = from.distanceTo(to);
    const arc = seat === 'you' ? 0.12 : 0.28;
    await this.tweens.tween(260 + dist * 260, (k) => {
      proj.position.lerpVectors(from, to, k);
      proj.position.y += Math.sin(k * Math.PI) * arc;
      proj.rotation.x = k * 9;
      proj.rotation.z = k * 4;
      // speed back up just before impact so the splat itself snaps
      if (k > 0.86) this.tweens.timeScale = 1;
    });
    this.tweens.timeScale = 1;
    for (const b of this.bulbs) (b.material as THREE.MeshBasicMaterial).color.set(0xffb340);
    this.scene.remove(proj);
    return to;
  }

  /** A pie thrown by hand: a rival's counter-pie at you, or your dare-bonus pie at a rival. */
  async lob(from: THREE.Vector3, seat: Seat, ms = 650) {
    const to = this.targetPoint(seat);
    const proj = this.piePrototype.clone();
    proj.position.copy(from);
    this.scene.add(proj);
    await this.tweens.tween(this.reducedMotion ? 150 : ms, (k) => {
      proj.position.lerpVectors(from, to, k);
      proj.position.y += Math.sin(k * Math.PI) * 0.4;
      proj.rotation.y = k * 8;
    });
    this.scene.remove(proj);
    return to;
  }

  rivalHandPos(seat: Seat) {
    const r = this.rivals.get(seat);
    return r ? r.root.localToWorld(V(0.25, r.height * 0.62, 0.3)) : V(0.6, 1.2, -1);
  }

  /** The dare tray: a spring-loaded plate next to your right hand. */
  dareTrayPos() {
    return V(0.62, TABLE_Y + 0.08, 0.75);
  }

  splatRival(seat: Seat) {
    const r = this.rivals.get(seat);
    if (!r) return;
    const at = r.facePos();
    this.cream.burst(at, V(0, 0, -1), 90);
    this.shake = 0.6;
    // stick a few blobs on the face
    for (let i = 0; i < 6; i++) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.3 }));
      blob.position.set((Math.random() - 0.5) * 0.14, (Math.random() - 0.4) * 0.14, 0.02 + Math.random() * 0.03);
      blob.scale.z = 0.6;
      r.face.add(blob);
    }
    while (r.face.children.length > 26) r.face.remove(r.face.children[0]);
    r.play('hit');
    this.tweens.wait(1700).then(() => r.play('idle', 0.5));
  }

  splatYou() {
    const at = this.camera.position.clone().add(V(0, -0.05, -0.2));
    this.cream.burst(at, V(0, 0, 1), 60);
    this.shake = 0.9;
    this.yourCream++;
  }

  pop(seat: Seat | 'dummy') {
    const at = this.targetPoint(seat);
    this.confetti.burst(at, seat === 'you' ? 160 : 140, seat === 'you' ? 1.6 : 2.4);
  }

  ejectShell(kind: 'pie' | 'dud') {
    const from = new THREE.Vector3();
    this.hopper.getWorldPosition(from);
    const proj = kind === 'pie' ? this.piePrototype.clone() : this.makeConfettiBall();
    proj.position.copy(from);
    this.scene.add(proj);
    return this.tweens
      .tween(900, (k) => {
        proj.position.set(from.x - k * 0.6, from.y + Math.sin(k * Math.PI) * 0.9, from.z + k * 0.2);
        proj.rotation.x = k * 10;
      })
      .then(() => {
        if (kind === 'dud') this.confetti.burst(proj.position.clone(), 80, 1.6);
        else this.cream.burst(proj.position.clone(), V(0, 1, 0), 40);
        this.scene.remove(proj);
      });
  }

  anim(seat: Seat, a: Anim) {
    const r = this.rivals.get(seat);
    if (!r) return 0;
    const d = r.play(a);
    if (a !== 'idle' && a !== 'defeat' && a !== 'cheer') this.tweens.wait(Math.max(800, d * 1000 * 0.8)).then(() => r.play('idle', 0.4));
    return d;
  }

  fireworks() {
    const n = 140;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const c = V((Math.random() - 0.5) * 6, 4 + Math.random() * 2, -7 - Math.random() * 3);
    for (let i = 0; i < n; i++) {
      pos.set([c.x, c.y, c.z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const s = 2 + Math.random() * 1.5;
      vel.set([Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = [0xff4fa3, 0x3ee6ff, 0xffc35a, 0x7ee07a][Math.floor(Math.random() * 4)];
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size: 0.09, transparent: true, toneMapped: false, depthWrite: false }));
    this.scene.add(pts);
    this.bursts.push({ mesh: pts, t: 0, vel });
  }

  // ------------------------------------------------------------ frame

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // narrow screens: widen the field of view so the rival and cannon stay in frame
    this.camera.fov = w / h < 1 ? 68 : w / h < 1.4 ? 58 : 50;
    this.camera.updateProjectionMatrix();
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.tweens.update(dtMs);
    const sdt = dt * this.tweens.timeScale;
    this.elapsed += sdt;
    for (const r of this.rivals.values()) r.update(sdt);
    this.confetti.update(sdt);
    this.cream.update(sdt);
    // cannon swivel
    const swivel = this.cannon.userData.swivel as THREE.Group;
    swivel.rotation.y = this.aimYaw;
    swivel.rotation.x = this.aimPitch * 0.5;
    // ferris wheel and twinkling bulbs
    const fw = this.booth.userData.ferris as THREE.Group;
    if (fw) fw.rotation.z += sdt * 0.08;
    this.stringLights.forEach((b, i) => {
      const m = b.material as THREE.MeshBasicMaterial;
      const tw = 0.75 + 0.25 * Math.sin(this.elapsed * 2.4 + i * 1.7);
      m.color.setRGB(1 * tw, 0.85 * tw, 0.55 * tw);
    });
    if (this.rooftop.visible && Math.random() < dt * 0.9) this.fireworks();
    for (const f of [...this.bursts]) {
      f.t += sdt;
      const p = f.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        f.vel[i * 3 + 1] -= 2.2 * sdt;
        p.setXYZ(i, p.getX(i) + f.vel[i * 3] * sdt, p.getY(i) + f.vel[i * 3 + 1] * sdt, p.getZ(i) + f.vel[i * 3 + 2] * sdt);
      }
      p.needsUpdate = true;
      (f.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - f.t / 1.8);
      if (f.t > 1.8) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        this.bursts.splice(this.bursts.indexOf(f), 1);
      }
    }
    // camera follow + shake
    this.camPos.lerp(this.camTarget.pos, 1 - Math.exp(-dt * 10));
    this.camLook.lerp(this.camTarget.look, 1 - Math.exp(-dt * 10));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0 && !this.reducedMotion) {
      const s = this.shake * 0.02;
      this.camera.position.add(V((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.camLook);
    this.composer.render();
  }

  /** Project a seat's face to canvas pixels (for the thought bubble). */
  screenPos(seat: Seat) {
    const p = this.targetPoint(seat).project(this.camera);
    const el = this.renderer.domElement;
    return { x: ((p.x + 1) / 2) * el.clientWidth, y: ((1 - p.y) / 2) * el.clientHeight };
  }

  /** Raycast a canvas click to a rival seat. */
  pick(x: number, y: number): Seat | null {
    const el = this.renderer.domElement;
    const ndc = new THREE.Vector2((x / el.clientWidth) * 2 - 1, -(y / el.clientHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    for (const [seat, r] of this.rivals) {
      const box = new THREE.Box3().setFromObject(r.root);
      if (ray.ray.intersectsBox(box)) return seat;
    }
    return null;
  }

  describe() {
    return {
      rivals: [...this.rivals.entries()].map(([s, r]) => ({ seat: s, model: r.procedural ? 'procedural' : 'tripo', anim: r.current?.getClip().name ?? 'none', creamBlobs: r.face.children.length })),
      hopper: this.hopper.children.length,
      wheels: this.wheelGroup.visible,
      cannonYaw: +this.aimYaw.toFixed(2),
    };
  }
}

function fallbackTint(model: string) {
  return model === 'rival-robo' ? 0xbfc8d6 : model === 'rival-mo' ? 0xffd27a : model === 'rival-twin' ? 0xffc0e0 : 0xffffff;
}

function mysteryFace() {
  return wheelFace(0, 8, '?');
}
