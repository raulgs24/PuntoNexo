import {
  FIRST_NAMES,
  SURNAMES,
  CITIES,
  PROFESSIONS,
  MONTHS,
  GREETINGS,
  HANDOVER,
  SMALL_TALK,
  RED_HERRINGS,
  ANOMALY_TALK,
  NIGHT_GUESTS,
  NIGHT_ANOMALY_RATE,
  PLAYER_NAME,
  PLAYER_FIRST,
} from './data.js';
import { ANOMALIES, anomaliesForNight } from './anomalies.js';

const LETTER_SWAPS = { b: 'v', v: 'b', s: 'z', z: 's', n: 'm', m: 'n', a: 'o', o: 'a', e: 'i', i: 'e', d: 't', t: 'd', g: 'j', j: 'g', l: 'r', r: 'l', c: 'q' };

function daysIn(month, year) {
  if (month === 1) return 28; // evitamos el 29 de febrero para no confundir
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

export function formatDate(d) {
  return `${d.day} de ${MONTHS[d.month]} de ${d.year}`;
}

function validDate(rng, minYear, maxYear) {
  const year = rng.int(minYear, maxYear);
  const month = rng.int(0, 11);
  return { day: rng.int(1, daysIn(month, year)), month, year };
}

function impossibleDate(rng) {
  const year = rng.int(1860, 1990);
  const options = [
    { day: 30, month: 1 },
    { day: 31, month: 1 },
    { day: 31, month: 3 },
    { day: 31, month: 5 },
    { day: 31, month: 8 },
    { day: 31, month: 10 },
    { day: 32, month: rng.int(0, 11) },
  ];
  return { ...rng.pick(options), year };
}

// Cambia una sola letra del nombre: "Montalbán" -> "Montalván".
export function mutateName(name, rng) {
  const words = name.split(' ');
  const wi = rng.chance(0.7) ? words.length - 1 : 0;
  const w = words[wi];
  const candidates = [];
  for (let i = 1; i < w.length; i++) if (LETTER_SWAPS[w[i]]) candidates.push(i);
  let out;
  if (candidates.length) {
    const i = rng.pick(candidates);
    out = w.slice(0, i) + LETTER_SWAPS[w[i]] + w.slice(i + 1);
  } else {
    const i = Math.max(1, Math.min(w.length - 2, rng.int(1, w.length - 2)));
    out = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
  }
  words[wi] = out;
  return words.join(' ');
}

function randomRoom(rng) {
  const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
  return rng.pick(floors) * 100 + rng.int(1, 30);
}

function randomTraits(rng, gender) {
  const m = gender === 'm';
  return {
    gender,
    height: m ? rng.range(1.7, 1.88) : rng.range(1.6, 1.75),
    build: m ? rng.range(1.0, 1.15) : rng.range(0.86, 0.98),
    coat: rng.range(0.08, 0.48),
    skin: rng.range(0.55, 0.85),
    hat: m ? rng.pick(['fedora', 'fedora', 'bowler', 'none']) : rng.pick(['cloche', 'none', 'cloche', 'bowler']),
    glasses: rng.chance(0.3),
    mustache: m && rng.chance(0.4),
    hairDark: rng.chance(0.7),
    tie: m && rng.chance(0.35),
    suitcase: rng.chance(0.7),
  };
}

// Alteración de la foto: un único rasgo distinto.
function mutatePhoto(traits, rng) {
  const photo = { ...traits };
  const options = ['glasses', 'hat'];
  if (traits.gender === 'm') options.push('mustache');
  const which = rng.pick(options);
  if (which === 'glasses') photo.glasses = !traits.glasses;
  else if (which === 'mustache') photo.mustache = !traits.mustache;
  else {
    const hats = traits.gender === 'm' ? ['fedora', 'bowler', 'none'] : ['cloche', 'bowler', 'none'];
    photo.hat = rng.pick(hats.filter((h) => h !== traits.hat));
  }
  return photo;
}

function makeGuest(rng, used, anomalies, night) {
  const gender = rng.chance(0.5) ? 'm' : 'f';
  let name;
  do {
    name = `${rng.pick(FIRST_NAMES[gender])} ${rng.pick(SURNAMES)}`;
  } while (used.has(name));
  used.add(name);

  const traits = randomTraits(rng, gender);
  const profession = rng.pick(PROFESSIONS)[gender === 'm' ? 0 : 1];
  const g = {
    name,
    slipName: name,
    idName: name,
    gender,
    traits,
    photoTraits: { ...traits },
    flags: {},
    noReflect: false,
    inLedger: true,
    birth: validDate(rng, 1850, 1995),
    death: null,
    city: rng.pick(CITIES),
    profession,
    room: randomRoom(rng),
    nights: rng.int(1, 7),
    docNumber: `PN-${rng.int(100000, 999999)}`,
    slipNumber: rng.int(1000, 9999),
    stamp: true,
    knowsName: false,
    anomalies,
    isAnomaly: anomalies.length > 0,
  };

  for (const id of anomalies) {
    switch (id) {
      case 'no_reservation':
        g.inLedger = false;
        break;
      case 'name_mismatch':
        g.idName = mutateName(name, rng);
        break;
      case 'no_shadow':
        g.flags.noShadow = true;
        break;
      case 'impossible_date':
        g.birth = impossibleDate(rng);
        break;
      case 'no_reflection':
        g.noReflect = true;
        break;
      case 'deceased': {
        const y = Math.min(g.birth.year + rng.int(25, 80), 2020);
        const month = rng.int(0, 11);
        g.death = { day: rng.int(1, daysIn(month, y)), month, year: y };
        break;
      }
      case 'photo_mismatch':
        g.photoTraits = mutatePhoto(traits, rng);
        break;
      case 'floor13':
        g.room = 1300 + rng.int(1, 30);
        break;
      case 'stare':
        g.flags.stare = true;
        break;
      case 'eyes':
        g.flags.eyes = rng.pick(['red', 'three', 'none']);
        break;
      case 'floating':
        g.flags.floating = true;
        break;
      case 'proportions':
        if (rng.chance(0.5)) g.flags.longArms = true;
        else g.flags.longNeck = true;
        break;
      case 'knows_name':
        g.knowsName = true;
        break;
      case 'missing_stamp':
        g.stamp = false;
        break;
    }
  }

  // Diálogo
  const greet = g.knowsName ? `Buenas noches, ${PLAYER_FIRST}.` : rng.pick(GREETINGS);
  const request = rng.chance(0.5)
    ? `Tengo una reserva a nombre de ${g.slipName}.`
    : `Reserva a nombre de ${g.slipName}. Habitación ${g.room}.`;
  const talk = [];
  if (g.isAnomaly) {
    for (const id of anomalies) if (ANOMALIES[id].line && rng.chance(0.6)) talk.push(ANOMALIES[id].line);
    talk.push(...rng.shuffle(ANOMALY_TALK).slice(0, 1));
    talk.push(...rng.shuffle(SMALL_TALK).slice(0, 2));
    if (g.knowsName && rng.chance(0.5)) talk.push(`Le veo cansado, ${PLAYER_FIRST}.`);
  } else {
    talk.push(...rng.shuffle(SMALL_TALK).slice(0, 2));
    if (rng.chance(0.35)) talk.push(rng.pick(RED_HERRINGS));
  }
  g.lines = { greet, request, handover: rng.pick(HANDOVER), talk: rng.shuffle(talk) };
  // Algunas anomalías hablan con interferencias.
  g.glitchy = g.isAnomaly && rng.chance(0.3 + night * 0.05);
  return g;
}

function finalGuest() {
  return {
    name: PLAYER_NAME,
    slipName: PLAYER_NAME,
    idName: PLAYER_NAME,
    gender: 'm',
    traits: {
      gender: 'm',
      height: 1.76,
      build: 1.02,
      coat: 0.3,
      skin: 0.72,
      hat: 'none',
      glasses: false,
      mustache: false,
      hairDark: true,
      tie: false,
      suitcase: false,
      bellhop: true,
    },
    photoTraits: null,
    flags: { stare: true },
    noReflect: false,
    inLedger: true,
    ledgerNote: 'relevo',
    birth: { day: 11, month: 10, year: 1911 },
    death: null,
    city: 'Hotel Punto Nexo',
    profession: 'Botones',
    room: '—',
    nights: '∞',
    docNumber: 'PN-000001',
    slipNumber: 1,
    stamp: true,
    knowsName: true,
    anomalies: [],
    isAnomaly: false,
    isFinal: true,
    glitchy: false,
    lines: {
      greet: `Buenas noches, ${PLAYER_FIRST}.`,
      request: 'No vengo a alojarme. Vengo a relevarte.',
      handover: 'Mira mis papeles. Son los tuyos.',
      talk: [
        '¿Cuánto tiempo llevas detrás de ese mostrador? Piénsalo bien.',
        'Mira el espejo. Mírate.',
        'Tú también llegaste así una noche. Con la lluvia.',
        'Si me das la llave, podrás subir. Si me echas, seguirás aquí. Siempre.',
      ],
    },
  };
}

export function generateNight(night, rng) {
  const count = NIGHT_GUESTS[night - 1];
  const rate = NIGHT_ANOMALY_RATE[night - 1];
  const pool = anomaliesForNight(night);
  const fresh = pool.filter((id) => ANOMALIES[id].night === night);

  // Quién es anomalía: al menos uno de cada tipo, y la primera visita de la noche 1 es humana.
  let flagsArr;
  do {
    flagsArr = Array.from({ length: count }, () => rng.chance(rate));
    if (night === 1) flagsArr[0] = false;
  } while (!flagsArr.some(Boolean) || flagsArr.every(Boolean) || flagsArr.filter(Boolean).length < Math.min(fresh.length, 3));

  // Las anomalías nuevas de esta noche aparecen al menos una vez.
  const queue = rng.shuffle(fresh);
  const used = new Set();
  const guests = flagsArr.map((isAnom) => {
    let anomalies = [];
    if (isAnom) {
      const first = queue.length ? queue.shift() : rng.pick(pool);
      anomalies = [first];
      if (night >= 4 && rng.chance(0.2)) {
        const second = rng.pick(pool.filter((id) => id !== first));
        anomalies.push(second);
      }
    }
    return makeGuest(rng, used, anomalies, night);
  });

  // Libro de registro: huéspedes con reserva + algunos que no llegarán nunca.
  const ledger = guests.filter((g) => g.inLedger).map((g) => ({ name: g.slipName, room: g.room }));
  const decoys = rng.int(2, 3);
  for (let i = 0; i < decoys; i++) {
    const gender = rng.chance(0.5) ? 'm' : 'f';
    let name;
    do {
      name = `${rng.pick(FIRST_NAMES[gender])} ${rng.pick(SURNAMES)}`;
    } while (used.has(name));
    used.add(name);
    ledger.push({ name, room: randomRoom(rng) });
  }

  if (night === 5) {
    const fg = finalGuest();
    guests.push(fg);
    ledger.push({ name: 'J. Mora', room: '—', note: 'relevo', staff: true });
  }

  const surname = (n) => n.split(' ').slice(1).join(' ') || n;
  ledger.sort((a, b) => surname(a.name).localeCompare(surname(b.name), 'es'));

  return { guests, ledger };
}
