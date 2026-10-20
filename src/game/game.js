import * as THREE from 'three';
import { GuestModel } from '../entities/guestModel.js';
import { SPOTS } from '../world/lobby.js';
import { generateNight } from './guestFactory.js';
import { ANOMALIES, rulesForNight } from './anomalies.js';
import { createRng } from '../core/rng.js';
import * as DATA from './data.js';

const SAVE_KEY = 'puntonexo.night';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function loadSave() {
  try {
    return parseInt(localStorage.getItem(SAVE_KEY) || '1', 10) || 1;
  } catch {
    return 1;
  }
}

function writeSave(n) {
  try {
    localStorage.setItem(SAVE_KEY, String(n));
  } catch {
    // Sin almacenamiento: el progreso no se guarda.
  }
}

export class Game {
  constructor({ scene, camera, lobby, player, ui, audio, fx, playerBody }) {
    Object.assign(this, { scene, camera, lobby, player, ui, audio, fx, playerBody });
    this.state = 'title';
    this.paused = false;
    this.night = 1;
    this.faltas = 0;
    this.actors = [];
    this.current = null;
    this.lurkers = [];
    this.timers = [];
    this.records = [];
    this.processed = new Set();
    this.ledger = [];
    this.queue = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 4.2;
    this.target = null;
    this.flicker = 0;
    this.blackout = 0;
    this.distort = 0;
    this.darkness = 0;
    this.titleTime = 0;
    this.rng = createRng();
    this.mirrorGhost = null;
    this.hours = 23;
    this.talkBusy = false;
    this.phone = null;

    window.addEventListener('keydown', (e) => this.onKey(e));
    player.onStep = () => this.audio.footstep(0.5);
    player.onLockChange = (locked) => {
      if (!locked && this.isPlaying() && !this.player.debug) this.pause();
    };
  }

  // ---------- Utilidades ----------
  after(seconds, fn) {
    this.timers.push({ t: seconds, fn });
  }

  isPlaying() {
    return (this.state === 'phone' || this.state === 'shift') && !this.paused;
  }

  // ---------- Pantallas ----------
  showTitle() {
    this.state = 'title';
    this.ui.showHud(false);
    const saved = loadSave();
    const scr = this.ui.showScreen(
      `<h1>PUNTO NEXO</h1>
       <div class="tagline">Un hotel que nunca cierra. Un turno que nunca acaba.</div>
       <div class="btns">
         <button id="btn-new">Empezar turno</button>
         ${saved > 1 ? `<button id="btn-continue">Continuar · Noche ${ROMAN[saved - 1]}</button>` : ''}
       </div>
       <div class="controls">
         <kbd>WASD</kbd> moverse &nbsp;·&nbsp; <kbd>Ratón</kbd> mirar &nbsp;·&nbsp; <kbd>E</kbd> interactuar &nbsp;·&nbsp;
         <kbd>Q</kbd> documentos &nbsp;·&nbsp; <kbd>R</kbd> reglamento &nbsp;·&nbsp; <kbd>Esc</kbd> pausa<br/>
         Juega con auriculares. Y a oscuras.
       </div>`,
      { seeThrough: true }
    );
    scr.querySelector('#btn-new').onclick = () => {
      this.audio.init();
      this.faltas = 0;
      this.startNight(1);
    };
    const cont = scr.querySelector('#btn-continue');
    if (cont)
      cont.onclick = () => {
        this.audio.init();
        this.faltas = 0;
        this.startNight(saved);
      };
  }

  async showIntro() {
    this.state = 'intro';
    this.ui.showHud(false);
    const scr = this.ui.showScreen(
      `<h2>NOCHE ${ROMAN[this.night - 1]}</h2>
       <div class="monologue" id="monologue"></div>
       <div class="btns"><button id="btn-go" style="visibility:hidden">Ocupar el mostrador</button></div>`
    );
    const mono = scr.querySelector('#monologue');
    const btn = scr.querySelector('#btn-go');
    await this.ui.typewrite(mono, DATA.INTRO_MONOLOGUES[this.night - 1]);
    btn.style.visibility = 'visible';
    btn.onclick = () => {
      this.ui.hideScreen();
      this.player.lock();
      this.beginShift();
    };
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.ui.closePanels();
    const scr = this.ui.showScreen(
      `<h2>PAUSA</h2>
       <div class="tagline">El vestíbulo espera. Siempre espera.</div>
       <div class="btns"><button id="btn-resume">Volver al mostrador</button><button id="btn-menu">Menú principal</button></div>`,
      { seeThrough: true }
    );
    scr.querySelector('#btn-resume').onclick = () => {
      this.ui.hideScreen();
      this.paused = false;
      this.player.lock();
      // El navegador puede negar el bloqueo justo después de pulsar Esc: volvemos a la pausa.
      setTimeout(() => {
        if (!this.player.active && this.isPlaying()) this.pause();
      }, 400);
    };
    scr.querySelector('#btn-menu').onclick = () => {
      this.paused = false;
      this.cleanupNight();
      this.showTitle();
    };
  }

  // ---------- Ciclo de noche ----------
  cleanupNight() {
    for (const a of this.actors) this.removeActor(a);
    for (const l of this.lurkers) l.model.dispose();
    this.actors = [];
    this.lurkers = [];
    this.current = null;
    this.timers = [];
    this.ui.clearSay();
    this.ui.closePanels();
    this.lobby.setDocsVisible(false);
    this.lobby.setPhoneRinging(false);
    this.lobby.setElevatorOpen(false);
    this.lobby.hideMirrorWriting();
    this.audio.phoneRing(false);
    this.phone = null;
    this.distort = 0;
    this.darkness = 0;
    this.fadeOut = false;
    this.blackout = 0;
    this.flicker = 0;
    if (this.mirrorGhost) {
      this.lobby.mirrorRegistry.mirrorOnly.delete(this.mirrorGhost.root);
      this.mirrorGhost.dispose();
      this.mirrorGhost = null;
    }
  }

  startNight(n) {
    this.cleanupNight();
    this.night = n;
    writeSave(n);
    this.rng = createRng((Date.now() ^ (n * 7919)) >>> 0);
    const data = generateNight(n, this.rng);
    this.queue = data.guests.slice();
    this.ledger = data.ledger;
    this.totalGuests = data.guests.length;
    this.processed = new Set();
    this.records = [];
    this.faltasAtStart = this.faltas;
    this.rules = rulesForNight(n);
    this.hours = 23;
    this.lobby.setClock(23);
    this.lobby.setRain(n !== 5);
    this.audio.setRain(n !== 5);
    this.audio.setMusic(n <= 3);
    this.audio.setTension(0);
    this.lobby.setElevatorFloor(1);
    this.playerBody.root.userData.mirrorActive = true;
    this.player.teleport(SPOTS.playerStart, Math.PI);
    this.eventTimer = 25;
    this.endScheduled = false;
    this.ui.setFaltas(this.faltas);
    this.ui.setStatus(n, 23);
    this.showIntro();
  }

  beginShift() {
    this.state = 'phone';
    this.ui.showHud(true);
    this.player.canMove = true;
    this.player.canLook = true;
    this.after(2.0, () => {
      this.ringPhone('gerencia', DATA.GERENCIA_CALLS[this.night - 1]);
    });
    if (this.night === 1) {
      this.after(0.5, () => this.ui.toast('Ratón para mirar · WASD para moverte · E para interactuar'));
    }
  }

  ringPhone(kind, lines) {
    this.phone = { kind, lines, ringTime: 0 };
    this.lobby.setPhoneRinging(true);
    this.audio.phoneRing(true);
  }

  async answerPhone() {
    const call = this.phone;
    if (!call) return;
    this.phone = null;
    this.lobby.setPhoneRinging(false);
    this.audio.phoneRing(false);
    this.audio.click();
    if (call.kind === 'gerencia') {
      for (const line of call.lines) await this.ui.say('Gerencia · teléfono', line, { gerencia: true });
      if (this.state !== 'phone') return;
      this.ui.toast('Reglamento actualizado. Pulsa R para leerlo.');
      this.state = 'shift';
      this.spawnTimer = 4;
    } else {
      for (const line of call.lines) await this.ui.say('¿?', line, { gerencia: true, glitch: true });
      this.audio.whisper();
    }
  }

  advanceClock() {
    const done = this.processed.size;
    const progress = done / this.totalGuests;
    // La cuarta noche el reloj anda hacia atrás.
    this.hoursTarget = this.night === 4 ? 23 - progress * 6 : 23 + progress * 6;
  }

  endNight() {
    this.state = 'summary';
    this.player.unlock();
    this.ui.showHud(false);
    for (const l of this.lurkers) l.model.dispose();
    this.lurkers = [];
    const rows = this.records
      .map((r) => {
        const truth = r.spec.isAnomaly ? `Anomalía: ${r.spec.anomalies.map((id) => ANOMALIES[id].explain).join(' ')}` : 'Huésped legítimo';
        return `<tr>
          <td>${r.spec.slipName}</td>
          <td>${r.accept ? 'Admitido' : 'Expulsado'}</td>
          <td>${truth}</td>
          <td class="${r.correct ? 'ok' : 'bad'}">${r.correct ? '✓' : '✕'}</td>
        </tr>`;
      })
      .join('');
    const errors = this.records.filter((r) => !r.correct).length;
    const scr = this.ui.showScreen(
      `<h2>AMANECE... O CASI</h2>
       <div class="tagline">Fin de la noche ${ROMAN[this.night - 1]}. ${errors === 0 ? 'Turno impecable.' : `${errors} error${errors > 1 ? 'es' : ''} esta noche.`}</div>
       <table><tr><th>HUÉSPED</th><th>DECISIÓN</th><th>VERDAD</th><th></th></tr>${rows}</table>
       <div class="small">Amonestaciones acumuladas: ${this.faltas} de ${DATA.MAX_FALTAS}</div>
       <div class="btns"><button id="btn-next">Noche ${ROMAN[this.night]}</button></div>`
    );
    writeSave(this.night + 1);
    scr.querySelector('#btn-next').onclick = () => this.startNight(this.night + 1);
  }

  gameOver(reason) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.player.unlock();
    this.ui.showHud(false);
    this.ui.clearSay();
    const texts = {
      faltas: [
        'REASIGNADO',
        'Tres amonestaciones. La Gerencia no despide a nadie: lo reasigna.\n\nEl ascensor se abrió para mí. La aguja marcaba un número que no estaba en el dial.',
      ],
      lurker: ['TE ENCONTRÓ', 'Le di la espalda una sola vez.\n\nEn Punto Nexo no hace falta más.'],
    };
    const [title, text] = texts[reason];
    const scr = this.ui.showScreen(
      `<h2 class="red">${title}</h2>
       <div class="monologue" id="monologue"></div>
       <div class="btns"><button id="btn-retry">Repetir noche ${ROMAN[this.night - 1]}</button><button id="btn-menu">Menú principal</button></div>`
    );
    this.ui.typewrite(scr.querySelector('#monologue'), text);
    scr.querySelector('#btn-retry').onclick = () => {
      this.faltas = Math.min(this.faltasAtStart, 1);
      this.startNight(this.night);
    };
    scr.querySelector('#btn-menu').onclick = () => {
      this.cleanupNight();
      this.showTitle();
    };
  }

  showEnding(accepted) {
    this.state = 'ending';
    this.player.unlock();
    this.ui.showHud(false);
    writeSave(1);
    const endings = {
      true: [
        'EL RELEVO',
        'Le di una llave que no abre ninguna puerta. Él rodeó el mostrador y ocupó mi sitio, como si siempre hubiera estado ahí.\n\nYo entré en el ascensor. La aguja pasó del doce al catorce sin detenerse... y luego volvió atrás.\n\nTrece.\n\nPor primera vez en mucho tiempo, tuve sueño.',
      ],
      false: [
        'EL TURNO ETERNO',
        'Pulsé el botón rojo. Él sonrió como se le sonríe a un niño que todavía no entiende.\n\nCuando la puerta se cerró, empezó a llover otra vez. El reloj marcaba las once.\n\nSonó el teléfono.\n\n—Bienvenido a Punto Nexo, señor Mora. Su turno empieza ahora.',
      ],
    };
    const [title, text] = endings[accepted];
    const scr = this.ui.showScreen(
      `<h2>${title}</h2>
       <div class="monologue" id="monologue"></div>
       <div class="small">Amonestaciones totales: ${this.faltas}</div>
       <div class="btns"><button id="btn-menu">Volver a empezar</button></div>`
    );
    this.ui.typewrite(scr.querySelector('#monologue'), text);
    scr.querySelector('#btn-menu').onclick = () => {
      this.cleanupNight();
      this.faltas = 0;
      this.showTitle();
    };
  }

  // ---------- Huéspedes ----------
  spawnGuest() {
    const spec = this.queue.shift();
    const model = new GuestModel(spec.traits, spec.flags);
    model.root.position.copy(SPOTS.outside);
    model.root.rotation.y = Math.PI;
    model.root.userData.interact = 'guest';
    model.root.traverse((o) => (o.userData.interact = 'guest'));
    if (spec.noReflect) this.lobby.mirrorRegistry.noReflect.add(model.root);
    this.scene.add(model.root);
    const actor = {
      spec,
      model,
      path: [SPOTS.doorway.clone(), SPOTS.desk.clone()],
      speed: spec.isFinal ? 0.9 : 1.15 + this.rng.range(-0.1, 0.15),
      phase: 'enter',
      talkStep: 0,
      docsGiven: false,
      stepAcc: 0,
      onArrive: null,
    };
    actor.onArrive = () => this.arriveAtDesk(actor);
    this.actors.push(actor);
    this.current = actor;
    if (spec.isFinal) {
      this.audio.setMusic(false);
      this.audio.stinger();
    }
  }

  arriveAtDesk(actor) {
    actor.phase = 'wait';
    actor.waitTime = 0;
    if (actor.spec.isFinal) {
      // Desde que llega, tú dejas de reflejarte.
      this.playerBody.root.userData.mirrorActive = false;
    }
    if (this.night === 1 && this.records.length === 0) {
      this.ui.toast('Mira al huésped y pulsa E para hablar con él.');
    }
  }

  removeActor(actor) {
    this.lobby.mirrorRegistry.noReflect.delete(actor.model.root);
    actor.model.dispose();
    actor.removed = true;
  }

  async talk() {
    const a = this.current;
    if (!a || a.phase !== 'wait' || this.talkBusy) return;
    const s = a.spec;
    const lines = a.talkStep === 0 ? [s.lines.greet, s.lines.request, s.lines.handover] : [s.lines.talk[(a.talkStep - 1) % s.lines.talk.length]];
    a.talkStep++;
    this.talkBusy = true;
    const speaker = s.isFinal ? '¿?' : 'Huésped';
    for (const line of lines) {
      if (this.current !== a) break;
      await this.ui.say(speaker, line, {
        eerie: s.isAnomaly && s.glitchy,
        glitch: s.glitchy && Math.random() < 0.5,
        onType: () => (a.model.talking = 0.2),
      });
    }
    this.talkBusy = false;
    if (this.current === a && !a.docsGiven) {
      a.docsGiven = true;
      this.lobby.setDocsVisible(true);
      this.audio.paper();
      if (this.night === 1 && this.records.length === 0) {
        this.ui.toast('Pulsa Q (o E sobre los papeles) para examinar los documentos.', false, 5000);
      }
    }
  }

  decide(accept) {
    const a = this.current;
    if (accept) {
      this.lobby.pressBell();
      this.audio.bell();
    } else {
      this.lobby.pressButton();
      this.audio.buzzer();
    }
    if (!a || a.phase !== 'wait') return;
    if (!a.docsGiven) {
      this.ui.toast('Primero habla con el huésped (E).');
      return;
    }
    this.ui.closePanels();
    this.ui.clearSay();
    this.talkBusy = false;
    this.lobby.setDocsVisible(false);
    this.processed.add(a.spec.slipName);
    this.current = null;

    if (a.spec.isFinal) {
      this.finalDecision(a, accept);
      return;
    }

    const correct = accept ? !a.spec.isAnomaly : a.spec.isAnomaly;
    this.records.push({ spec: a.spec, accept, correct });
    this.spawnTimer = this.rng.range(5, 9);
    this.advanceClock();

    const pool = a.spec.isAnomaly ? (accept ? DATA.ACCEPT_ANOMALY : DATA.EXPEL_ANOMALY) : accept ? DATA.ACCEPT_HUMAN : DATA.EXPEL_HUMAN;
    this.ui.say('Huésped', this.rng.pick(pool), { eerie: a.spec.isAnomaly, onType: () => (a.model.talking = 0.2) });

    if (accept) this.sendToElevator(a);
    else this.sendOut(a);

    if (!correct) {
      this.addFalta(accept ? 'Has dejado entrar a algo que no era un huésped.' : 'Has expulsado a un huésped legítimo.', a, accept);
    }
  }

  addFalta(reason, actor, accepted) {
    this.faltas++;
    this.ui.setFaltas(this.faltas);
    this.after(1.2, () => {
      this.ui.toast(`AMONESTACIÓN — ${reason}`, true, 5000);
      this.audio.stinger();
    });
    if (this.faltas >= DATA.MAX_FALTAS) {
      this.after(4, () => this.gameOver('faltas'));
      return;
    }
    if (!accepted) {
      // El expulsado llama desde fuera.
      this.after(25, () => {
        if (this.state !== 'shift' || this.phone) return;
        this.ringPhone('horror', [
          'Hace frío aquí fuera... No hay calle. No hay ciudad.',
          `Solo la puerta. Y usted detrás. ¿Por qué me echó?`,
        ]);
      });
    }
  }

  sendToElevator(a) {
    a.phase = 'toElevator';
    a.path = [SPOTS.elevatorFront.clone()];
    a.onArrive = () => {
      a.phase = 'waitElevator';
      this.lobby.setElevatorOpen(true);
      this.audio.elevatorDing();
    };
  }

  sendOut(a) {
    if (a.spec.isAnomaly && this.rng.chance(0.5)) {
      // Se desvanece en un apagón.
      a.phase = 'vanish';
      this.after(1.6, () => {
        this.blackout = 0.45;
        this.audio.glitch();
        this.after(0.2, () => {
          if (!a.removed) this.removeActor(a);
          this.actors = this.actors.filter((x) => x !== a);
        });
      });
      return;
    }
    a.phase = 'leaving';
    a.path = [SPOTS.doorway.clone(), SPOTS.outside.clone()];
    a.onArrive = () => {
      this.removeActor(a);
      this.actors = this.actors.filter((x) => x !== a);
    };
  }

  finalDecision(a, accept) {
    this.state = 'finale';
    this.player.canMove = false;
    if (accept) {
      this.ui.say('¿?', 'Gracias, Julián. Ya puedes subir.', { eerie: true });
      this.lobby.setElevatorOpen(true);
      this.audio.elevatorDing();
      this.lobby.setElevatorFloor(13);
    } else {
      this.ui.say('¿?', 'Como quieras. Volveré mañana. Siempre es mañana.', { eerie: true });
      this.sendOut(a);
      this.after(2, () => {
        this.lobby.setRain(true);
        this.audio.setRain(true);
        this.lobby.lightning();
        this.audio.thunder(0.3);
      });
    }
    this.after(4.5, () => {
      this.fadeOut = true;
    });
    this.after(7.5, () => this.showEnding(accept));
  }

  updateActors(dt) {
    let doorNeeded = false;
    const camPos = this.camera.position;
    for (const a of this.actors.slice()) {
      if (a.removed) continue;
      const m = a.model;
      const root = m.root;
      if (a.path && a.path.length) {
        const target = a.path[0];
        _v.subVectors(target, root.position);
        _v.y = 0;
        const dist = _v.length();
        const step = a.speed * dt;
        if (dist <= step) {
          root.position.x = target.x;
          root.position.z = target.z;
          a.path.shift();
          if (!a.path.length) {
            m.speed = 0;
            const cb = a.onArrive;
            a.onArrive = null;
            cb?.();
          }
        } else {
          _v.multiplyScalar(step / dist);
          root.position.add(_v);
          m.speed = a.speed;
          m.faceTowards(target, dt);
          // Pasos (los que flotan no hacen ruido)
          a.stepAcc += step;
          if (a.stepAcc > 0.72) {
            a.stepAcc = 0;
            if (!a.spec.flags.floating) {
              const d = root.position.distanceTo(camPos);
              this.audio.footstep(Math.min(1, 2.2 / (1 + d * 0.35)));
            }
          }
        }
      } else {
        m.speed = 0;
      }

      if (a.phase === 'wait') {
        a.waitTime += dt;
        m.faceTowards(_v2.set(camPos.x, 0, camPos.z), dt, 3);
        m.lookTarget = camPos;
      } else if (a.phase === 'waitElevator') {
        m.faceTowards(SPOTS.elevatorIn, dt, 4);
        if (this.lobby.elevatorOpenAmount() > 0.95) {
          a.phase = 'entering';
          a.path = [SPOTS.elevatorIn.clone()];
          a.onArrive = () => this.guestInElevator(a);
        }
      } else if (a.phase === 'enter' || a.phase === 'leaving') {
        m.lookTarget = a.spec.flags.stare ? camPos : null;
      } else if (a.phase === 'vanish') {
        m.lookTarget = camPos;
      }

      // ¿Alguien cerca de la puerta de entrada?
      if (Math.abs(root.position.x) < 2.5 && root.position.z > 7.5 && root.position.z < 14.5 && (a.phase === 'enter' || a.phase === 'leaving')) {
        doorNeeded = true;
      }
      m.update(dt);
    }
    if (doorNeeded !== this.doorsOpen) {
      this.doorsOpen = doorNeeded;
      this.lobby.setDoorsOpen(doorNeeded);
      if (doorNeeded) this.audio.door();
    }
  }

  guestInElevator(a) {
    a.phase = 'inElevator';
    a.model.root.rotation.y = Math.PI / 2;
    this.after(1.0, () => {
      this.lobby.setElevatorOpen(false);
      this.after(1.4, () => {
        this.removeActor(a);
        this.actors = this.actors.filter((x) => x !== a);
        this.audio.elevatorMotor();
        if (a.spec.isAnomaly) {
          this.lobby.spinElevator(true);
          this.flicker = 1.5;
          this.audio.flickerBuzz();
          this.after(2.5, () => this.lobby.setElevatorFloor(13));
          this.after(this.rng.range(9, 15), () => {
            if (this.state === 'shift') this.spawnLurker(a.spec);
          });
        } else {
          const floor = typeof a.spec.room === 'number' ? Math.floor(a.spec.room / 100) : 1;
          this.lobby.setElevatorFloor(floor);
        }
      });
    });
  }

  // ---------- Presencias (anomalías admitidas) ----------
  spawnLurker(spec) {
    const flags = { ...spec.flags, eyes: spec.flags.eyes === 'three' ? 'three' : 'red', stare: true, noShadow: true };
    const model = new GuestModel({ ...spec.traits, suitcase: false }, flags);
    const camPos = this.camera.position;
    const candidates = SPOTS.lurkers
      .map((p) => ({ p, d: p.distanceTo(camPos), seen: this.isVisible(_v.set(p.x, 1.6, p.z)) }))
      .sort((x, y) => Number(x.seen) - Number(y.seen) || y.d - x.d);
    const spot = candidates[0].p;
    model.root.position.copy(spot);
    model.lookTarget = camPos;
    this.scene.add(model.root);
    this.lurkers.push({ model, stare: 0 });
    this.audio.whisper();
    this.audio.setTension(0.6);
  }

  isVisible(p) {
    _v2.copy(p).project(this.camera);
    return _v2.z < 1 && _v2.z > -1 && Math.abs(_v2.x) < 0.85 && Math.abs(_v2.y) < 0.9;
  }

  updateLurkers(dt) {
    let nearest = Infinity;
    let maxStare = 0;
    const camPos = this.camera.position;
    for (const l of this.lurkers.slice()) {
      const root = l.model.root;
      l.model.head.getWorldPosition(_v);
      const seen = !this.ui.panelOpen && this.isVisible(_v);
      const dx = camPos.x - root.position.x;
      const dz = camPos.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (seen) {
        l.stare += dt;
      } else {
        l.stare = Math.max(0, l.stare - dt * 0.6);
        const speed = 0.38 + this.night * 0.05;
        const step = Math.min(dist, speed * dt);
        if (dist > 0.001) {
          root.position.x += (dx / dist) * step;
          root.position.z += (dz / dist) * step;
        }
      }
      l.model.faceTowards(_v2.set(camPos.x, 0, camPos.z), dt, 10);
      l.model.speed = 0;
      l.model.update(dt);
      maxStare = Math.max(maxStare, seen ? l.stare / 3.2 : 0);
      if (l.stare > 3.2) {
        this.banishLurker(l);
        continue;
      }
      if (dist < 0.95) {
        this.jumpscare(l);
        return;
      }
      nearest = Math.min(nearest, dist);
    }
    this.distort += (maxStare - this.distort) * Math.min(1, dt * 4);
    const level = this.lurkers.length ? THREE.MathUtils.clamp(1 - (nearest - 1.2) / 8, 0, 1) : 0;
    this.audio.updateHeart(level, dt);
    if (!this.lurkers.length) this.audio.setTension(0);
  }

  banishLurker(l) {
    this.lurkers = this.lurkers.filter((x) => x !== l);
    this.blackout = 0.25;
    this.audio.glitch();
    this.after(0.12, () => l.model.dispose());
  }

  jumpscare(l) {
    this.state = 'jumpscare';
    this.ui.closePanels();
    this.ui.clearSay();
    this.player.canMove = false;
    this.player.canLook = false;
    const fwd = this.player.forward(new THREE.Vector3());
    fwd.y = 0;
    fwd.normalize();
    const root = l.model.root;
    root.position.set(this.camera.position.x + fwd.x * 0.55, 0, this.camera.position.z + fwd.z * 0.55);
    const headH = l.model.head.position.y + 0.145;
    root.position.y = this.camera.position.y - headH;
    root.lookAt(this.camera.position.x, root.position.y, this.camera.position.z);
    l.model.update(0.016);
    this.audio.jumpscare();
    this.ui.flash(0.5, 300);
    this.distort = 2.2;
    this.after(1.4, () => {
      for (const x of this.lurkers) x.model.dispose();
      this.lurkers = [];
      this.gameOver('lurker');
    });
  }

  // ---------- Eventos de terror ambiental ----------
  triggerEvent() {
    const n = this.night;
    const options = [];
    if (this.lobby.isRaining()) options.push('lightning', 'lightning');
    options.push('flicker');
    if (n >= 2) options.push('elevator', 'knock', 'writing');
    if (n >= 3) options.push('ghost', 'call');
    if (n >= 4) options.push('flicker', 'ghost');
    const ev = this.rng.pick(options);
    switch (ev) {
      case 'lightning':
        this.lobby.lightning();
        this.audio.thunder(this.rng.range(0.4, 1.6));
        break;
      case 'flicker':
        this.flicker = 1.4;
        this.audio.flickerBuzz();
        break;
      case 'elevator':
        if (this.actors.some((a) => a.phase === 'toElevator' || a.phase === 'waitElevator' || a.phase === 'entering' || a.phase === 'inElevator')) break;
        this.lobby.setElevatorOpen(true);
        this.audio.elevatorDing();
        if (n >= 3 && this.rng.chance(0.5)) this.lobby.setElevatorFloor(13);
        this.after(4, () => {
          if (!this.actors.some((a) => a.phase === 'waitElevator' || a.phase === 'entering' || a.phase === 'inElevator')) this.lobby.setElevatorOpen(false);
        });
        break;
      case 'knock':
        this.audio.knock();
        break;
      case 'writing':
        this.lobby.showMirrorWriting(this.rng.pick(['SAL', 'NO MIRES', 'JULIÁN', 'AYÚDAME', '13', 'DESPIERTA']));
        this.audio.whisper();
        this.after(9, () => this.lobby.hideMirrorWriting());
        break;
      case 'ghost':
        this.spawnMirrorGhost();
        break;
      case 'call':
        if (this.phone) break;
        this.ringPhone('horror', [
          this.rng.pick(['Habitación cero... le está esperando.', 'No mire detrás de usted. Mire el espejo.', 'Cuente los huéspedes que han subido. Ahora cuente los que han bajado.']),
        ]);
        break;
    }
  }

  // Figura que solo existe en el espejo, justo detrás del jugador.
  spawnMirrorGhost() {
    if (this.mirrorGhost) return;
    const ghost = new GuestModel(
      { gender: 'm', height: 1.95, build: 1.0, coat: 0.03, skin: 0.1, hat: 'fedora', glasses: false, mustache: false, hairDark: true, tie: false, suitcase: false },
      { eyes: 'none', noShadow: true, stare: true }
    );
    const fwd = this.player.forward(new THREE.Vector3());
    fwd.y = 0;
    fwd.normalize();
    ghost.root.position.set(this.camera.position.x - fwd.x * 1.1, 0, this.camera.position.z - fwd.z * 1.1);
    ghost.root.lookAt(this.camera.position.x, 0, this.camera.position.z);
    ghost.root.visible = false;
    ghost.root.userData.mirrorActive = true;
    this.lobby.mirrorRegistry.mirrorOnly.add(ghost.root);
    this.scene.add(ghost.root);
    this.mirrorGhost = ghost;
    this.audio.whisper();
    this.after(7, () => {
      if (this.mirrorGhost !== ghost) return;
      this.lobby.mirrorRegistry.mirrorOnly.delete(ghost.root);
      ghost.dispose();
      this.mirrorGhost = null;
    });
  }

  updateLights(dt) {
    const fl = this.lobby.flickerLights;
    if (this.blackout > 0) this.blackout -= dt;
    if (this.flicker > 0) this.flicker -= dt;
    for (const l of fl) {
      let k = 1;
      if (this.blackout > 0) k = 0.02;
      else if (this.flicker > 0) k = Math.random() < 0.45 ? 0.08 : 1;
      l.light.intensity = l.base * k;
      if (l.bulbMat) l.bulbMat.emissiveIntensity = k > 0.5 ? 2.2 : 0.1;
    }
  }

  // ---------- Interacción ----------
  computeTarget() {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const objs = [...this.lobby.interactables];
    if (this.current && !this.current.removed) objs.push(this.current.model.root);
    const hits = this.raycaster.intersectObjects(objs, true);
    for (const h of hits) {
      const kind = h.object.userData.interact;
      if (!kind) continue;
      if (kind === 'docs' && !(this.current && this.current.docsGiven)) continue;
      return kind;
    }
    return null;
  }

  promptFor(kind) {
    const c = this.current;
    const waiting = c && c.phase === 'wait';
    switch (kind) {
      case 'guest':
        return waiting ? ['E', c.talkStep === 0 ? 'Hablar' : 'Seguir hablando'] : null;
      case 'docs':
        return c && c.docsGiven ? ['E', 'Examinar documentos'] : null;
      case 'ledger':
        return ['E', 'Consultar el Libro de Registro'];
      case 'rules':
        return ['E', 'Leer el Reglamento'];
      case 'bell':
        return waiting && c.docsGiven ? ['E', 'Campanilla — ADMITIR'] : ['E', 'Campanilla'];
      case 'expel':
        return waiting && c.docsGiven ? ['E', 'Botón rojo — EXPULSAR'] : ['E', 'Botón rojo'];
      case 'phone':
        return this.phone ? ['E', 'Descolgar'] : null;
      default:
        return null;
    }
  }

  interact(kind) {
    switch (kind) {
      case 'guest':
        this.talk();
        break;
      case 'docs':
        this.openDocs();
        break;
      case 'ledger':
        this.ui.openDocs(null, this.ledger, this.processed, { ledgerOnly: true });
        break;
      case 'rules':
        this.ui.openRules(this.rules, this.night);
        break;
      case 'bell':
        this.decide(true);
        break;
      case 'expel':
        this.decide(false);
        break;
      case 'phone':
        if (this.phone) this.answerPhone();
        break;
    }
  }

  openDocs() {
    const c = this.current;
    if (c && c.docsGiven) this.ui.openDocs(c.spec, this.ledger, this.processed);
    else this.ui.openDocs(null, this.ledger, this.processed, { ledgerOnly: true });
  }

  onKey(e) {
    if (!this.isPlaying()) return;
    if (!this.player.active) return;
    const panel = this.ui.panelOpen;
    switch (e.code) {
      case 'KeyE':
        if (!panel && this.target) this.interact(this.target);
        break;
      case 'KeyQ':
        if (!this.ui.docs.classList.contains('hidden')) this.ui.closeDocs();
        else this.openDocs();
        break;
      case 'KeyR':
        if (!this.ui.rules.classList.contains('hidden')) this.ui.closeRules();
        else this.ui.openRules(this.rules, this.night);
        break;
      case 'Digit1':
      case 'Numpad1':
        if (panel && this.current?.docsGiven) this.decide(true);
        break;
      case 'Digit2':
      case 'Numpad2':
        if (panel && this.current?.docsGiven) this.decide(false);
        break;
    }
  }

  // ---------- Bucle ----------
  update(dt) {
    // Cámara de título: deriva lenta por el vestíbulo.
    if (this.state === 'title') {
      this.titleTime += dt;
      this.player.position.set(Math.sin(this.titleTime * 0.05) * 2, 0, -7.5);
      this.player.yaw = Math.PI + Math.sin(this.titleTime * 0.07) * 0.5;
      this.player.pitch = -0.02;
      this.player.update(0);
      this.lobby.setClock(23 + this.titleTime / 60);
      return;
    }
    if (this.paused) return;

    const playing = this.state === 'phone' || this.state === 'shift' || this.state === 'finale';
    this.player.canMove = playing && this.state !== 'finale' && !this.ui.panelOpen;
    this.player.canLook = this.state !== 'jumpscare' && !this.ui.panelOpen;
    this.player.update(dt);

    for (const t of this.timers.slice()) {
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(this.timers.indexOf(t), 1);
        t.fn();
      }
    }

    if (playing || this.state === 'jumpscare') {
      this.updateActors(dt);
      this.updateLights(dt);
    }

    if (this.state === 'shift') {
      if (!this.current) {
        if (this.queue.length) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) this.spawnGuest();
        } else if (!this.endScheduled && this.actors.length === 0) {
          this.endScheduled = true;
          this.after(3, () => {
            if (this.state === 'shift') this.endNight();
          });
        }
      }
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.triggerEvent();
        this.eventTimer = this.rng.range(16, 36) * (1 - (this.night - 1) * 0.1);
      }
      this.updateLurkers(dt);
    }

    if (this.phone) {
      this.phone.ringTime += dt;
      if (this.phone.kind === 'horror' && this.phone.ringTime > 14) {
        this.phone = null;
        this.lobby.setPhoneRinging(false);
        this.audio.phoneRing(false);
      } else if (this.phone.kind === 'gerencia' && this.phone.ringTime > 7 && !this.phone.hinted) {
        this.phone.hinted = true;
        this.ui.toast('El teléfono del mostrador está sonando. Míralo y pulsa E.');
      }
    }

    // Reloj
    if (this.hoursTarget !== undefined) this.hours += (this.hoursTarget - this.hours) * Math.min(1, dt * 0.5);
    this.lobby.setClock(this.hours);
    this.ui.setStatus(this.night, (this.hours + 24) % 24);

    // Mirada / interacción
    if (playing && !this.ui.panelOpen && this.state !== 'finale') {
      const kind = this.computeTarget();
      const p = kind ? this.promptFor(kind) : null;
      this.target = p ? kind : null;
      if (p) this.ui.setPrompt(p[0], p[1]);
      else this.ui.setPrompt(null);
    } else {
      this.ui.setPrompt(null);
      this.target = null;
    }

    // Efectos de pantalla
    if (this.state !== 'jumpscare') this.distort = Math.min(this.distort, 2);
    else this.distort = Math.max(0, this.distort - dt * 0.5);
    if (this.fadeOut) this.darkness = Math.min(1, this.darkness + dt * 0.4);
    else this.darkness = Math.max(0, this.darkness - dt);
    this.fx.uniforms.distort.value = this.distort;
    this.fx.uniforms.darkness.value = this.darkness;
  }
}
