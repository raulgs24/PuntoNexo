// Juego mental del pasillo.
// Los humanos solo piden cortesías (no hay forma de fallar con ellos).
// Las anomalías se ganan tu confianza con una cortesía y luego intentan que rompas una norma del pasillo.
// Si cedes ante una anomalía, te atrapa. Si te niegas, insiste con más presión.

import { PLAYER_NAME } from './data.js';

export const COURTESY = [
  {
    id: 'suitcase',
    ask: '¿Le importaría llevarme la maleta? Pesa como un muerto.',
    comply: 'Claro, démela.',
    refuse: 'Lo siento, no puedo cargar equipaje.',
    thanks: 'Es usted un sol.',
    snub: 'Ya veo. La llevaré yo.',
  },
  {
    id: 'breakfast',
    ask: '¿A qué hora sirven el desayuno?',
    comply: 'De siete a diez, en el comedor.',
    refuse: 'No sabría decirle.',
    thanks: 'Perfecto. Bajaré temprano.',
    snub: 'Vaya servicio.',
  },
  {
    id: 'slow',
    ask: 'Vaya más despacio, por favor. Tengo las piernas cansadas.',
    comply: 'Por supuesto, sin prisa.',
    refuse: 'Debo volver pronto al mostrador.',
    thanks: 'Gracias. Este pasillo no se acaba nunca.',
    snub: 'Qué prisas...',
  },
  {
    id: 'wake',
    ask: '¿Podrían despertarme mañana a las ocho?',
    comply: 'Le llamaremos a las ocho en punto.',
    refuse: 'Me temo que no hacemos eso.',
    thanks: 'Se lo agradezco. Si es que amanece.',
    snub: 'Bueno, ya me despertaré solo.',
  },
  {
    id: 'chat',
    ask: 'Cuénteme algo del hotel. El silencio me pone nervioso.',
    comply: 'Dicen que nunca ha cerrado. Ni un solo día.',
    refuse: 'Prefiero no hablar en los pasillos.',
    thanks: 'Nunca... Qué curioso. Yo tampoco recuerdo haberlo visto cerrado.',
    snub: 'Como quiera.',
  },
  {
    id: 'umbrella',
    ask: '¿Me guardaría el paraguas en recepción?',
    comply: 'Lo dejaré en el paragüero.',
    refuse: 'No puedo hacerme cargo.',
    thanks: 'Muy amable. Gotea un poco, perdone.',
    snub: 'Pues lo dejaré en la habitación.',
  },
];

// rule: índice de la norma del pasillo que rompe aceptar.
export const FORBIDDEN = [
  {
    id: 'lights',
    ask: 'Apague esa lámpara, se lo ruego. La luz me quema los ojos.',
    comply: 'La apago.',
    complyAlt: ['Bueno... solo esa.', 'Está bien, está bien. La apago.'],
    refuse: 'Las luces del pasillo no se apagan.',
    persuade: ['Solo esa. Solo un momento. Nadie lo sabrá.', 'Me está haciendo daño. ¿Es que le gusta verme sufrir?'],
    giveUp: 'Algún día se fundirán todas. Y yo estaré aquí.',
    effect: 'flicker',
  },
  {
    id: 'name',
    ask: 'Aún no me ha dicho su nombre. ¿Cómo se llama?',
    comply: `${PLAYER_NAME}.`,
    complyAlt: ['Julián. Me llamo Julián.', `${PLAYER_NAME}. Ya está.`],
    refuse: 'Solo soy el botones.',
    persuade: ['Vamos, no sea tímido. Un nombre no es nada.', 'Yo le he dicho el mío. Es de mala educación callarse.'],
    giveUp: 'No importa. Ya lo averiguaré. Siempre lo averiguo.',
    humanToo: true,
    humanReply: 'Encantado. Bonito nombre.',
    humanRefused: 'Qué misterioso. Me gusta.',
  },
  {
    id: 'lookback',
    ask: 'No se asuste... pero alguien nos sigue. ¿No lo oye? Mire atrás.',
    comply: 'Me doy la vuelta.',
    complyAlt: ['...Está bien, miro.', 'Miro. Solo un segundo.'],
    refuse: 'Sigo mirando al frente.',
    persuade: ['Está justo detrás de usted. Mire. ¡Mire!', 'Si no mira, le alcanzará. Créame. Míreme a mí y luego mire atrás.'],
    giveUp: 'Qué disciplina. Ya no queda gente así.',
    physical: true,
  },
  {
    id: 'hand',
    ask: 'Deme la mano, por favor. Tengo tanto frío...',
    comply: 'Le doy la mano.',
    complyAlt: ['Solo hasta la puerta.', 'Está bien. Tome.'],
    refuse: 'No puedo tocar a los huéspedes.',
    persuade: ['Solo un momento. Hasta la puerta.', 'Toque mi mano. Está helada, ¿ve? Igual que la suya.'],
    giveUp: 'Algún día tendrá frío usted también.',
  },
  {
    id: 'floor13',
    ask: 'Me he equivocado de planta. Lléveme a la trece, por favor.',
    comply: 'Volvamos al ascensor.',
    complyAlt: ['De acuerdo, subimos.', 'Solo un momento. A la trece.'],
    refuse: 'Esa planta no existe.',
    persuade: ['Claro que existe. Usted ha estado allí. ¿No se acuerda?', 'Le estarán esperando. Todos le esperan, Julián.'],
    giveUp: 'Ya subirá. Todos suben al final.',
  },
];

export const DOOR_TRAPS = [
  {
    id: 'enter',
    ask: 'Entre usted primero, por favor. Compruebe que no hay nadie dentro.',
    comply: 'Está bien, entro a mirar.',
    complyAlt: ['Bueno... solo un vistazo.', 'De acuerdo. Usted gana.'],
    refuse: 'No entro en las habitaciones de los huéspedes.',
    persuade: ['Por favor... tengo miedo. Solo un vistazo.', '¿Qué clase de botones deja a un huésped a solas con lo que hay ahí dentro?'],
    giveUp: 'Como quiera. Entraré yo. Y le estaré esperando.',
  },
  {
    id: 'stay',
    ask: 'No quiero pasar la noche a solas. Quédese conmigo, aunque sea un rato.',
    comply: 'Me quedaré un momento.',
    complyAlt: ['Solo hasta que se duerma.', 'Está bien. Me quedo.'],
    refuse: 'Debo volver al mostrador.',
    persuade: ['Solo hasta que me duerma. Se lo suplico.', 'Allí abajo nadie le echará de menos. Nadie. ¿Lo sabe, verdad?'],
    giveUp: 'Váyase, entonces. La puerta seguirá aquí.',
  },
];

const FAREWELL_HUMAN = ['Gracias por acompañarme. Buenas noches.', 'Aquí es. Muchas gracias, de verdad.', 'Por fin. Gracias, botones.'];
const FAREWELL_ANOMALY = ['Buenas noches... Julián.', 'Hasta pronto. Muy pronto.', 'Gracias. Ahora ya sé dónde está el mostrador.'];

// Construye las tres paradas del recorrido: dos en el pasillo y una en la puerta.
export function buildSteps(spec, rng) {
  const courtesy = rng.shuffle(COURTESY);
  if (!spec.isAnomaly) {
    const steps = [{ kind: 'courtesy', ...courtesy[0] }];
    if (rng.chance(0.4)) steps.push({ kind: 'forbidden', ...FORBIDDEN.find((f) => f.id === 'name') });
    else steps.push({ kind: 'courtesy', ...courtesy[1] });
    steps.push({ kind: 'courtesy', ...courtesy[2] });
    return { steps, farewell: rng.pick(FAREWELL_HUMAN) };
  }
  const trap = rng.pick(FORBIDDEN);
  return {
    steps: [{ kind: 'courtesy', ...courtesy[0] }, { kind: 'forbidden', ...trap }, { kind: 'forbidden', ...rng.pick(DOOR_TRAPS) }],
    farewell: rng.pick(FAREWELL_ANOMALY),
  };
}
