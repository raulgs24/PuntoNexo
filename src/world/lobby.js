import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as TX from './textures.js';

// Vestíbulo del Hotel Punto Nexo.
// Ejes: +z hacia la entrada, -z hacia el mostrador. El jugador empieza detrás del mostrador mirando a +z.

const W = 18;
const D = 22;
const H = 6.5;
const HX = W / 2;
const HZ = D / 2;

export const SPOTS = {
  outside: new THREE.Vector3(0, 0, 15.5),
  doorway: new THREE.Vector3(0, 0, 9.6),
  desk: new THREE.Vector3(0, 0, -4.35),
  elevatorFront: new THREE.Vector3(-7.6, 0, -2.5),
  elevatorIn: new THREE.Vector3(-10.1, 0, -2.5),
  playerStart: new THREE.Vector3(0, 0, -7.5),
  lurkers: [
    new THREE.Vector3(-8.0, 0, 9.0),
    new THREE.Vector3(8.0, 0, 9.2),
    new THREE.Vector3(-5.6, 0, 10.2),
    new THREE.Vector3(5.6, 0, 10.2),
    new THREE.Vector3(-8.2, 0, 1.2),
    new THREE.Vector3(8.2, 0, 0.8),
    new THREE.Vector3(-6.2, 0, 6.8),
    new THREE.Vector3(6.2, 0, 7.4),
  ],
};

const MirrorShader = {
  name: 'NoirMirror',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vUv2 = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <logdepthbuf_pars_fragment>
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec3 base = texture2DProj(tDiffuse, vUv).rgb;
      vec2 e = min(vUv2, 1.0 - vUv2);
      float edge = smoothstep(0.0, 0.14, min(e.x, e.y));
      float spots = noise(vUv2 * vec2(8.0, 6.0)) * noise(vUv2 * 27.0);
      float grime = mix(0.6, 1.0, edge) * (1.0 - 0.3 * smoothstep(0.35, 0.65, spots));
      gl_FragColor = vec4(base * color * grime, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function buildLobby(scene) {
  const colliders = [];
  const interactables = [];
  const flickerLights = [];
  const mirrorRegistry = { noReflect: new Set(), mirrorOnly: new Set() };

  const woodTex = TX.woodTexture();
  const mats = {
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a253, metalness: 0.95, roughness: 0.3 }),
    darkBrass: new THREE.MeshStandardMaterial({ color: 0x6d5a35, metalness: 0.9, roughness: 0.4 }),
    marble: new THREE.MeshStandardMaterial({ color: 0x22201e, roughness: 0.18 }),
    counter: new THREE.MeshStandardMaterial({ color: 0x6a665e, roughness: 0.38 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.3 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x1f1714, roughness: 0.65 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x1b241b, roughness: 0.8, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x1a2028,
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  };

  function mesh(geo, mat, x, y, z, { cast = true, receive = true, parent = scene } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }

  function box(w, h, d, mat, x, y, z, opts) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opts);
  }

  function collider(minX, maxX, minZ, maxZ) {
    colliders.push({ minX, maxX, minZ, maxZ });
  }

  function interactive(obj, kind) {
    obj.traverse((o) => {
      o.userData.interact = kind;
    });
    obj.userData.interact = kind;
    interactables.push(obj);
    return obj;
  }

  // ---------- Suelo y techo ----------
  const floor = mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: TX.floorTexture([W / 2, D / 2]), roughness: 0.22 }),
    0,
    0,
    0,
    { cast: false }
  );
  floor.rotation.x = -Math.PI / 2;

  const street = mesh(
    new THREE.PlaneGeometry(40, 14),
    new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.12, metalness: 0.3 }),
    0,
    -0.02,
    HZ + 7,
    { cast: false }
  );
  street.rotation.x = -Math.PI / 2;

  const ceilTex = TX.ceilingTexture();
  ceilTex.repeat.set(W / 3, D / 3);
  const ceiling = mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9 }), 0, H, 0, {
    cast: false,
  });
  ceiling.rotation.x = Math.PI / 2;

  const rug = mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ map: TX.rugTexture(), roughness: 0.95 }), 0, 0.006, 4.2, {
    cast: false,
  });
  rug.rotation.x = -Math.PI / 2;

  // ---------- Paredes ----------
  const wallpaper = TX.wallpaperTexture();

  function wallMat(length, height) {
    const t = wallpaper.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, length / 1.4), Math.max(1, height / 2.8));
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  }

  // Segmento de pared. axis 'x' => corre a lo largo de x en z = fixed.
  function wall(axis, fixed, a1, a2, y1, y2, withWainscot = true) {
    const len = a2 - a1;
    const h = y2 - y1;
    const mid = (a1 + a2) / 2;
    const t = 0.2;
    const sign = Math.sign(fixed) || 1;
    if (axis === 'x') {
      box(len, h, t, wallMat(len, h), mid, y1 + h / 2, fixed + sign * t / 2, { cast: false });
      if (withWainscot && y1 === 0) {
        box(len, 1.1, 0.06, mats.wood, mid, 0.55, fixed - sign * 0.03, { cast: false });
        box(len, 0.06, 0.1, mats.darkBrass, mid, 1.12, fixed - sign * 0.05, { cast: false });
      }
    } else {
      box(t, h, len, wallMat(len, h), fixed + sign * t / 2, y1 + h / 2, mid, { cast: false });
      if (withWainscot && y1 === 0) {
        box(0.06, 1.1, len, mats.wood, fixed - sign * 0.03, 0.55, mid, { cast: false });
        box(0.1, 0.06, len, mats.darkBrass, fixed - sign * 0.05, 1.12, mid, { cast: false });
      }
    }
  }

  // Fondo (detrás del mostrador)
  wall('x', -HZ, -HX, HX, 0, H);
  // Derecha (espejo)
  wall('z', HX, -HZ, HZ, 0, H);
  // Izquierda con hueco de ascensor z ∈ [-3.4, -1.6]
  wall('z', -HX, -HZ, -3.4, 0, H);
  wall('z', -HX, -1.6, HZ, 0, H);
  wall('z', -HX, -3.4, -1.6, 2.8, H, false);
  // Frente con hueco de puerta x ∈ [-1.8, 1.8]
  wall('x', HZ, -HX, -1.8, 0, H);
  wall('x', HZ, 1.8, HX, 0, H);
  wall('x', HZ, -1.8, 1.8, 4.5, H, false);

  // Cornisa
  const corniceMat = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.7 });
  box(W, 0.3, 0.3, corniceMat, 0, H - 0.15, -HZ + 0.15, { cast: false });
  box(W, 0.3, 0.3, corniceMat, 0, H - 0.15, HZ - 0.15, { cast: false });
  box(0.3, 0.3, D, corniceMat, -HX + 0.15, H - 0.15, 0, { cast: false });
  box(0.3, 0.3, D, corniceMat, HX - 0.15, H - 0.15, 0, { cast: false });

  // ---------- Columnas ----------
  const columnMat = new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 0.28 });
  for (const [x, z] of [
    [-5.2, -1.5],
    [5.2, -1.5],
    [-5.2, 5.5],
    [5.2, 5.5],
  ]) {
    mesh(new THREE.CylinderGeometry(0.36, 0.38, H, 24), columnMat, x, H / 2, z);
    box(0.95, 0.35, 0.95, mats.marble, x, 0.175, z);
    box(0.95, 0.35, 0.95, mats.marble, x, H - 0.45, z);
    box(0.85, 0.06, 0.85, mats.darkBrass, x, 1.4, z);
    collider(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
  }

  // ---------- Mostrador ----------
  box(6.5, 0.95, 0.8, mats.wood, 0, 0.475, -6.0);
  box(6.8, 0.06, 1.05, mats.counter, 0, 0.98, -6.0);
  for (let x = -3.0; x <= 3.01; x += 1.0) box(0.05, 0.85, 0.03, mats.darkBrass, x, 0.47, -5.59, { cast: false });
  box(6.5, 0.05, 0.04, mats.brass, 0, 0.1, -5.58, { cast: false });
  const plaque = mesh(
    new THREE.PlaneGeometry(1.4, 0.3),
    new THREE.MeshStandardMaterial({
      map: TX.textTexture('RECEPCIÓN', { bg: '#151210', color: '#d6b46a', border: '#8a6d3a' }),
      roughness: 0.4,
      metalness: 0.4,
    }),
    0,
    0.66,
    -5.575,
    { cast: false }
  );
  collider(-3.45, 3.45, -6.6, -5.42);

  const TOP = 1.01;

  // Libro de registro
  const ledger = new THREE.Group();
  ledger.position.set(-0.75, TOP, -6.05);
  ledger.rotation.y = 0.12;
  const pageTex = TX.ledgerPageTexture();
  const pageMat = new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 });
  box(0.62, 0.03, 0.42, mats.leather, 0, 0.015, 0, { parent: ledger });
  const pL = mesh(new THREE.PlaneGeometry(0.29, 0.38), pageMat, -0.15, 0.036, 0, { parent: ledger, cast: false });
  pL.rotation.x = -Math.PI / 2;
  pL.rotation.y = 0.06;
  const pR = mesh(new THREE.PlaneGeometry(0.29, 0.38), pageMat, 0.15, 0.036, 0, { parent: ledger, cast: false });
  pR.rotation.x = -Math.PI / 2;
  pR.rotation.y = -0.06;
  scene.add(ledger);
  interactive(ledger, 'ledger');

  // Documentos entregados por el huésped
  const docs = new THREE.Group();
  docs.position.set(0.3, TOP + 0.004, -5.78);
  const idCard = mesh(
    new THREE.PlaneGeometry(0.17, 0.12),
    new THREE.MeshStandardMaterial({ map: TX.paperTexture('CÉDULA'), roughness: 0.9 }),
    -0.06,
    0,
    0,
    { parent: docs, cast: false }
  );
  idCard.rotation.x = -Math.PI / 2;
  idCard.rotation.z = 0.15;
  const slip = mesh(
    new THREE.PlaneGeometry(0.12, 0.16),
    new THREE.MeshStandardMaterial({ map: TX.paperTexture('RESERVA'), roughness: 0.9 }),
    0.1,
    0.002,
    0.02,
    { parent: docs, cast: false }
  );
  slip.rotation.x = -Math.PI / 2;
  slip.rotation.z = -0.2;
  docs.visible = false;
  scene.add(docs);
  interactive(docs, 'docs');

  // Campanilla (aceptar)
  const bell = new THREE.Group();
  bell.position.set(1.05, TOP, -5.8);
  mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.02, 24), mats.darkWood, 0, 0.01, 0, { parent: bell });
  const dome = mesh(new THREE.SphereGeometry(0.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.brass, 0, 0.02, 0, { parent: bell });
  dome.scale.y = 0.8;
  const plunger = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), mats.brass, 0, 0.07, 0, { parent: bell });
  scene.add(bell);
  interactive(bell, 'bell');

  // Pulsador rojo (expulsar)
  const expel = new THREE.Group();
  expel.position.set(-1.75, TOP, -5.82);
  box(0.13, 0.05, 0.11, mats.black, 0, 0.025, 0, { parent: expel });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xaa0a0a, emissive: 0x550000, emissiveIntensity: 0.6, roughness: 0.35 });
  const button = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 24), redMat, 0, 0.065, 0, { parent: expel });
  const expelLabel = mesh(
    new THREE.PlaneGeometry(0.12, 0.03),
    new THREE.MeshBasicMaterial({ map: TX.textTexture('EXPULSAR', { bg: '#0a0a0a', color: '#ddd', font: 'bold 70px "Special Elite", monospace' }) }),
    0,
    0.03,
    0.056,
    { parent: expel, cast: false }
  );
  expelLabel.rotation.x = -0.2;
  scene.add(expel);
  interactive(expel, 'expel');

  // Teléfono de la Gerencia
  const phone = new THREE.Group();
  phone.position.set(2.3, TOP, -6.1);
  phone.rotation.y = -0.35;
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.18, metalness: 0.2 });
  box(0.2, 0.08, 0.22, phoneMat, 0, 0.04, 0, { parent: phone });
  const dial = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 24), mats.brass, 0, 0.07, 0.07, { parent: phone });
  dial.rotation.x = 0.5;
  const handset = new THREE.Group();
  handset.position.set(0, 0.1, -0.02);
  const hs = mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 12), phoneMat, 0, 0, 0, { parent: handset });
  hs.rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 16), phoneMat, -0.1, -0.015, 0, { parent: handset });
  mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 16), phoneMat, 0.1, -0.015, 0, { parent: handset });
  phone.add(handset);
  scene.add(phone);
  interactive(phone, 'phone');

  // Reglamento enmarcado
  const rulesBoard = new THREE.Group();
  rulesBoard.position.set(1.75, TOP, -6.25);
  rulesBoard.rotation.y = -0.15;
  const frame = box(0.3, 0.38, 0.02, mats.darkBrass, 0, 0.19, 0, { parent: rulesBoard });
  frame.rotation.x = -0.3;
  const rulesFace = mesh(
    new THREE.PlaneGeometry(0.26, 0.34),
    new THREE.MeshStandardMaterial({
      map: TX.textTexture(['REGLAMENTO', '· · ·', 'del turno', 'de noche'], {
        width: 256,
        height: 340,
        bg: '#e3dac2',
        color: '#1d1a16',
        font: '30px "Playfair Display", Georgia, serif',
        border: '#1d1a16',
      }),
      roughness: 0.9,
    }),
    0,
    0.19,
    0.012,
    { parent: rulesBoard, cast: false }
  );
  rulesFace.rotation.x = -0.3;
  scene.add(rulesBoard);
  interactive(rulesBoard, 'rules');

  // Lámpara de banquero
  const lamp = new THREE.Group();
  lamp.position.set(-2.6, TOP, -6.15);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), mats.brass, 0, 0.01, 0, { parent: lamp });
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), mats.brass, 0, 0.16, 0, { parent: lamp });
  const shade = mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.32, 20, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1d4a2a, roughness: 0.3, side: THREE.DoubleSide, emissive: 0x0b1a0f }),
    0,
    0.33,
    0.05,
    { parent: lamp }
  );
  shade.rotation.z = Math.PI / 2;
  shade.rotation.y = Math.PI / 2;
  scene.add(lamp);
  const lampLight = new THREE.PointLight(0xffd8a0, 1.8, 4, 2);
  lampLight.position.set(-2.6, 1.28, -6.0);
  scene.add(lampLight);
  flickerLights.push({ light: lampLight, base: lampLight.intensity });

  // Carro de equipajes
  const cart = new THREE.Group();
  cart.position.set(4.4, 0, -8.2);
  box(1.0, 0.05, 0.6, mats.darkWood, 0, 0.18, 0, { parent: cart });
  for (const [x, z] of [
    [-0.45, -0.25],
    [0.45, -0.25],
    [-0.45, 0.25],
    [0.45, 0.25],
  ]) {
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), mats.black, x, 0.06, z, { parent: cart }).rotation.x = Math.PI / 2;
  }
  for (const x of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.7, 8), mats.brass, x, 1.03, 0, { parent: cart });
  const arch = mesh(new THREE.TorusGeometry(0.45, 0.015, 8, 24, Math.PI), mats.brass, 0, 1.88, 0, { parent: cart });
  arch.rotation.z = 0;
  box(0.6, 0.4, 0.25, mats.leather, -0.1, 0.4, 0, { parent: cart });
  box(0.45, 0.3, 0.2, new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.7 }), 0.15, 0.75, 0.05, { parent: cart });
  scene.add(cart);
  collider(3.8, 5.0, -8.6, -7.8);

  // ---------- Pared del fondo: casillero de llaves, reloj y ventana ----------
  box(3.4, 1.5, 0.14, mats.darkWood, 0, 2.1, -HZ + 0.1);
  const cubbyMat = new THREE.MeshStandardMaterial({ color: 0x080605, roughness: 0.9 });
  const cubbies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.26, 0.05), cubbyMat, 32);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), mats.brass, 32);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      const x = -1.4 + i * 0.4;
      const y = 1.58 + j * 0.34;
      m4.setPosition(x, y, -HZ + 0.15);
      cubbies.setMatrixAt(i * 4 + j, m4);
      const hasKey = Math.random() < 0.6;
      m4.setPosition(x, hasKey ? y - 0.02 : -100, -HZ + 0.2);
      keys.setMatrixAt(k++, m4);
    }
  }
  scene.add(cubbies, keys);

  const clock = new THREE.Group();
  clock.position.set(0, 4.15, -HZ + 0.12);
  mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshStandardMaterial({ map: TX.clockFaceTexture(), roughness: 0.6 }), 0, 0, 0.01, {
    parent: clock,
    cast: false,
  });
  mesh(new THREE.TorusGeometry(0.62, 0.04, 12, 48), mats.brass, 0, 0, 0.02, { parent: clock });
  const hourHand = new THREE.Group();
  const minuteHand = new THREE.Group();
  box(0.03, 0.32, 0.01, mats.black, 0, 0.14, 0, { parent: hourHand, cast: false });
  box(0.02, 0.48, 0.01, mats.black, 0, 0.22, 0, { parent: minuteHand, cast: false });
  hourHand.position.z = 0.03;
  minuteHand.position.z = 0.04;
  clock.add(hourHand, minuteHand);
  scene.add(clock);

  // Ventana con persianas: origen del foco que ilumina a los huéspedes
  const windowMat = new THREE.MeshBasicMaterial({ map: TX.blindsTexture(), color: 0x9aa0a8 });
  mesh(new THREE.PlaneGeometry(2.0, 2.4), windowMat, -4.3, 3.1, -HZ + 0.02, { cast: false, receive: false });
  box(2.2, 0.1, 0.2, mats.darkWood, -4.3, 1.85, -HZ + 0.1);

  const spot = new THREE.SpotLight(0xfff1d6, 420, 30, 0.5, 0.35, 2);
  spot.position.set(-4.0, 3.5, -10.3);
  spot.target.position.set(0.2, 0.9, -3.6);
  spot.map = TX.blindsTexture();
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 1;
  spot.shadow.camera.far = 30;
  scene.add(spot, spot.target);
  flickerLights.push({ light: spot, base: spot.intensity });

  // ---------- Espejo de pie ----------
  // Colocado junto al mostrador y orientado para que, desde detrás del mostrador,
  // se vea reflejado al huésped que espera.
  const MIRROR_POS = new THREE.Vector3(4.1, 0, -5.0);
  const toPlayer = new THREE.Vector3().subVectors(SPOTS.playerStart, MIRROR_POS).setY(0).normalize();
  const toGuest = new THREE.Vector3().subVectors(SPOTS.desk, MIRROR_POS).setY(0).normalize();
  const mirrorNormal = toPlayer.add(toGuest).normalize();
  const mirrorStand = new THREE.Group();
  mirrorStand.position.copy(MIRROR_POS);
  mirrorStand.rotation.y = Math.atan2(mirrorNormal.x, mirrorNormal.z);
  scene.add(mirrorStand);

  const mirror = new Reflector(new THREE.PlaneGeometry(1.5, 2.4), {
    textureWidth: 768,
    textureHeight: 1024,
    clipBias: 0.003,
    color: new THREE.Color().setRGB(0.95, 0.95, 0.97),
    shader: MirrorShader,
  });
  mirror.position.set(0, 1.42, 0.03);
  mirrorStand.add(mirror);
  box(1.72, 0.12, 0.08, mats.darkBrass, 0, 2.68, 0, { parent: mirrorStand });
  box(1.72, 0.12, 0.08, mats.darkBrass, 0, 0.16, 0, { parent: mirrorStand });
  box(0.11, 2.64, 0.08, mats.darkBrass, -0.805, 1.42, 0, { parent: mirrorStand });
  box(0.11, 2.64, 0.08, mats.darkBrass, 0.805, 1.42, 0, { parent: mirrorStand });
  box(1.5, 2.4, 0.03, mats.darkWood, 0, 1.42, -0.04, { parent: mirrorStand });
  mesh(new THREE.SphereGeometry(0.09, 16, 8), mats.darkBrass, 0, 2.82, 0, { parent: mirrorStand });
  for (const side of [-1, 1]) {
    const foot = box(0.1, 0.06, 0.7, mats.darkBrass, side * 0.7, 0.03, -0.1, { parent: mirrorStand });
    foot.castShadow = true;
  }
  collider(MIRROR_POS.x - 0.55, MIRROR_POS.x + 0.55, MIRROR_POS.z - 0.55, MIRROR_POS.z + 0.55);
  const mirrorLamp = new THREE.PointLight(0xffd9a0, 1.6, 3.5, 2);
  mirrorLamp.position.set(0, 2.95, 0.45);
  mirrorStand.add(mirrorLamp);
  flickerLights.push({ light: mirrorLamp, base: mirrorLamp.intensity });

  // Escritura en el vaho del espejo (evento de terror)
  const mirrorWritingTex = TX.textTexture('', { width: 1024, height: 512 });
  const mirrorWriting = mesh(
    new THREE.PlaneGeometry(1.4, 0.7),
    new THREE.MeshBasicMaterial({ map: mirrorWritingTex, transparent: true, opacity: 0, depthWrite: false }),
    0,
    1.75,
    0.05,
    { cast: false, receive: false, parent: mirrorStand }
  );

  function setMirrorWriting(text) {
    const c = mirrorWritingTex.image;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = 'rgba(235,235,235,0.85)';
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 18;
    ctx.font = 'bold 120px "Special Elite", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    mirrorWritingTex.needsUpdate = true;
  }

  // El espejo oculta lo que no tiene reflejo y muestra lo que solo existe en él.
  const reflectorRender = mirror.onBeforeRender;
  mirror.onBeforeRender = function (renderer, sc, camera, ...rest) {
    const hidden = [];
    const shown = [];
    for (const o of mirrorRegistry.noReflect) {
      if (o.visible) {
        o.visible = false;
        hidden.push(o);
      }
    }
    for (const o of mirrorRegistry.mirrorOnly) {
      if (o.userData.mirrorActive !== false && !o.visible) {
        o.visible = true;
        shown.push(o);
      }
    }
    reflectorRender.call(this, renderer, sc, camera, ...rest);
    for (const o of hidden) o.visible = true;
    for (const o of shown) o.visible = false;
  };

  // ---------- Ascensor ----------
  const carMat = new THREE.MeshStandardMaterial({ color: 0x2a2219, roughness: 0.6, side: THREE.BackSide });
  mesh(new THREE.BoxGeometry(1.8, 2.8, 1.8), carMat, -HX - 1.1, 1.4, -2.5, { cast: false });
  const carLight = new THREE.PointLight(0xffe0b0, 1.2, 4, 2);
  carLight.position.set(-HX - 1.0, 2.5, -2.5);
  scene.add(carLight);
  const elevDoorMat = new THREE.MeshStandardMaterial({ color: 0x8a7444, metalness: 0.85, roughness: 0.35 });
  const doorL = box(0.05, 2.8, 0.9, elevDoorMat, -HX - 0.05, 1.4, -2.95, { cast: false });
  const doorR = box(0.05, 2.8, 0.9, elevDoorMat, -HX - 0.05, 1.4, -2.05, { cast: false });
  box(0.12, 0.12, 2.1, mats.brass, -HX + 0.02, 2.86, -2.5);
  box(0.12, 2.9, 0.12, mats.brass, -HX + 0.02, 1.45, -3.5);
  box(0.12, 2.9, 0.12, mats.brass, -HX + 0.02, 1.45, -1.5);

  // Indicador de planta (semicírculo con aguja). No hay número 13... salvo cuando lo hay.
  const dialC = document.createElement('canvas');
  dialC.width = 512;
  dialC.height = 256;
  const dctx = dialC.getContext('2d');
  dctx.fillStyle = '#d2c7a8';
  dctx.beginPath();
  dctx.arc(256, 250, 240, Math.PI, 0);
  dctx.fill();
  dctx.fillStyle = '#1a1a1a';
  dctx.font = 'bold 26px "Playfair Display", Georgia, serif';
  dctx.textAlign = 'center';
  dctx.textBaseline = 'middle';
  const floors = ['B', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '15', '∞'];
  floors.forEach((f, i) => {
    const a = Math.PI + (i / (floors.length - 1)) * Math.PI;
    dctx.fillText(f, 256 + Math.cos(a) * 200, 250 + Math.sin(a) * 200);
  });
  const dialTex = new THREE.CanvasTexture(dialC);
  dialTex.colorSpace = THREE.SRGBColorSpace;
  const dialMesh = mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.6, transparent: true }), -HX + 0.1, 3.35, -2.5, {
    cast: false,
  });
  dialMesh.rotation.y = Math.PI / 2;
  const needle = new THREE.Group();
  needle.position.set(-HX + 0.11, 3.12, -2.5);
  needle.rotation.y = Math.PI / 2;
  box(0.012, 0.36, 0.005, new THREE.MeshStandardMaterial({ color: 0x7a0a0a, roughness: 0.4 }), 0, 0.18, 0, { parent: needle, cast: false });
  scene.add(needle);
  const callPlate = box(0.05, 0.22, 0.12, mats.brass, -HX + 0.03, 1.3, -1.15);
  callPlate.castShadow = false;
  // Index 0..15 en el dial; el 13 ocupa el hueco entre 12 y 14.
  function floorToNeedle(value) {
    const idx = value === 'B' ? 0 : value === '∞' ? floors.length - 1 : value === 13 ? 12.5 : value >= 14 ? value - 1 : value;
    return Math.PI / 2 - (idx / (floors.length - 1)) * Math.PI;
  }

  // ---------- Puertas de entrada ----------
  function frontDoor(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.8, 0, HZ);
    const off = -side * 0.9;
    box(1.8, 0.1, 0.08, mats.brass, off, 0.05, 0, { parent: pivot });
    box(1.8, 0.1, 0.08, mats.brass, off, 3.45, 0, { parent: pivot });
    box(0.08, 3.5, 0.08, mats.brass, off - 0.86, 1.75, 0, { parent: pivot });
    box(0.08, 3.5, 0.08, mats.brass, off + 0.86, 1.75, 0, { parent: pivot });
    box(1.6, 0.05, 0.05, mats.brass, off, 1.1, 0, { parent: pivot });
    mesh(new THREE.PlaneGeometry(1.7, 3.35), mats.glass, off, 1.75, 0, { parent: pivot, cast: false, receive: false });
    scene.add(pivot);
    return pivot;
  }
  const doorLeft = frontDoor(-1);
  const doorRight = frontDoor(1);
  box(3.8, 0.12, 0.25, mats.brass, 0, 3.56, HZ);
  const transom = mesh(
    new THREE.PlaneGeometry(3.6, 0.9),
    new THREE.MeshBasicMaterial({
      map: TX.textTexture('PUNTO NEXO', { width: 1024, height: 256, color: '#c9a453', font: '130px Limelight, Georgia, serif', mirror: true }),
      transparent: true,
    }),
    0,
    4.05,
    HZ + 0.02,
    { cast: false, receive: false }
  );
  transom.rotation.y = Math.PI;
  mesh(new THREE.PlaneGeometry(3.6, 0.9), mats.glass, 0, 4.05, HZ + 0.03, { cast: false, receive: false });

  // Letrero de salida
  const exitSign = box(
    0.9,
    0.28,
    0.08,
    new THREE.MeshStandardMaterial({
      map: TX.textTexture('SALIDA', { width: 256, height: 80, bg: '#200000', color: '#ff2a2a', font: 'bold 52px "Special Elite", monospace' }),
      emissive: 0xff2020,
      emissiveIntensity: 0.9,
      emissiveMap: TX.textTexture('SALIDA', { width: 256, height: 80, bg: '#000', color: '#ff2a2a', font: 'bold 52px "Special Elite", monospace' }),
    }),
    0,
    4.85,
    HZ - 0.12,
    { cast: false }
  );
  exitSign.rotation.y = Math.PI;
  const exitLight = new THREE.PointLight(0xff1a1a, 1.5, 5, 2);
  exitLight.position.set(0, 4.6, HZ - 0.5);
  scene.add(exitLight);

  // ---------- Mobiliario ----------
  function sofa(x, z, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    box(2.4, 0.42, 0.9, mats.leather, 0, 0.21, 0, { parent: g });
    box(2.4, 0.6, 0.22, mats.leather, 0, 0.7, -0.36, { parent: g });
    box(0.22, 0.6, 0.9, mats.leather, -1.2, 0.5, 0, { parent: g });
    box(0.22, 0.6, 0.9, mats.leather, 1.2, 0.5, 0, { parent: g });
    scene.add(g);
  }
  sofa(-7.7, 4.5, Math.PI / 2);
  sofa(7.7, 4.5, -Math.PI / 2);
  collider(-8.6, -7.1, 3.1, 5.9);
  collider(7.1, 8.6, 3.1, 5.9);

  function palm(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.6, 16), mats.marble, 0, 0.3, 0, { parent: g });
    mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.3, 8), mats.darkWood, 0, 1.2, 0, { parent: g });
    for (let i = 0; i < 9; i++) {
      const leaf = mesh(new THREE.PlaneGeometry(0.28, 1.2), mats.plant, 0, 1.8, 0, { parent: g });
      leaf.geometry.translate(0, 0.6, 0);
      leaf.rotation.set(0.9 + Math.random() * 0.5, (i / 9) * Math.PI * 2, 0, 'YXZ');
    }
    scene.add(g);
    collider(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
  }
  palm(-8.1, 10.2);
  palm(8.1, 10.2);
  palm(-8.1, -10.1);

  // ---------- Iluminación ----------
  scene.add(new THREE.HemisphereLight(0x9098a8, 0x1a140e, 0.55));

  function chandelier(x, z, intensity) {
    const g = new THREE.Group();
    g.position.set(x, H - 1.2, z);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), mats.darkBrass, 0, 0.6, 0, { parent: g, cast: false });
    const ring = mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 40), mats.brass, 0, 0, 0, { parent: g, cast: false });
    ring.rotation.x = Math.PI / 2;
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2b0, emissiveIntensity: 2.2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      mesh(new THREE.SphereGeometry(0.05, 10, 8), bulbMat, Math.cos(a) * 0.75, 0.06, Math.sin(a) * 0.75, { parent: g, cast: false });
    }
    scene.add(g);
    const light = new THREE.PointLight(0xffe0b0, intensity, 16, 2);
    light.position.set(x, H - 1.5, z);
    scene.add(light);
    flickerLights.push({ light, base: intensity, bulbMat });
  }
  chandelier(0, 4.2, 38);

  // Lámpara colgante sobre el vestíbulo: proyecta la sombra del huésped sobre el mostrador.
  const pendant = new THREE.Group();
  pendant.position.set(0, 3.5, -0.9);
  mesh(new THREE.CylinderGeometry(0.008, 0.008, H - 3.5, 6), mats.black, 0, (H - 3.5) / 2, 0, { parent: pendant, cast: false });
  mesh(
    new THREE.ConeGeometry(0.3, 0.28, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }),
    0,
    0,
    0,
    { parent: pendant, cast: false }
  );
  const pendantBulb = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 3 });
  mesh(new THREE.SphereGeometry(0.06, 12, 8), pendantBulb, 0, -0.1, 0, { parent: pendant, cast: false });
  scene.add(pendant);
  const pendantSpot = new THREE.SpotLight(0xfff0d8, 140, 20, 0.62, 0.5, 2);
  pendantSpot.position.set(0, 3.3, -0.9);
  pendantSpot.target.position.set(0, 0.9, -5.8);
  pendantSpot.castShadow = true;
  pendantSpot.shadow.mapSize.set(1024, 1024);
  pendantSpot.shadow.bias = -0.0005;
  pendantSpot.shadow.normalBias = 0.02;
  pendantSpot.shadow.camera.near = 0.3;
  pendantSpot.shadow.camera.far = 15;
  scene.add(pendantSpot, pendantSpot.target);
  flickerLights.push({ light: pendantSpot, base: pendantSpot.intensity, bulbMat: pendantBulb });

  function sconce(x, z, side) {
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, emissive: 0xffd9a0, emissiveIntensity: 1.2, side: THREE.DoubleSide });
    const sh = mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.22, 16, 1, true), shadeMat, x - side * 0.15, 2.6, z, { cast: false });
    sh.scale.z = 0.6;
    const light = new THREE.PointLight(0xffd9a0, 6, 8, 2);
    light.position.set(x - side * 0.4, 2.6, z);
    scene.add(light);
    flickerLights.push({ light, base: light.intensity, bulbMat: shadeMat });
  }
  sconce(-HX, 4.5, -1);
  sconce(HX, 1.4, 1);
  sconce(HX, -8.6, 1);

  carLight.userData.base = carLight.intensity;
  flickerLights.push({ light: carLight, base: carLight.intensity });

  // ---------- Exterior: farola, lluvia y relámpagos ----------
  const lampPost = new THREE.Group();
  lampPost.position.set(4.2, 0, 15.5);
  mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 10), mats.black, 0, 2.1, 0, { parent: lampPost });
  mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfd8ff, emissiveIntensity: 2 }),
    0,
    4.3,
    0,
    { parent: lampPost, cast: false }
  );
  scene.add(lampPost);
  const streetLight = new THREE.PointLight(0xb8c4e0, 22, 14, 2);
  streetLight.position.set(4.2, 4.1, 15.5);
  scene.add(streetLight);

  const lightning = new THREE.PointLight(0xc8d4ff, 0, 80, 1);
  lightning.position.set(-2, 10, 22);
  scene.add(lightning);

  const DROPS = 1100;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(DROPS * 6);
  const rainSeed = new Float32Array(DROPS * 3);
  for (let i = 0; i < DROPS; i++) {
    rainSeed[i * 3] = (Math.random() - 0.5) * 20;
    rainSeed[i * 3 + 1] = Math.random() * 8;
    rainSeed[i * 3 + 2] = HZ + 0.6 + Math.random() * 9;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9aa6b8, transparent: true, opacity: 0.35 }));
  rain.frustumCulled = false;
  scene.add(rain);

  // ---------- Estado animado ----------
  const state = {
    doorsOpen: 0,
    doorsTarget: 0,
    elevOpen: 0,
    elevTarget: 0,
    needle: floorToNeedle(1),
    needleTarget: floorToNeedle(1),
    needleSpin: false,
    phoneRinging: false,
    lightning: 0,
    lightningQueue: [],
    raining: true,
    clockHours: 23,
    clockReverse: false,
    mirrorWriting: 0,
    mirrorWritingTarget: 0,
    bellPress: 0,
    buttonPress: 0,
  };

  function update(dt, t) {
    // Puertas de entrada
    state.doorsOpen += (state.doorsTarget - state.doorsOpen) * Math.min(1, dt * 3);
    doorLeft.rotation.y = state.doorsOpen * 1.3;
    doorRight.rotation.y = -state.doorsOpen * 1.3;

    // Puertas del ascensor
    const elevSpeed = dt * 0.9;
    state.elevOpen += Math.sign(state.elevTarget - state.elevOpen) * Math.min(elevSpeed, Math.abs(state.elevTarget - state.elevOpen));
    doorL.position.z = -2.95 - state.elevOpen * 0.88;
    doorR.position.z = -2.05 + state.elevOpen * 0.88;

    // Aguja del ascensor
    if (state.needleSpin) state.needle += dt * 2.5;
    else state.needle += (state.needleTarget - state.needle) * Math.min(1, dt * 1.5);
    needle.rotation.set(0, Math.PI / 2, 0);
    needle.rotateZ(state.needle);

    // Reloj
    const hours = state.clockHours;
    minuteHand.rotation.z = -((hours % 1) * Math.PI * 2);
    hourHand.rotation.z = -(((hours % 12) / 12) * Math.PI * 2);

    // Teléfono sonando
    if (state.phoneRinging) {
      const ring = Math.sin(t * 50) * (Math.sin(t * 3.1) > 0 ? 1 : 0);
      handset.position.y = 0.1 + Math.abs(ring) * 0.012;
      handset.rotation.z = ring * 0.05;
    } else {
      handset.position.y = 0.1;
      handset.rotation.z = 0;
    }

    // Campanilla y pulsador
    state.bellPress = Math.max(0, state.bellPress - dt * 4);
    plunger.position.y = 0.07 - state.bellPress * 0.012;
    state.buttonPress = Math.max(0, state.buttonPress - dt * 4);
    button.position.y = 0.065 - state.buttonPress * 0.015;

    // Escritura en el espejo
    state.mirrorWriting += (state.mirrorWritingTarget - state.mirrorWriting) * Math.min(1, dt * 0.8);
    mirrorWriting.material.opacity = state.mirrorWriting;

    // Relámpagos
    if (state.lightningQueue.length) {
      state.lightningQueue[0] -= dt;
      if (state.lightningQueue[0] <= 0) {
        state.lightningQueue.shift();
        state.lightning = 1;
      }
    }
    state.lightning = Math.max(0, state.lightning - dt * 5);
    lightning.intensity = state.lightning * 600;

    // Lluvia
    rain.visible = state.raining;
    if (state.raining) {
      for (let i = 0; i < DROPS; i++) {
        const sx = rainSeed[i * 3];
        let sy = rainSeed[i * 3 + 1] - dt * 9;
        if (sy < 0) sy += 8;
        rainSeed[i * 3 + 1] = sy;
        const sz = rainSeed[i * 3 + 2];
        const o = i * 6;
        rainPos[o] = sx;
        rainPos[o + 1] = sy;
        rainPos[o + 2] = sz;
        rainPos[o + 3] = sx + 0.04;
        rainPos[o + 4] = sy + 0.38;
        rainPos[o + 5] = sz;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
  }

  return {
    colliders,
    interactables,
    mirror,
    mirrorRegistry,
    flickerLights,
    bounds: { minX: -HX + 0.4, maxX: HX - 0.4, minZ: -HZ + 0.4, maxZ: HZ - 0.5 },
    update,
    setDoorsOpen: (open) => (state.doorsTarget = open ? 1 : 0),
    setElevatorOpen: (open) => (state.elevTarget = open ? 1 : 0),
    elevatorOpenAmount: () => state.elevOpen,
    setElevatorFloor(value) {
      state.needleSpin = false;
      state.needleTarget = floorToNeedle(value);
    },
    spinElevator(on) {
      state.needleSpin = on;
    },
    setPhoneRinging: (on) => (state.phoneRinging = on),
    setDocsVisible: (on) => (docs.visible = on),
    setRain(on) {
      state.raining = on;
    },
    isRaining: () => state.raining,
    setClock(hours) {
      state.clockHours = hours;
    },
    lightning() {
      state.lightningQueue.push(0, 0.12 + Math.random() * 0.1);
      if (Math.random() < 0.5) state.lightningQueue.push(0.25);
    },
    pressBell: () => (state.bellPress = 1),
    pressButton: () => (state.buttonPress = 1),
    showMirrorWriting(text) {
      setMirrorWriting(text);
      state.mirrorWritingTarget = 0.9;
    },
    hideMirrorWriting: () => (state.mirrorWritingTarget = 0),
  };
}
