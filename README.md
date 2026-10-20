# Punto Nexo

> Un hotel que nunca cierra. Un turno que nunca acaba.

Juego noir de terror en 3D y primera persona. Eres **Julián Mora**, el botones del turno de noche del Hotel Punto Nexo, un hotel infinito y fuera del tiempo. Recibes a los huéspedes, compruebas sus papeles y decides: **campanilla** (sube al ascensor) o **botón rojo** (a la calle). Algunos de los que cruzan esa puerta no son huéspedes.

## Cómo jugar

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # versión estática en dist/
```

| Tecla | Acción |
| --- | --- |
| Ratón | Mirar |
| WASD | Moverse |
| E | Interactuar (hablar, teléfono, campanilla, botón rojo, libro, reglamento) |
| Q | Examinar documentos / libro de registro |
| R | Reglamento |
| 1 / 2 | Con los documentos abiertos: admitir / expulsar |
| Esc | Pausa |

Se juega mejor con auriculares y a oscuras. Todo el sonido y todas las texturas se generan por código: no hay ficheros de recursos.

## Estado actual (prototipo jugable)

- Vestíbulo art déco en 3D: mostrador, espejo de pie, ascensor con dial de plantas, puertas de entrada con lluvia, ventana con persianas.
- Filtro noir: blanco y negro de alto contraste en el que solo sobrevive el rojo, grano de película, viñeta y distorsión.
- 5 noches con reglas que se acumulan, 14 tipos de anomalía, llamada de la Gerencia al inicio de cada turno.
- Presencias: si admites una anomalía, aparece en la penumbra y se acerca cuando no la miras. Sostenle la mirada para que desaparezca.
- Eventos de terror: apagones, escritura en el espejo, ascensor que se abre solo, llamadas, una figura que solo existe en el reflejo.
- Dos finales en la quinta noche.

Para el diseño completo, ideas y próximos pasos: [docs/DISENO.md](docs/DISENO.md).

## Estructura

```
src/
  main.js              arranque, render y bucle principal
  core/                jugador (primera persona) y RNG con semilla
  world/               vestíbulo y texturas procedurales
  entities/            modelo de huésped (con anomalías visuales)
  game/                lógica de noches, anomalías, generador de huéspedes, retratos
  ui/                  HUD, documentos, reglamento y pantallas
  fx/                  postproceso noir
  audio/               sonido procedural con WebAudio
```

Con `?debug` en la URL el juego funciona sin bloqueo de puntero y expone `window.__nexo` para pruebas automáticas.
