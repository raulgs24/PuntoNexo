import { drawPortrait } from '../game/portrait.js';
import { formatDate } from '../game/guestFactory.js';
import { MAX_FALTAS } from '../game/data.js';

const $ = (id) => document.getElementById(id);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Sustituye letras al azar por bloques: voz con interferencias.
export function glitchText(text, amount = 0.12) {
  const glyphs = '█▓▒░#%&@';
  return text
    .split('')
    .map((ch) => (ch !== ' ' && Math.random() < amount ? glyphs[(Math.random() * glyphs.length) | 0] : ch))
    .join('');
}

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.hud = $('hud');
    this.prompt = $('prompt');
    this.crosshair = $('crosshair');
    this.toastEl = $('toast');
    this.subtitle = $('subtitle');
    this.subSpeaker = this.subtitle.querySelector('.speaker');
    this.subText = this.subtitle.querySelector('.text');
    this.docs = $('docs');
    this.rules = $('rules');
    this.screen = $('screen');
    this.flashEl = $('flash');
    this.sayQueue = [];
    this.saying = null;
    this.toastTimer = null;
    this.lastPrompt = null;
  }

  get panelOpen() {
    return !this.docs.classList.contains('hidden') || !this.rules.classList.contains('hidden');
  }

  get screenOpen() {
    return !this.screen.classList.contains('hidden');
  }

  showHud(on) {
    this.hud.classList.toggle('hidden', !on);
  }

  setStatus(night, hours) {
    $('status-night').textContent = `NOCHE ${ROMAN[night - 1] || night}`;
    const h = Math.floor(hours) % 24;
    const m = Math.floor((hours % 1) * 60);
    $('status-time').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  setFaltas(n) {
    let html = '<span>AMONESTACIONES</span>';
    for (let i = 0; i < MAX_FALTAS; i++) html += `<span class="mark ${i < n ? 'on' : ''}">${i < n ? '✕' : ''}</span>`;
    $('faltas').innerHTML = html;
  }

  setPrompt(key, text) {
    const id = key ? `${key}|${text}` : null;
    if (id === this.lastPrompt) return;
    this.lastPrompt = id;
    this.prompt.innerHTML = key ? `<kbd>${esc(key)}</kbd>${esc(text)}` : '';
    this.crosshair.classList.toggle('active', !!key);
  }

  toast(text, bad = false, ms = 3500) {
    this.toastEl.textContent = text;
    this.toastEl.classList.toggle('bad', bad);
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // Subtítulos con efecto máquina de escribir. Devuelve una promesa al terminar de mostrarse.
  say(speaker, text, { gerencia = false, eerie = false, glitch = false, hold = null, onType = null } = {}) {
    return new Promise((resolve) => {
      this.sayQueue.push({ speaker, text, gerencia, eerie, glitch, hold, onType, resolve });
      if (!this.saying) this.nextSay();
    });
  }

  clearSay() {
    for (const q of this.sayQueue) q.resolve();
    this.sayQueue = [];
    if (this.saying) {
      clearInterval(this.saying.timer);
      clearTimeout(this.saying.hideTimer);
      this.saying.resolve();
      this.saying = null;
    }
    this.subtitle.classList.remove('show');
  }

  nextSay() {
    const item = this.sayQueue.shift();
    if (!item) {
      this.saying = null;
      this.subtitle.classList.remove('show');
      return;
    }
    this.saying = item;
    this.subSpeaker.textContent = item.speaker;
    this.subtitle.classList.toggle('gerencia', item.gerencia);
    this.subtitle.classList.add('show');
    const full = item.text;
    let i = 0;
    this.subText.textContent = '';
    item.timer = setInterval(() => {
      i += 1;
      const shown = full.slice(0, i);
      this.subText.textContent = item.glitch ? glitchText(shown, 0.08) : shown;
      if (i % 2 === 0) {
        if (item.gerencia) this.audio.phoneStatic(0.05);
        else this.audio.voiceBlip(1, item.eerie);
        if (item.onType) item.onType();
      }
      if (i >= full.length) {
        clearInterval(item.timer);
        if (item.glitch) this.subText.textContent = glitchText(full, 0.06);
        const hold = item.hold ?? Math.min(4200, 1400 + full.length * 35);
        item.hideTimer = setTimeout(() => {
          item.resolve();
          this.nextSay();
        }, hold);
      }
    }, 28);
  }

  // ---------- Documentos ----------
  openDocs(guest, ledger, processed, { ledgerOnly = false } = {}) {
    this.closeRules();
    const parts = [];
    if (guest && !ledgerOnly) {
      const deathTxt = guest.death ? formatDate(guest.death) : '—';
      parts.push(`
        <div class="paper card-id">
          <h3>CÉDULA DE IDENTIDAD</h3>
          <div class="sub">VÁLIDA EN TODAS LAS ÉPOCAS · Nº ${esc(guest.docNumber)}</div>
          <div class="body">
            <canvas id="doc-photo"></canvas>
            <div>
              <div class="field">Nombre</div><div class="value">${esc(guest.idName)}</div>
              <div class="field">Nacimiento</div><div class="value">${esc(formatDate(guest.birth))}</div>
              <div class="field">Defunción</div><div class="value">${esc(deathTxt)}</div>
              <div class="field">Procedencia</div><div class="value">${esc(guest.city)}</div>
              <div class="field">Profesión</div><div class="value">${esc(guest.profession)}</div>
            </div>
          </div>
          ${guest.stamp ? '<div class="stamp">HOTEL<br>PUNTO NEXO<br>✦ VISADO ✦</div>' : ''}
        </div>`);
      parts.push(`
        <div class="paper slip">
          <h3>HOTEL PUNTO NEXO</h3>
          <div class="sub">RESGUARDO DE RESERVA Nº ${esc(guest.slipNumber)}</div>
          <div class="field">Huésped</div><div class="value">${esc(guest.slipName)}</div>
          <div class="field">Habitación</div>
          <div class="room">${esc(guest.room)}</div>
          <div class="field">Noches</div><div class="value">${esc(guest.nights)}</div>
        </div>`);
    }
    const items = ledger
      .map((e) => {
        const done = processed.has(e.name) ? 'done' : '';
        const staff = e.staff ? 'staff' : '';
        return `<li class="${done} ${staff}"><span>${esc(e.name)}</span><span>${esc(e.note || e.room)}</span></li>`;
      })
      .join('');
    parts.push(`
      <div class="paper ledger">
        <h3>LIBRO DE REGISTRO</h3>
        <div class="sub">RESERVAS DE ESTA NOCHE</div>
        <ol>${items}</ol>
      </div>`);
    const hint = guest && !ledgerOnly
      ? '<div class="hint"><kbd>Q</kbd>cerrar<kbd>1</kbd>campanilla (aceptar)<kbd>2</kbd>botón rojo (expulsar)<kbd>R</kbd>reglamento</div>'
      : '<div class="hint"><kbd>Q</kbd>cerrar<kbd>R</kbd>reglamento</div>';
    this.docs.innerHTML = parts.join('') + hint;
    this.docs.classList.remove('hidden');
    if (guest && !ledgerOnly) {
      const canvas = document.getElementById('doc-photo');
      drawPortrait(canvas, guest.photoTraits || guest.traits, guest.slipNumber);
    }
    this.audio.paper();
  }

  closeDocs() {
    if (!this.docs.classList.contains('hidden')) this.audio.paper();
    this.docs.classList.add('hidden');
  }

  openRules(rules, night) {
    this.closeDocs();
    const items = rules.map((r) => `<li class="${r.isNew ? 'new' : ''}">${esc(r.text)}</li>`).join('');
    this.rules.innerHTML = `
      <div class="paper rules-sheet">
        <h3>REGLAMENTO DEL TURNO DE NOCHE</h3>
        <div class="sub" style="text-align:center;font-size:11px;letter-spacing:.15em;color:#4b443a">REVISIÓN ${ROMAN[night - 1]} · DE OBLIGADO CUMPLIMIENTO</div>
        <ol>${items}</ol>
        <div class="footer">— La Gerencia</div>
      </div>
      <div class="hint"><kbd>R</kbd>cerrar<kbd>Q</kbd>documentos</div>`;
    this.rules.classList.remove('hidden');
    this.audio.paper();
  }

  closeRules() {
    if (!this.rules.classList.contains('hidden')) this.audio.paper();
    this.rules.classList.add('hidden');
  }

  closePanels() {
    this.docs.classList.add('hidden');
    this.rules.classList.add('hidden');
  }

  // ---------- Pantallas ----------
  showScreen(html, { seeThrough = false } = {}) {
    this.closePanels();
    this.screen.innerHTML = html;
    this.screen.classList.toggle('see-through', seeThrough);
    this.screen.classList.remove('hidden');
    return this.screen;
  }

  hideScreen() {
    this.screen.classList.add('hidden');
    this.screen.innerHTML = '';
  }

  // Monólogo a máquina de escribir dentro de una pantalla.
  typewrite(el, text, speed = 32) {
    return new Promise((resolve) => {
      let i = 0;
      el.textContent = '';
      const skip = () => {
        i = text.length;
      };
      el.closest('.screen')?.addEventListener('click', skip, { once: true });
      const timer = setInterval(() => {
        i += 1;
        el.textContent = text.slice(0, i);
        if (i % 3 === 0 && text[i - 1] !== ' ') this.audio.type();
        if (i >= text.length) {
          el.textContent = text;
          clearInterval(timer);
          resolve();
        }
      }, speed);
    });
  }

  flash(strength = 1, ms = 140) {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.opacity = String(strength);
    requestAnimationFrame(() => {
      this.flashEl.style.transition = `opacity ${ms}ms ease-out`;
      this.flashEl.style.opacity = '0';
    });
  }
}
