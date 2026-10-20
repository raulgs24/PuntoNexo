# Punto Nexo — Documento de diseño

## Concepto

**Género:** terror psicológico noir, primera persona, 3D.
**Inspiraciones:** *Papers, Please* (comprobar documentos), *I'm on Observation Duty* / *The Exit 8* (detectar anomalías), *That's Not My Neighbor*, *El resplandor*, cine negro de los 40.

Eres Julián Mora, botones del turno de noche del Hotel Punto Nexo. El hotel no tiene época: llegan huéspedes de 1890, de 1950 o de ninguna parte. Tu trabajo es recibirlos y decidir quién sube y quién se queda fuera. Lo que no es humano intenta entrar. Y el hotel recuerda cada error.

### Pilares

1. **Observar es jugar.** Todo lo importante está en el mundo: la sombra sobre el mostrador, el reflejo en el espejo, el parpadeo, los pasos. Los papeles son la mitad del trabajo; la otra mitad es mirar.
2. **Las reglas crecen cada noche.** Cada noche la Gerencia añade normas. El jugador aprende un sistema que se complica sin dejar de ser justo.
3. **Mirar a otro lado tiene precio.** Mientras lees documentos no estás vigilando el vestíbulo. Los errores se convierten en presencias que se acercan cuando no miras.
4. **Noir antes que gore.** Blanco y negro, persianas, lluvia, un solo color: el rojo. El miedo viene de la duda, el silencio y lo que casi ves.

## Bucle de juego

```
Llamada de la Gerencia (nuevas normas)
  └─ Llega un huésped por la puerta (pasos, lluvia, puertas)
       └─ Hablar (E) → entrega cédula y resguardo
            └─ Comprobar: papeles (Q), Libro de Registro, Reglamento (R),
               espejo, sombra, ojos, pasos...
                 └─ Decidir: campanilla (ascensor) o botón rojo (calle)
                      └─ Consecuencias inmediatas y al final de la noche
```

**Errores:** cada error es una *amonestación*. Con tres, la Gerencia te "reasigna" (game over).

- **Admitir una anomalía:** el ascensor marca la planta 13, las luces fallan y, al poco, aparece una *presencia* en un rincón oscuro del vestíbulo. Se acerca cuando no la miras. Si la miras fijamente unos segundos, se desvanece. Si llega hasta ti, te encuentra.
- **Expulsar a un humano:** al rato suena el teléfono. Es él, desde fuera, donde no hay calle.

## Lista de comprobaciones

Panel lateral (tecla C) con una casilla por cada norma activa esa noche: libro de registro, nombres, sombra, espejo, fechas, foto, parpadeo, ojos, pasos... Cada casilla indica dónde comprobarla (Libro, Cédula, Espejo, Cara...). El jugador marca cada punto como correcto (→) o anómalo (←) y la lista da una conclusión: *anomalía → botón rojo*, *huésped legítimo → campanilla* o cuántas comprobaciones faltan.

La lista no comprueba nada sola: es una libreta. El trabajo de mirar sigue siendo del jugador.

## Acompañar a la habitación

Algunos huéspedes piden, al hablar, que el botones les acompañe (la primera noche, siempre un humano para aprender; después, al azar y más a menudo las anomalías). Si se les admite, esperan junto al ascensor y no llega nadie más hasta que los acompañas.

Al subir se entra en un pasillo de moqueta roja con puertas numeradas. El huésped camina delante y se detiene tres veces a pedir algo; el jugador responde con 1 o 2 (14 segundos; si no contesta, cuenta como negarse).

**El juego mental:**

- **Humano:** solo pide cortesías (llevar la maleta, la hora del desayuno, que le despierten...). No hay forma de fallar. Atenderle da propinas.
- **Anomalía:** primero pide una cortesía para ganarse tu confianza. Después intenta que rompas una **norma del pasillo** y, en la puerta, una última trampa (entrar a revisar la habitación o quedarte con ella).
  - Si te niegas, **insiste** dos veces más, cada vez con más presión: las luces parpadean, susurros, la imagen se distorsiona y se te acerca un paso.
  - Si **cedes una sola vez**, susto y fin de partida.
  - Si resistes, entra en su habitación, la puerta se cierra de golpe y queda **encerrada**: no hay amonestación por haberla admitido.
  - "Mire atrás" es una trampa física: se oyen pasos detrás de ti y, si te das la vuelta de verdad, estás perdido.

**Normas del pasillo** (al final del Reglamento): atender las peticiones corrientes; nunca entrar en una habitación, apagar una luz, decir tu nombre, mirar atrás, tocar a un huésped, cambiar de planta con él ni quedarte.

## Noches y anomalías

| Noche | Nuevas anomalías | Cómo se detectan |
| --- | --- | --- |
| I | Sin reserva · Nombre distinto · Sin sombra | Libro de Registro · cédula vs. resguardo · silueta sobre el mostrador |
| II | Fecha imposible · Sin reflejo · Difunto | "31 de abril" · espejo de pie · campo DEFUNCIÓN |
| III | Foto que no coincide · Planta 13 · No parpadea | retrato vs. cara · nº de habitación · ojos |
| IV | Ojos (rojos, tres, ninguno) · Flota · Proporciones | cara · pies y ausencia de pasos · brazos/cuello |
| V | Sabe tu nombre · Sin sello | diálogo · cédula |

A partir de la noche IV algunas anomalías combinan dos rasgos. Los humanos a veces dicen cosas inquietantes (pistas falsas) y las anomalías a veces hablan con interferencias.

### Ambientación por noche

- **I** — lluvia, radio de jazz, todo parece normal.
- **II** — escritura en el vaho del espejo, el ascensor se abre solo.
- **III** — la aguja del ascensor señala el hueco del 13, llamadas sin voz, una figura que solo existe en el reflejo.
- **IV** — el reloj anda hacia atrás, la radio calla.
- **V** — deja de llover. El silencio. Llega alguien vestido de botones con tu cara.

## Finales (noche V)

El último huésped eres tú: mismo nombre, profesión "Botones", procedencia "Hotel Punto Nexo". Desde que llega, tú ya no te reflejas en el espejo.

- **El relevo** (campanilla): le cedes el mostrador y subes. Planta 13. Por fin tienes sueño.
- **El turno eterno** (botón rojo): se va, vuelve a llover, el reloj marca las once y suena el teléfono. Bienvenido a Punto Nexo.

## Dirección artística

- Postproceso: luminancia con curva de contraste, solo el rojo puro sobrevive (corbatas, botón de expulsar, letrero de SALIDA, ojos de las anomalías, uniforme del botones en el espejo).
- Luz dura: foco a través de persianas desde la ventana trasera (rayas sobre los huéspedes), lámpara colgante que proyecta su silueta sobre el mostrador.
- Grano, viñeta, parpadeo de proyector y arañazos de película.
- Huéspedes estilizados tipo maniquí: lo justo para leer sombrero, gafas, bigote, ojos y proporciones.

## Sonido

Procedural con WebAudio: lluvia, zumbido grave del edificio, radio de jazz (acordes menores filtrados), campanilla, timbre del teléfono, pasos con reverberación, motor del ascensor, truenos, susurros, latido que acelera cuando algo se acerca.

## Ideas para seguir

**Mecánicas**
- Peticiones de pasillo ambiguas: cortesías que una anomalía usa con doble sentido.
- Huéspedes que vuelven otra noche con un detalle cambiado.
- Llamadas de habitaciones que piden cosas imposibles ("traiga toallas a la 1313").
- Reglas falsas: una nota del reglamento escrita con otra letra. ¿La cumples?
- Inventario de llaves: dar la llave correcta según el número de habitación.
- Tiempo limitado por huésped; los que esperan demasiado se impacientan... o algo peor.
- Botones y propinas como economía: comprar un farol, un crucifijo, una radio nueva.

**Terror**
- El reflejo del jugador se retrasa medio segundo a partir de la noche IV.
- Un huésped admitido baja a recepción a las 3:00 a preguntar por su habitación... que no existe.
- Las presencias imitan los pasos de huéspedes normales.

**Técnico**
- Modelos y animaciones reales (GLTF), voces grabadas o TTS con filtro de radio.
- Guardar progreso por noche y estadísticas.
- Localización (castellano / inglés).
- Opciones de sensibilidad del ratón, brillo y subtítulos.
