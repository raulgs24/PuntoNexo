import * as THREE from 'three';

const EYE = 1.68;
const RADIUS = 0.3;
const SPEED = 2.3;

// Controlador en primera persona con bloqueo de puntero y colisiones AABB.
export class Player {
  constructor(camera, dom, lobby, { debug = false } = {}) {
    this.camera = camera;
    this.dom = dom;
    // Zona transitable actual (vestíbulo o pasillo): { bounds, colliders }.
    this.world = lobby;
    this.arrowsBlocked = false;
    this.debug = debug;
    this.position = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = -0.08;
    this.keys = new Set();
    this.canMove = false;
    this.canLook = false;
    this.locked = false;
    this.speed = 0;
    this.bob = 0;
    this.stepAcc = 0;
    this.onStep = null;
    this.sensitivity = 0.0022;
    camera.rotation.order = 'YXZ';

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!(this.locked || this.debug) || !this.canLook) return;
      if (!this.locked && this.debug && e.buttons === 0) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    });
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  lock() {
    if (this.debug) return;
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch {
      // Algunos navegadores lanzan si no hay gesto del usuario.
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get active() {
    return this.locked || this.debug;
  }

  teleport(v, yaw = Math.PI) {
    this.position.set(v.x, 0, v.z);
    this.yaw = yaw;
    this.pitch = -0.08;
  }

  forward(out = new THREE.Vector3()) {
    return this.camera.getWorldDirection(out);
  }

  blocked(x, z) {
    const b = this.world.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
    for (const c of this.world.colliders) {
      if (x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
    }
    return false;
  }

  update(dt) {
    let mx = 0;
    let mz = 0;
    if (this.canMove && this.active) {
      const k = this.keys;
      // Con la lista de comprobaciones abierta, las flechas sirven para marcarla.
      const arrows = !this.arrowsBlocked;
      if (k.has('KeyW') || (arrows && k.has('ArrowUp'))) mz += 1;
      if (k.has('KeyS') || (arrows && k.has('ArrowDown'))) mz -= 1;
      if (k.has('KeyD') || (arrows && k.has('ArrowRight'))) mx += 1;
      if (k.has('KeyA') || (arrows && k.has('ArrowLeft'))) mx -= 1;
    }
    const len = Math.hypot(mx, mz);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let moved = 0;
    if (len > 0) {
      mx /= len;
      mz /= len;
      const step = SPEED * dt;
      // adelante = (-sin, -cos); derecha = (cos, -sin)
      const dx = (-sin * mz + cos * mx) * step;
      const dz = (-cos * mz - sin * mx) * step;
      const ox = this.position.x;
      const oz = this.position.z;
      if (!this.blocked(this.position.x + dx, this.position.z)) this.position.x += dx;
      if (!this.blocked(this.position.x, this.position.z + dz)) this.position.z += dz;
      moved = Math.hypot(this.position.x - ox, this.position.z - oz);
    }
    this.speed = moved / Math.max(dt, 1e-4);
    if (moved > 0) {
      this.bob += moved * 3.2;
      this.stepAcc += moved;
      if (this.stepAcc > 0.85) {
        this.stepAcc = 0;
        this.onStep?.();
      }
    }
    const bobY = Math.sin(this.bob * 2) * 0.025 * Math.min(1, this.speed);
    this.camera.position.set(this.position.x, EYE + bobY, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
