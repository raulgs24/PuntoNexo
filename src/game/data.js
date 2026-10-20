// Textos y tablas del juego.

export const PLAYER_NAME = 'Julián Mora';
export const PLAYER_FIRST = 'Julián';

export const FIRST_NAMES = {
  m: ['Ramón', 'Vicente', 'Julio', 'Ignacio', 'Teodoro', 'Esteban', 'Octavio', 'Gilberto', 'Leandro', 'Federico', 'Aurelio', 'Marcelo', 'Augusto', 'Salvador', 'Bruno', 'Fermín', 'Nicanor', 'Hugo', 'Arturo', 'Damián', 'Anselmo', 'Rodrigo'],
  f: ['Elena', 'Amparo', 'Carmen', 'Rosa', 'Lucía', 'Pilar', 'Mercedes', 'Inés', 'Consuelo', 'Dolores', 'Beatriz', 'Remedios', 'Clara', 'Olvido', 'Adela', 'Irene', 'Rocío', 'Victoria', 'Matilde', 'Soledad', 'Aurora', 'Celia'],
};

export const SURNAMES = [
  'Quiroga', 'Montalbán', 'Lorca', 'Esparza', 'Villalobos', 'Garrido', 'Benavides', 'Sotomayor', 'Robles', 'Escobedo',
  'Valcárcel', 'Ibarra', 'Cifuentes', 'Navarrete', 'Olmedo', 'Paredes', 'Ferrer', 'Salazar', 'Arriaga', 'Bustamante',
  'Cordero', 'Echeverría', 'Galindo', 'Landa', 'Medina', 'Ocaña', 'Peralta', 'Requena', 'Tejada', 'Urquiza', 'Zamora',
  'Aranda', 'Belmonte', 'Cervera', 'Duarte', 'Haro', 'Llorente', 'Mondragón', 'Pastor', 'Rivas',
];

export const CITIES = [
  'Madrid', 'Buenos Aires', 'Lisboa', 'Valparaíso', 'Sevilla', 'La Habana', 'Montevideo', 'Bilbao', 'Marsella', 'Oporto',
  'Ciudad de México', 'Barcelona', 'Lima', 'Nápoles', 'Tánger', 'Cádiz', 'Bogotá', 'Trieste', 'Santander', 'Caracas',
];

// [masculino, femenino]
export const PROFESSIONS = [
  ['Viajante de comercio', 'Viajante de comercio'],
  ['Pianista', 'Pianista'],
  ['Relojero', 'Relojera'],
  ['Enfermero', 'Enfermera'],
  ['Detective privado', 'Detective privada'],
  ['Corresponsal', 'Corresponsal'],
  ['Cantante de cabaret', 'Cantante de cabaret'],
  ['Notario', 'Notaria'],
  ['Telegrafista', 'Telegrafista'],
  ['Fotógrafo', 'Fotógrafa'],
  ['Contable', 'Contable'],
  ['Bibliotecario', 'Bibliotecaria'],
  ['Ilusionista', 'Ilusionista'],
  ['Marino mercante', 'Marina mercante'],
  ['Taxidermista', 'Taxidermista'],
  ['Sastre', 'Modista'],
  ['Agente de seguros', 'Agente de seguros'],
  ['Actor', 'Actriz'],
  ['Médico forense', 'Médica forense'],
  ['Violinista', 'Violinista'],
];

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const GREETINGS = [
  'Buenas noches.',
  'Buenas noches, botones.',
  'Vaya noche de perros, ¿eh?',
  'Disculpe la hora.',
  'Por fin. Llevo horas caminando bajo la lluvia.',
  'Buenas. ¿Es aquí el Punto Nexo?',
  'Menos mal que sigue abierto.',
  'Buenas noches. Qué silencio hay aquí dentro.',
];

export const HANDOVER = ['Aquí tiene mis papeles.', 'Tome. Todo en regla, supongo.', 'Mis documentos.', 'Aquí tiene. Cédula y resguardo.'];

export const SMALL_TALK = [
  '¿Siempre está tan vacío el vestíbulo?',
  'El taxista no quiso acercarse más. Dijo que esta calle no sale en los mapas.',
  'Me han dicho que el desayuno es excelente. Aunque nadie recuerda haberlo tomado.',
  '¿Funciona el ascensor? No me gustan las escaleras.',
  'Mañana tengo una reunión importante. Bueno... si llega mañana.',
  'Hacía años que no venía. El hotel no ha cambiado nada. Usted tampoco.',
  '¿Podrían despertarme a las siete?',
  'Bonito reloj. ¿Siempre va así de lento?',
  'Vengo por trabajo. Siempre es por trabajo.',
  '¿Tiene fuego? No, déjelo. Ya lo dejé.',
];

// Frases inquietantes que también dicen los humanos (despistes).
export const RED_HERRINGS = [
  '¿Ha oído eso? Juraría que alguien me sigue desde la estación.',
  'Este sitio me pone la piel de gallina.',
  'Mi madre se alojó aquí en 1931. Dijo que nunca se fue del todo.',
  'No me mire así, que solo vengo a dormir.',
  'He soñado con este vestíbulo. Muchas veces.',
];

export const ANOMALY_TALK = [
  'Qué cálido es esto. Fuera hace tanto frío... tanto frío.',
  'No he dormido desde... ¿qué año es?',
  'Tengo hambre. Mucha hambre.',
  'Usted huele a vivo.',
  'Las habitaciones de arriba me llaman por mi nombre.',
  '¿Por qué me mira así? Soy como usted. Exactamente como usted.',
  'He venido a quedarme. Para siempre.',
  'Abra. Abra. Abra la puerta de arriba.',
];

export const ACCEPT_HUMAN = ['Gracias. Que pase buena noche.', 'Muy amable.', 'Gracias. Por fin una cama.', 'Hasta mañana, botones.'];
export const EXPEL_HUMAN = [
  '¿Cómo? ¡Pero si tengo reserva!',
  '¿Expulsado? ¿Con esta lluvia? ...Está bien. Está bien.',
  'Ahí fuera no hay nada, ¿sabe? Nada.',
  'No puede hacerme esto. No tengo adónde ir.',
];
export const ACCEPT_ANOMALY = ['Gracias, botones. Gracias.', 'Por fin dentro.', 'Qué amable. Nos veremos pronto.', 'Arriba me esperan.'];
export const EXPEL_ANOMALY = ['Volveré.', 'Ya nos veremos... arriba.', 'Tú también acabarás fuera.', 'Ssssh...'];

export const INTRO_MONOLOGUES = [
  `Llovía como si el cielo tuviera algo que ocultar.

Me llamo Julián Mora y soy el botones del Hotel Punto Nexo. Nadie recuerda cuándo se construyó. Nadie recuerda cuántas plantas tiene.

Yo solo recuerdo que entro a las once... y que nunca he visto amanecer.`,
  `La segunda noche el café sabía a ceniza.

En el espejo del vestíbulo alguien había escrito con vaho una palabra que no supe leer. La borré con la manga.

Volvió a aparecer.`,
  `El ascensor subió solo tres veces antes de medianoche. Las tres veces se detuvo en una planta que no existe.

Me dije que era un fallo eléctrico.

Me lo dije muchas veces.`,
  `Hay huéspedes que nunca bajan a desayunar. Hay habitaciones que nadie ha reservado y aun así tienen la luz encendida.

Esta noche el reloj del vestíbulo empezó a andar hacia atrás.`,
  `Esta noche no llovía. Por primera vez, no llovía.

Y el silencio era mucho peor.`,
];

export const GERENCIA_CALLS = [
  [
    'Bienvenido a Punto Nexo, señor Mora. Su turno empieza ahora... y no termina nunca. Es una broma de la casa.',
    'Las normas están en el Reglamento, sobre el mostrador. Léalo. Compruebe cada documento con el Libro de Registro.',
    'Si el huésped es legítimo, toque la campanilla y el ascensor se lo llevará. Si no lo es, pulse el botón rojo.',
    'Use la lista de comprobaciones, tecla C. Marque cada punto antes de decidir.',
    'Si alguien le pide que le acompañe a su habitación, hágalo. Y respete las normas del pasillo: están al final del Reglamento.',
    'Y recuerde: no todo lo que entra por esa puerta es un huésped.',
  ],
  [
    'Anoche hubo... incidencias. Hemos actualizado el Reglamento.',
    'Use el espejo, señor Mora. El espejo nunca miente. Las personas, sí.',
    'Y mire bien las fechas. Hay quien no sabe en qué calendario vive.',
  ],
  [
    'Esta noche los pisos se mueven. No existe la planta trece. Nunca ha existido.',
    'Fíjese en las fotografías. Y en los ojos. Los vivos parpadean, señor Mora. Los otros no tienen por qué.',
  ],
  [
    'Algunos han aprendido a falsificar los papeles. Ahora tendrá que mirarlos bien. A ellos, no a los papeles.',
    'Escuche sus pasos al cruzar el vestíbulo. Cuente sus ojos. Mida sus brazos.',
  ],
  [
    'Última noche de la semana. O primera. Aquí da igual.',
    'Nadie de fuera conoce su nombre, señor Mora. Si alguien lo pronuncia, no es de fuera.',
    'Esta noche viene alguien especial. Trátelo como a cualquier otro.',
  ],
];

export const ESCORT_REQUESTS = [
  '¿Podría acompañarme hasta la habitación? No conozco el hotel.',
  'Una cosa más... ¿me acompañaría arriba? Los pasillos me dan miedo.',
  'Me han dicho que aquí es fácil perderse. ¿Me acompaña a la habitación?',
  '¿Sería tan amable de subir conmigo? No me gusta ir a solas en ascensor.',
];

export const NIGHT_GUESTS = [5, 6, 7, 7, 7];
export const NIGHT_ANOMALY_RATE = [0.4, 0.45, 0.5, 0.5, 0.55];
export const MAX_FALTAS = 3;
