import * as THREE from 'three';
import { buildSteps } from './mindgame.js';

const _v = new THREE.Vector3();

// Acompañar a un huésped por el pasillo hasta su habitación.
// El huésped camina delante, se detiene en tres puntos y te pide algo. Tú eliges qué responder.
export class EscortSession {
  constructor(game, actor) {
    this.game = game;
    this.actor = actor;
    this.spec = actor.spec;
    this.corridor = game.corridor;
    const plan = buildSteps(actor.spec, game.rng);
    this.steps = plan.steps;
    this.farewell = plan.farewell;
    this.phase = 'walking'; // walking | talking | entering | returning | dead
    this.tips = 0;
    this.outcome = null; // 'escorted' | 'contained'
    this.held = null;
    this.nagged = false;
    this.facePlayer = false;
    this.lookback = false;
    this.lookbackStep = null;
    this.stepTimer = 0;
    this.knockTimer = 9;
    this.waiters = [];
  }

  get alive() {
    return this.phase !== 'dead' && this.game.escort === this;
  }

  start() {
    const a = this.actor;
    a.phase = 'escort';
    a.model.root.position.copy(this.corridor.guestStart);
    a.model.root.rotation.y = Math.PI;
    a.model.lookTarget = null;
    a.speed = 0.85;
    this.walkTo(0);
  }

  // ---------- Utilidades asíncronas ----------
  until(cond) {
    return new Promise((resolve) => this.waiters.push({ cond, resolve }));
  }

  wait(seconds) {
    return new Promise((resolve) => this.game.after(seconds, resolve));
  }

  say(text, { player = false, eerie = false, glitch = false } = {}) {
    return this.game.ui.say(player ? 'Tú' : 'Huésped', text, {
      eerie,
      glitch,
      hold: player ? 600 : null,
      onType: player ? null : () => (this.actor.model.talking = 0.2),
    });
  }

  playerDist() {
    const p = this.game.player.position;
    const g = this.actor.model.root.position;
    return Math.hypot(p.x - g.x, p.z - g.z);
  }

  // Mirar atrás = mirar hacia el ascensor sin estar mirando al huésped.
  playerLookingBack() {
    const fwd = this.game.player.forward(_v);
    if (fwd.z * this.corridor.backward.z <= 0.35) return false;
    const p = this.game.player.position;
    const g = this.actor.model.root.position;
    const dx = g.x - p.x;
    const dz = g.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    return (fwd.x * dx + fwd.z * dz) / len < 0.6;
  }

  // ---------- Recorrido ----------
  walkTo(i) {
    this.phase = 'walking';
    this.actor.path = [this.corridor.waypoints[i].clone()];
    this.actor.onArrive = () => this.arrive(i);
  }

  async arrive(i) {
    if (!this.alive) return;
    this.phase = 'talking';
    await this.runStep(this.steps[i]);
    if (!this.alive) return;
    if (i + 1 < this.steps.length) this.walkTo(i + 1);
    else this.finish();
  }

  async runStep(step) {
    const g = this.game;
    const a = this.actor;
    const anomaly = this.spec.isAnomaly;
    const forbidden = step.kind === 'forbidden';
    this.currentStep = step;

    await this.until(() => this.playerDist() < 3.2);
    if (!this.alive) return;
    this.facePlayer = true;
    a.model.lookTarget = g.camera.position;
    if (step.physical && anomaly) this.startLookback(step);

    await this.say(step.ask, { eerie: anomaly && forbidden });
    let round = 0;
    while (this.alive) {
      const comply = round === 0 ? step.comply : step.complyAlt[round - 1];
      const opts = g.rng.shuffle([
        { label: comply, comply: true },
        { label: step.refuse, comply: false },
      ]);
      const idx = await g.ui.choose(
        opts.map((o) => o.label),
        { timeout: 14, pressure: round > 0 }
      );
      if (!this.alive) return;
      const chosen = idx >= 0 ? opts[idx] : null;
      const complied = chosen ? chosen.comply : false;
      await this.say(chosen ? chosen.label : '...', { player: true });
      if (!this.alive) return;

      if (!forbidden) {
        if (complied && !anomaly) this.tip();
        await this.say(complied ? step.thanks : step.snub);
        break;
      }
      if (complied) {
        if (anomaly) {
          this.fatal();
          return;
        }
        await this.say(step.humanReply || 'Gracias.');
        break;
      }
      // Se ha negado a romper una norma. La anomalía insiste, cada vez con más presión.
      if (anomaly && round < step.persuade.length) {
        this.pressure(round);
        await this.say(step.persuade[round], { eerie: true, glitch: round > 0 });
        round++;
        continue;
      }
      if (anomaly) this.corridor.flicker(0.6);
      await this.say(anomaly ? step.giveUp : step.humanRefused || 'Como quiera.', { eerie: anomaly });
      break;
    }
    this.stopLookback();
    this.facePlayer = false;
    a.model.lookTarget = null;
  }

  tip() {
    const amount = this.game.rng.int(2, 6);
    this.tips += amount;
    this.game.addTips(amount);
  }

  // Más presión: parpadeo, susurros, distorsión y el huésped se acerca un paso.
  pressure(round) {
    const g = this.game;
    this.corridor.flicker(0.8 + round * 0.6);
    g.audio.whisper();
    g.audio.flickerBuzz();
    g.distortPulse = 0.5 + round * 0.5;
    const root = this.actor.model.root;
    const p = g.player.position;
    const dx = p.x - root.position.x;
    const dz = p.z - root.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.3) {
      root.position.x += (dx / d) * 0.45;
      root.position.z += (dz / d) * 0.45;
    }
  }

  // "Mire atrás": se oyen pasos detrás. Si te das la vuelta, estás perdido.
  startLookback(step) {
    this.lookback = true;
    this.lookbackStep = step;
    this.stepTimer = 0.4;
  }

  stopLookback() {
    if (!this.lookback) return;
    // Un par de segundos más de pasos: la tentación no se va de golpe.
    this.game.after(2.5, () => (this.lookback = false));
  }

  fatal() {
    if (!this.alive) return;
    this.phase = 'dead';
    this.lookback = false;
    this.game.escortFatal(this);
  }

  async finish() {
    const g = this.game;
    const anomaly = this.spec.isAnomaly;
    this.phase = 'entering';
    this.facePlayer = true;
    this.actor.model.lookTarget = g.camera.position;
    await this.say(this.farewell, { eerie: anomaly });
    if (!this.alive) return;
    this.facePlayer = false;
    this.corridor.openTargetDoor();
    g.audio.door();
    await this.wait(0.9);
    if (!this.alive) return;
    this.actor.model.lookTarget = null;
    this.actor.speed = 0.8;
    this.actor.path = [this.corridor.doorInside.clone()];
    let inside = false;
    this.actor.onArrive = () => (inside = true);
    await this.until(() => inside);
    if (!this.alive) return;
    g.removeActor(this.actor);
    g.actors = g.actors.filter((x) => x !== this.actor);
    this.corridor.closeTargetDoor(anomaly);
    if (anomaly) {
      g.audio.knock();
      g.audio.stinger();
      this.corridor.flicker(1.4);
      this.outcome = 'contained';
      g.ui.toast(`Has encerrado a la anomalía en la habitación ${this.spec.room}. La Gerencia no te amonestará.`, false, 6000);
    } else {
      this.outcome = 'escorted';
      g.ui.toast(this.tips ? `Huésped acompañado. Propina: ${this.tips} pesetas.` : 'Huésped acompañado.', false, 5000);
    }
    this.phase = 'returning';
    g.onEscortResolved(this);
    g.after(4, () => {
      if (this.game.escort === this && this.phase === 'returning') g.ui.toast('Vuelve al ascensor del pasillo y pulsa E.');
    });
  }

  update(dt) {
    if (!this.alive) return;
    const g = this.game;
    const a = this.actor;
    const d = this.playerDist();

    // El huésped espera si te quedas atrás.
    if (this.phase === 'walking') {
      if (!this.held && d > 4.5) {
        this.held = a.path;
        a.path = [];
        a.model.lookTarget = g.camera.position;
        if (!this.nagged) {
          this.nagged = true;
          this.say('¿Viene usted?', { eerie: this.spec.isAnomaly });
        }
      } else if (this.held && d < 2.8) {
        a.path = this.held;
        this.held = null;
        a.model.lookTarget = null;
      }
    }
    if (this.facePlayer || this.held) a.model.faceTowards(_v.set(g.player.position.x, 0, g.player.position.z), dt, 4);

    for (const w of this.waiters.slice()) {
      if (w.cond()) {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        w.resolve();
      }
    }

    if (this.lookback) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        g.audio.footstep(0.8);
        this.stepTimer = 0.7;
      }
      if (this.playerLookingBack()) {
        this.fatal();
        return;
      }
    }

    // Golpes detrás de alguna puerta.
    this.knockTimer -= dt;
    if (this.knockTimer <= 0) {
      g.audio.knock();
      this.knockTimer = g.rng.range(10, 22);
    }
  }
}
