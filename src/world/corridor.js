import * as THREE from 'three';
import * as TX from './textures.js';
import { drawPortrait } from '../game/portrait.js';

// Pasillo de las plantas superiores. Vive lejos del vestíbulo y solo se muestra al acompañar a un huésped.
// Ejes locales: el ascensor está en z = 0 y el pasillo avanza hacia -z.

const ORIGIN = new THREE.Vector3(60, 0, 0);
const LEN = 30;
const WID = 2.8;
const HGT = 3.1;
const HALF = WID / 2;
const DOOR_Z = [-4.2, -7.6, -11.0, -14.4, -17.8, -21.2, -24.6];
const TARGET = { side: -1, index: 4 };

export function buildCorridor(scene) {
  const group = new THREE.Group();
  group.position.copy(ORIGIN);
  group.visible = false;
  scene.add(group);
  const interactables = [];
  const lights = [];

  const mats = {
    wood: new THREE.MeshStandardMaterial({ map: TX.woodTexture(), roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a253, metalness: 0.9, roughness: 0.35 }),
    void: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.9 }),
  };

  function mesh(geo, mat, x, y, z, { cast = false, receive = true, parent = group } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, mat, x, y, z, opts) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opts);

  // Suelo, techo y paredes
  const carpet = TX.carpetTexture();
  carpet.repeat.set(1.4, LEN / 2);
  const floor = mesh(new THREE.PlaneGeometry(WID, LEN), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }), 0, 0, -LEN / 2);
  floor.rotation.x = -Math.PI / 2;
  const ceil = mesh(new THREE.PlaneGeometry(WID, LEN), mats.ceiling, 0, HGT, -LEN / 2);
  ceil.rotation.x = Math.PI / 2;

  const paper = TX.wallpaperTexture();
  paper.repeat.set(LEN / 1.4, 1.1);
  const wallMat = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.85 });
  for (const side of [-1, 1]) {
    box(0.1, HGT, LEN, wallMat, side * (HALF + 0.05), HGT / 2, -LEN / 2);
    box(0.04, 1.0, LEN, mats.wood, side * (HALF - 0.02), 0.5, -LEN / 2);
    box(0.06, 0.05, LEN, mats.brass, side * (HALF - 0.03), 1.02, -LEN / 2);
  }
  box(WID, HGT, 0.1, wallMat, 0, HGT / 2, -LEN - 0.05);
  box(WID, HGT, 0.1, wallMat, 0, HGT / 2, 0.05);

  // Retrato al fondo del pasillo: el botones. Siempre el botones.
  const portraitCanvas = document.createElement('canvas');
  drawPortrait(portraitCanvas, { gender: 'm', coat: 0.3, skin: 0.7, hat: 'none', hairDark: true, bellhop: true, build: 1 }, 7);
  const portraitTex = new THREE.CanvasTexture(portraitCanvas);
  portraitTex.colorSpace = THREE.SRGBColorSpace;
  box(1.0, 1.25, 0.06, mats.brass, 0, 1.75, -LEN + 0.04);
  mesh(new THREE.PlaneGeometry(0.88, 1.1), new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.7 }), 0, 1.75, -LEN + 0.08);

  // Puertas numeradas
  const doors = [];
  for (const side of [-1, 1]) {
    DOOR_Z.forEach((z, index) => {
      const inward = -side; // hacia el centro del pasillo
      const wx = side * HALF;
      // Hueco negro justo detrás de la hoja: al abrirse, la habitación es pura oscuridad.
      const voidPlane = mesh(new THREE.PlaneGeometry(1.0, 2.2), mats.void, wx + inward * 0.045, 1.1, z, { receive: false });
      voidPlane.rotation.y = inward > 0 ? Math.PI / 2 : -Math.PI / 2;
      box(0.08, 2.35, 0.1, mats.dark, wx + inward * 0.02, 1.175, z + 0.56);
      box(0.08, 2.35, 0.1, mats.dark, wx + inward * 0.02, 1.175, z - 0.56);
      box(0.08, 0.12, 1.22, mats.dark, wx + inward * 0.02, 2.29, z);

      const pivot = new THREE.Group();
      pivot.position.set(wx + inward * 0.03, 0, z + 0.5);
      group.add(pivot);
      box(0.05, 2.18, 1.0, mats.wood, 0, 1.09, -0.5, { parent: pivot });
      box(0.02, 0.9, 0.7, mats.dark, inward * 0.03, 1.5, -0.5, { parent: pivot });
      mesh(new THREE.SphereGeometry(0.035, 10, 8), mats.brass, inward * 0.06, 1.0, -0.88, { parent: pivot });

      const plateCanvas = document.createElement('canvas');
      plateCanvas.width = 128;
      plateCanvas.height = 64;
      const plateTex = new THREE.CanvasTexture(plateCanvas);
      plateTex.colorSpace = THREE.SRGBColorSpace;
      const plate = mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.5, roughness: 0.4 }), inward * 0.03, 1.72, -0.5, {
        parent: pivot,
      });
      plate.rotation.y = inward > 0 ? Math.PI / 2 : -Math.PI / 2;
      doors.push({ side, index, z, pivot, plateCanvas, plateTex, open: 0, target: 0 });
    });
  }

  function drawPlate(door, text) {
    const ctx = door.plateCanvas.getContext('2d');
    ctx.fillStyle = '#b8955a';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#4a3a1c';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 120, 56);
    ctx.fillStyle = '#151008';
    ctx.font = 'bold 40px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), 64, 34);
    door.plateTex.needsUpdate = true;
  }

  // Apliques
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, emissive: 0xffd9a0, emissiveIntensity: 1.4, side: THREE.DoubleSide });
  [-2.4, -9.3, -16.1, -22.9, -28.0].forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const sh = mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.18, 14, 1, true), shadeMat, side * (HALF - 0.12), 2.2, z, { receive: false });
    sh.scale.x = 0.6;
    const light = new THREE.PointLight(0xffd9a0, 3.2, 7, 2);
    light.position.set(side * (HALF - 0.4), 2.2, z);
    group.add(light);
    lights.push({ light, base: light.intensity });
  });

  // Ascensor de vuelta
  const elevMat = new THREE.MeshStandardMaterial({ color: 0x8a7444, metalness: 0.85, roughness: 0.35 });
  const elevDoors = new THREE.Group();
  box(0.9, 2.5, 0.04, elevMat, -0.45, 1.25, -0.02, { parent: elevDoors });
  box(0.9, 2.5, 0.04, elevMat, 0.45, 1.25, -0.02, { parent: elevDoors });
  group.add(elevDoors);
  box(2.0, 0.1, 0.08, mats.brass, 0, 2.55, -0.03);
  const call = box(0.12, 0.22, 0.05, mats.brass, 1.05, 1.3, -0.03);
  for (const o of [elevDoors, call]) {
    o.traverse((c) => (c.userData.interact = 'corridorElevator'));
    o.userData.interact = 'corridorElevator';
    interactables.push(o);
  }
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: signTex }), 0, 2.78, -0.04, { receive: false }).rotation.y = Math.PI;

  const toWorld = (x, z) => new THREE.Vector3(ORIGIN.x + x, 0, ORIGIN.z + z);
  const targetZ = DOOR_Z[TARGET.index];
  const target = doors.find((d) => d.side === TARGET.side && d.index === TARGET.index);

  let flicker = 0;
  let slam = 0;

  return {
    group,
    interactables,
    colliders: [],
    bounds: { minX: ORIGIN.x - HALF + 0.35, maxX: ORIGIN.x + HALF - 0.35, minZ: ORIGIN.z - LEN + 0.6, maxZ: ORIGIN.z - 0.6 },
    playerStart: toWorld(0, -1.2),
    guestStart: toWorld(0.35, -2.2),
    waypoints: [toWorld(0, -6.0), toWorld(0.1, -12.6), toWorld(TARGET.side * 0.55, targetZ - 0.25)],
    doorInside: toWorld(TARGET.side * (HALF + 1.2), targetZ - 0.25),
    // El pasillo avanza hacia -z: mirar atrás es mirar hacia +z.
    backward: new THREE.Vector3(0, 0, 1),

    setup({ room, floor }) {
      const n = typeof room === 'number' ? room : 0;
      for (const d of doors) {
        const offset = (d.index - TARGET.index) * 2 + (d.side === TARGET.side ? 0 : 1);
        drawPlate(d, d === target ? room : n + offset);
        d.open = d.target = 0;
      }
      const ctx = signCanvas.getContext('2d');
      ctx.fillStyle = '#0d0b08';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#c9a453';
      ctx.font = '34px Limelight, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PLANTA ${floor}`, 128, 34);
      signTex.needsUpdate = true;
      flicker = 0;
    },
    setVisible(on) {
      group.visible = on;
    },
    openTargetDoor() {
      target.target = 1;
    },
    closeTargetDoor(hard = false) {
      target.target = 0;
      if (hard) slam = 1;
    },
    flicker(seconds) {
      flicker = Math.max(flicker, seconds);
    },
    update(dt) {
      for (const d of doors) {
        const speed = d.target === 0 && slam > 0 ? 9 : 1.6;
        d.open += (d.target - d.open) * Math.min(1, dt * speed);
        d.pivot.rotation.y = -d.side * 1.35 * d.open;
      }
      slam = Math.max(0, slam - dt);
      flicker = Math.max(0, flicker - dt);
      for (const l of lights) l.light.intensity = flicker > 0 && Math.random() < 0.5 ? l.base * 0.05 : l.base;
      shadeMat.emissiveIntensity = flicker > 0 ? 0.3 : 1.4;
    },
  };
}
