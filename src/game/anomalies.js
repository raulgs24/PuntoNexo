// Catálogo de anomalías. Cada una entra en juego la noche indicada y añade una norma al Reglamento.
// kind: 'doc' (se detecta en los papeles), 'visual' (se detecta mirando al huésped), 'voice' (en lo que dice).

export const ANOMALIES = {
  no_reservation: {
    check: 'Figura en el Libro de Registro',
    where: 'Libro',
    night: 1,
    kind: 'doc',
    rule: 'Solo se admite a quien figure en el LIBRO DE REGISTRO de esta noche.',
    explain: 'No figuraba en el Libro de Registro.',
  },
  name_mismatch: {
    check: 'Nombre igual en cédula y resguardo',
    where: 'Papeles',
    night: 1,
    kind: 'doc',
    rule: 'El nombre de la CÉDULA debe coincidir, letra por letra, con el del RESGUARDO de reserva.',
    explain: 'El nombre de la cédula no coincidía con el del resguardo.',
  },
  no_shadow: {
    check: 'Proyecta sombra sobre el mostrador',
    where: 'Mostrador',
    night: 1,
    kind: 'visual',
    rule: 'Todo huésped proyecta SOMBRA: bajo la lámpara colgante, su silueta cae sobre el mostrador.',
    explain: 'No proyectaba sombra.',
    line: 'Prefiero la penumbra, si no le importa.',
  },
  impossible_date: {
    check: 'Fecha de nacimiento posible',
    where: 'Cédula',
    night: 2,
    kind: 'doc',
    rule: 'La FECHA DE NACIMIENTO debe existir en el calendario. Ningún mes tiene más días de los que le corresponden.',
    explain: 'Su fecha de nacimiento no existe.',
  },
  no_reflection: {
    check: 'Se refleja en el espejo',
    where: 'Espejo',
    night: 2,
    kind: 'visual',
    rule: 'Todo huésped se refleja en el ESPEJO del vestíbulo.',
    explain: 'No tenía reflejo.',
    line: 'Ese espejo... ¿no podrían taparlo?',
  },
  deceased: {
    check: 'Campo DEFUNCIÓN vacío',
    where: 'Cédula',
    night: 2,
    kind: 'doc',
    rule: 'El campo DEFUNCIÓN de la cédula debe estar vacío. No alojamos difuntos.',
    explain: 'Su cédula tenía fecha de defunción.',
    line: 'Hacía mucho que no me sentía tan... despierto.',
  },
  photo_mismatch: {
    check: 'La foto coincide con su cara',
    where: 'Cédula',
    night: 3,
    kind: 'doc',
    rule: 'La FOTOGRAFÍA debe corresponder al huésped: sombrero, gafas, bigote y peinado.',
    explain: 'La fotografía no se correspondía con su cara.',
  },
  floor13: {
    check: 'Habitación existente (no 13xx)',
    where: 'Resguardo',
    night: 3,
    kind: 'doc',
    rule: 'El hotel no tiene PLANTA 13. Las habitaciones del 1300 al 1399 no existen.',
    explain: 'Pidió una habitación de la planta 13.',
  },
  stare: {
    check: 'Parpadea',
    where: 'Cara',
    night: 3,
    kind: 'visual',
    rule: 'Los huéspedes PARPADEAN. Quien no parpadea no duerme, y quien no duerme no necesita habitación.',
    explain: 'No parpadeaba.',
    line: 'No aparte la mirada.',
  },
  eyes: {
    check: 'Dos ojos, sin luz propia',
    where: 'Cara',
    night: 4,
    kind: 'visual',
    rule: 'Dos OJOS: ni uno más, ni uno menos. Y sin luz propia.',
    explain: 'Sus ojos no eran humanos.',
    line: 'La luz me molesta en los ojos.',
  },
  floating: {
    check: 'Pisa el suelo, se oyen sus pasos',
    where: 'Pasos',
    night: 4,
    kind: 'visual',
    rule: 'Los pies en el SUELO. Todo huésped hace ruido al caminar.',
    explain: 'No tocaba el suelo.',
    line: 'Disculpe, no he hecho ruido al entrar. Nunca lo hago.',
  },
  proportions: {
    check: 'Brazos y cuello normales',
    where: 'Cuerpo',
    night: 4,
    kind: 'visual',
    rule: 'Proporciones HUMANAS: brazos y cuello de longitud normal.',
    explain: 'Su cuerpo no tenía proporciones humanas.',
  },
  knows_name: {
    check: 'No conoce mi nombre',
    where: 'Charla',
    night: 5,
    kind: 'voice',
    rule: 'Ningún huésped conoce su NOMBRE, señor Mora. Si alguien lo pronuncia, no es un huésped.',
    explain: 'Sabía tu nombre.',
  },
  missing_stamp: {
    check: 'Cédula con sello del hotel',
    where: 'Cédula',
    night: 5,
    kind: 'doc',
    rule: 'Toda cédula válida lleva el SELLO del Hotel Punto Nexo.',
    explain: 'Su cédula no tenía el sello del hotel.',
  },
};

export const BASE_RULES = [
  'Sea cortés. Hable con cada huésped antes de decidir.',
  'Campanilla: el huésped sube. Botón rojo: el huésped se va. No hay vuelta atrás.',
  'Si algo le observa desde la penumbra, SOSTÉNGALE la mirada hasta que desaparezca. No le dé la espalda.',
];

// Normas del pasillo: lo que una anomalía intentará que hagas al acompañarla.
export const CORRIDOR_RULES = [
  'Si un huésped pide que le acompañe a su habitación, hágalo. Atienda sus peticiones corrientes: la cortesía se paga en propinas.',
  'Nunca ENTRE en la habitación de un huésped.',
  'Nunca APAGUE una luz del pasillo.',
  'Nunca diga su NOMBRE.',
  'Nunca MIRE ATRÁS, oiga lo que oiga.',
  'Nunca TOQUE a un huésped.',
  'Nunca cambie de PLANTA con un huésped.',
  'Nunca se QUEDE: deje al huésped en su puerta y vuelva al mostrador.',
];

export function rulesForNight(night) {
  const out = BASE_RULES.map((text) => ({ text, isNew: night === 1 }));
  for (const a of Object.values(ANOMALIES)) {
    if (a.night <= night) out.push({ text: a.rule, isNew: a.night === night });
  }
  return out;
}

export function anomaliesForNight(night) {
  return Object.keys(ANOMALIES).filter((id) => ANOMALIES[id].night <= night);
}
