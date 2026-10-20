import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLobby, SPOTS } from './world/lobby.js';
import { buildCorridor } from './world/corridor.js';
import { GuestModel } from './entities/guestModel.js';
import { Player } from './core/player.js';
import { UI } from './ui/ui.js';
import { Sfx } from './audio/sfx.js';
import { NoirShader } from './fx/noirPass.js';
import { Game } from './game/game.js';

const params = new URLSearchParams(location.search);
const debug = params.has('debug');

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x040404, 0.042);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.1;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 80);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const noirPass = new ShaderPass(NoirShader);
composer.addPass(noirPass);
composer.addPass(new OutputPass());

// ---------- Mundo ----------
const lobby = buildLobby(scene);
const corridor = buildCorridor(scene);
const audio = new Sfx();
const ui = new UI(audio);
const player = new Player(camera, renderer.domElement, lobby, { debug });
player.teleport(SPOTS.playerStart, Math.PI);

// Tu cuerpo: invisible para ti, visible solo en el espejo.
const playerBody = new GuestModel({
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
});
playerBody.root.visible = false;
playerBody.root.userData.mirrorActive = true;
lobby.mirrorRegistry.mirrorOnly.add(playerBody.root);
scene.add(playerBody.root);
const bodyLook = new THREE.Vector3();

const game = new Game({ scene, camera, lobby, corridor, player, ui, audio, fx: noirPass, playerBody });
game.showTitle();

renderer.domElement.addEventListener('click', () => {
  if (game.isPlaying() && !player.active) player.lock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Bucle ----------
const timer = new THREE.Timer();
function frame(now) {
  timer.update(now);
  const dt = Math.min(0.05, timer.getDelta());
  const t = timer.getElapsed();
  game.update(dt);
  lobby.update(dt, t);

  playerBody.root.position.set(player.position.x, 0, player.position.z);
  playerBody.root.rotation.y = player.yaw + Math.PI;
  player.forward(bodyLook).multiplyScalar(4).add(camera.position);
  playerBody.lookTarget = bodyLook;
  playerBody.speed = player.speed > 0.1 ? 1.2 : 0;
  playerBody.update(dt);

  noirPass.uniforms.time.value = t;
  composer.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (debug) {
  // Avanza la lógica sin renderizar (para pruebas automáticas).
  const step = (seconds) => {
    for (let t = 0; t < seconds; t += 0.05) {
      game.update(0.05);
      lobby.update(0.05, t);
    }
  };
  window.__nexo = { game, player, lobby, corridor, scene, camera, renderer, ui, audio, step, GuestModel };
}
