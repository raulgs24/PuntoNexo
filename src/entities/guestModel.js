import * as THREE from 'three';

// Figura humanoide de baja poligonización construida con primitivas.
// traits: { gender, height, build, coat, skin, hat, glasses, mustache, hairDark, tie, suitcase, bellhop }
// flags (anomalías visuales): { noShadow, eyes: 'red'|'three'|'none', longArms, longNeck, floating, stare }

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

function gray(v) {
  return new THREE.Color().setRGB(v, v, v, THREE.SRGBColorSpace);
}

export class GuestModel {
  constructor(traits, flags = {}) {
    this.traits = traits;
    this.flags = flags;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.walkPhase = Math.random() * 10;
    this.speed = 0;
    this.blinkTimer = 1 + Math.random() * 3;
    this.blink = 0;
    this.talking = 0;
    this.lookTarget = null;
    this.headYaw = 0;
    this.headPitch = 0;
    this.time = Math.random() * 100;
    this.opacity = 1;
    this.materials = [];
    this.build();
  }

  mat(params) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.75, ...params });
    this.materials.push(m);
    return m;
  }

  part(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = !this.flags.noShadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  build() {
    const t = this.traits;
    const f = this.flags;
    const s = t.height / 1.8;
    const b = t.build;
    const bellhop = !!t.bellhop;

    const coatMat = bellhop ? this.mat({ color: 0x8c0c12, roughness: 0.6 }) : this.mat({ color: gray(t.coat) });
    const trouserMat = this.mat({ color: bellhop ? 0x111111 : gray(Math.max(0.05, t.coat - 0.12)) });
    const skinMat = this.mat({ color: gray(t.skin), roughness: 0.6 });
    const shoeMat = this.mat({ color: 0x080808, roughness: 0.3 });
    const hairMat = this.mat({ color: gray(t.hairDark ? 0.06 : 0.55), roughness: 0.9 });
    const hatMat = bellhop ? coatMat : this.mat({ color: gray(Math.max(0.04, t.coat - 0.08)), roughness: 0.8 });

    // Piernas
    this.legs = [];
    const hipY = 0.9 * s;
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1 * b, hipY, 0);
      this.part(new THREE.CapsuleGeometry(0.068, 0.72 * s, 4, 10), trouserMat, pivot, 0, -0.43 * s, 0);
      this.part(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoeMat, pivot, 0, -hipY + 0.035, 0.05);
      this.body.add(pivot);
      this.legs.push(pivot);
    }

    // Abrigo / torso
    const coatBottom = bellhop ? 0.85 * s : 0.5 * s;
    const coatTop = 1.46 * s;
    const coatH = coatTop - coatBottom;
    const torso = this.part(new THREE.CylinderGeometry(0.2 * b, 0.25 * b, coatH, 18), coatMat, this.body, 0, coatBottom + coatH / 2, 0);
    torso.scale.z = 0.7;
    // Hombros
    const shoulders = this.part(new THREE.SphereGeometry(0.21 * b, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), coatMat, this.body, 0, coatTop - 0.04, 0);
    shoulders.scale.set(1.15, 0.45, 0.72);
    // Camisa y corbata
    const shirt = this.part(
      new THREE.PlaneGeometry(0.12 * b, 0.3 * s),
      this.mat({ color: gray(0.85) }),
      this.body,
      0,
      coatTop - 0.17 * s,
      0.2 * b * 0.7 + 0.005
    );
    shirt.castShadow = false;
    if (t.tie || bellhop) {
      this.part(
        new THREE.BoxGeometry(0.035, 0.24 * s, 0.01),
        this.mat({ color: bellhop ? 0x111111 : 0x9a0d14, roughness: 0.5 }),
        this.body,
        0,
        coatTop - 0.18 * s,
        0.2 * b * 0.7 + 0.012
      );
    }
    if (bellhop) {
      const brass = this.mat({ color: 0xc9a253, metalness: 0.9, roughness: 0.3 });
      for (let i = 0; i < 4; i++) {
        for (const side of [-1, 1]) {
          this.part(new THREE.SphereGeometry(0.012, 8, 6), brass, this.body, side * 0.07, coatTop - 0.12 - i * 0.1, 0.17 * b);
        }
      }
    }

    // Brazos
    this.arms = [];
    const armLen = (f.longArms ? 0.92 : 0.58) * s;
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.27 * b, coatTop - 0.06, 0);
      this.part(new THREE.CapsuleGeometry(0.055, armLen, 4, 10), coatMat, pivot, 0, -armLen / 2 - 0.03, 0);
      this.part(new THREE.SphereGeometry(0.048, 10, 8), skinMat, pivot, 0, -armLen - 0.1, 0);
      pivot.rotation.z = side * 0.06;
      this.body.add(pivot);
      this.arms.push(pivot);
    }
    if (t.suitcase) {
      const caseMat = this.mat({ color: gray(0.16), roughness: 0.55 });
      const sc = this.part(new THREE.BoxGeometry(0.12, 0.34, 0.46), caseMat, this.arms[1], 0.0, -armLen - 0.28, 0);
      sc.rotation.y = 0;
      this.part(new THREE.BoxGeometry(0.02, 0.04, 0.12), shoeMat, this.arms[1], 0, -armLen - 0.1, 0);
    }

    // Cuello y cabeza
    const neckLen = (f.longNeck ? 0.34 : 0.09) * s;
    this.part(new THREE.CylinderGeometry(0.048, 0.055, neckLen + 0.04, 10), skinMat, this.body, 0, coatTop + neckLen / 2, 0);
    this.head = new THREE.Group();
    this.head.position.set(0, coatTop + neckLen, 0);
    this.body.add(this.head);
    const skull = this.part(new THREE.SphereGeometry(0.115, 24, 18), skinMat, this.head, 0, 0.12, 0);
    skull.scale.set(t.gender === 'f' ? 0.92 : 1, 1.17, 1.02);
    this.part(new THREE.SphereGeometry(0.022, 8, 6), skinMat, this.head, 0, 0.1, 0.115);

    // Ojos
    this.eyes = [];
    const eyeMat =
      f.eyes === 'red'
        ? this.mat({ color: 0x300000, emissive: 0xff0000, emissiveIntensity: 3 })
        : this.mat({ color: 0x050505, roughness: 0.2 });
    const eyePos = [];
    if (f.eyes !== 'none') {
      eyePos.push([-0.042, 0.145, 0.1], [0.042, 0.145, 0.1]);
      if (f.eyes === 'three') eyePos.push([0, 0.19, 0.103]);
    }
    for (const [x, y, z] of eyePos) {
      const white = this.part(new THREE.SphereGeometry(0.02, 12, 8), this.mat({ color: gray(0.92), roughness: 0.3 }), this.head, x, y, z - 0.004);
      white.scale.set(1.2, 0.8, 0.5);
      const e = this.part(new THREE.SphereGeometry(0.012, 10, 8), eyeMat, this.head, x, y, z + 0.006);
      this.eyes.push(white, e);
    }
    // Cejas
    if (f.eyes !== 'none') {
      for (const side of [-1, 1]) {
        const brow = this.part(new THREE.BoxGeometry(0.04, 0.008, 0.01), hairMat, this.head, side * 0.043, 0.172, 0.108);
        brow.rotation.z = -side * 0.12;
      }
    }
    // Boca
    if (f.eyes !== 'none') {
      this.mouth = this.part(new THREE.BoxGeometry(0.045, 0.008, 0.01), this.mat({ color: gray(0.12) }), this.head, 0, 0.065, 0.11);
    }
    if (t.mustache) {
      this.part(new THREE.BoxGeometry(0.07, 0.018, 0.02), hairMat, this.head, 0, 0.083, 0.112);
    }
    if (t.glasses) {
      const rim = this.mat({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.3 });
      for (const side of [-1, 1]) {
        this.part(new THREE.TorusGeometry(0.027, 0.004, 6, 16), rim, this.head, side * 0.043, 0.145, 0.118);
      }
      this.part(new THREE.BoxGeometry(0.03, 0.004, 0.004), rim, this.head, 0, 0.15, 0.12);
    }

    // Pelo / sombrero
    const hatType = bellhop ? 'pillbox' : t.hat;
    if (hatType === 'none' || hatType === 'cloche' || hatType === 'pillbox') {
      // Casquete de pelo inclinado hacia atrás para dejar libre la frente.
      const hair = this.part(new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, this.head, 0, 0.165, -0.012);
      hair.scale.set(t.gender === 'f' ? 0.98 : 1.02, 1.0, 1.06);
      hair.rotation.x = -0.4;
      if (t.gender === 'f' && hatType !== 'pillbox') {
        const back = this.part(new THREE.SphereGeometry(0.12, 16, 10), hairMat, this.head, 0, 0.06, -0.04);
        back.scale.set(1.05, 1.0, 0.8);
      }
    }
    if (hatType === 'fedora') {
      const brim = this.part(new THREE.CylinderGeometry(0.19, 0.2, 0.018, 28), hatMat, this.head, 0, 0.245, 0.005);
      brim.rotation.x = 0.08;
      const crown = this.part(new THREE.CylinderGeometry(0.1, 0.125, 0.13, 20), hatMat, this.head, 0, 0.315, 0);
      crown.scale.z = 0.9;
      this.part(new THREE.CylinderGeometry(0.127, 0.127, 0.032, 20), this.mat({ color: 0x050505 }), this.head, 0, 0.268, 0);
    } else if (hatType === 'bowler') {
      this.part(new THREE.CylinderGeometry(0.16, 0.16, 0.016, 24), hatMat, this.head, 0, 0.235, 0);
      const dome = this.part(new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, this.head, 0, 0.235, 0);
      dome.scale.y = 1.0;
    } else if (hatType === 'cloche') {
      const dome = this.part(new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat, this.head, 0, 0.2, -0.005);
      dome.scale.y = 0.9;
      const cloche = this.part(new THREE.CylinderGeometry(0.137, 0.16, 0.035, 24, 1, true), hatMat, this.head, 0, 0.192, -0.005);
      cloche.material.side = THREE.DoubleSide;
    } else if (hatType === 'pillbox') {
      this.part(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 20), coatMat, this.head, 0.03, 0.275, 0);
      this.part(new THREE.CylinderGeometry(0.077, 0.077, 0.015, 20), this.mat({ color: 0xc9a253, metalness: 0.9, roughness: 0.3 }), this.head, 0.03, 0.245, 0);
    }

    if (f.floating) this.body.position.y = 0.22;
  }

  setNoReflect(registry, on) {
    if (on) registry.noReflect.add(this.root);
    else registry.noReflect.delete(this.root);
  }

  setOpacity(o) {
    this.opacity = o;
    for (const m of this.materials) {
      m.transparent = o < 1;
      m.opacity = o;
      m.depthWrite = o >= 1;
    }
  }

  // Anima andar, parpadeo, respiración y mirada.
  update(dt) {
    this.time += dt;
    const f = this.flags;
    const moving = this.speed > 0.05;

    if (moving && !f.floating) {
      this.walkPhase += dt * this.speed * 5.2;
      const sw = Math.sin(this.walkPhase) * 0.45;
      this.legs[0].rotation.x = sw;
      this.legs[1].rotation.x = -sw;
      this.arms[0].rotation.x = -sw * 0.7;
      this.arms[1].rotation.x = this.traits.suitcase ? sw * 0.15 : sw * 0.7;
      this.body.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.025;
    } else {
      for (const l of this.legs) l.rotation.x *= 0.85;
      for (const a of this.arms) a.rotation.x *= 0.85;
      const breathe = Math.sin(this.time * 1.6) * 0.004;
      this.body.position.y = f.floating ? 0.22 + Math.sin(this.time * 1.3) * 0.04 : breathe;
    }

    // Parpadeo (los que miran fijamente nunca parpadean)
    if (!f.stare) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blink = 1;
        this.blinkTimer = 1.8 + Math.random() * 3.5;
      }
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    const eyeScaleY = this.blink > 0.5 ? 0.1 : 1;
    for (let i = 0; i < this.eyes.length; i++) {
      const base = i % 2 === 0 ? 0.8 : 1;
      this.eyes[i].scale.y = base * eyeScaleY * (f.stare ? 1.25 : 1);
    }

    // Boca al hablar
    if (this.mouth) {
      this.talking = Math.max(0, this.talking - dt);
      this.mouth.scale.y = this.talking > 0 ? 1 + Math.abs(Math.sin(this.time * 22)) * 3 : 1;
    }

    // Mirada
    let yaw = 0;
    let pitch = 0;
    if (this.lookTarget) {
      this.head.getWorldPosition(_v);
      const local = this.root.worldToLocal(this.lookTarget.clone());
      const headLocal = this.root.worldToLocal(_v.clone());
      const dx = local.x - headLocal.x;
      const dz = local.z - headLocal.z;
      const dy = local.y - headLocal.y - 0.12;
      yaw = Math.atan2(dx, dz);
      pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      const lim = f.stare ? 1.4 : 1.0;
      yaw = THREE.MathUtils.clamp(yaw, -lim, lim);
      pitch = THREE.MathUtils.clamp(pitch, -0.5, 0.5);
    }
    const k = Math.min(1, dt * (f.stare ? 12 : 4));
    this.headYaw += (yaw - this.headYaw) * k;
    this.headPitch += (pitch - this.headPitch) * k;
    this.head.rotation.set(this.headPitch, this.headYaw, 0, 'YXZ');
  }

  // Orienta el cuerpo hacia un punto del suelo.
  faceTowards(point, dt, rate = 6) {
    const dx = point.x - this.root.position.x;
    const dz = point.z - this.root.position.z;
    if (dx * dx + dz * dz < 1e-6) return;
    const target = Math.atan2(dx, dz);
    _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, target);
    this.root.quaternion.rotateTowards(_q, dt * rate);
  }

  dispose() {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    for (const m of this.materials) m.dispose();
  }
}
