import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-600.css';
import '@fontsource/rubik/hebrew-800.css';
import '@fontsource/rubik/hebrew-900.css';
import '@fontsource/rubik/latin-700.css';
import './style.css';
import { Sfx } from './audio';
import { Game } from './game';
import { loadModels } from './models';
import { Stage } from './scene';

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => Promise<void>;
    __game: Game;
  }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = document.getElementById('app')!;
const title = document.getElementById('title')!;
title.innerHTML = '<h1 class="logo">דו־קרב העוגות</h1><div class="subtitle" id="loading">מעמיסים עוגות…</div>';

async function boot() {
  const models = await loadModels((done, total) => {
    const el = document.getElementById('loading');
    if (el) el.textContent = `מעמיסים עוגות… ${done}/${total}`;
  });
  let stage: Stage;
  try {
    stage = new Stage(canvas, models);
  } catch {
    document.getElementById('glerror')!.classList.remove('hidden');
    return;
  }
  const sfx = new Sfx();
  const game = new Game(stage, sfx);
  window.__game = game;

  const resize = () => {
    const r = app.getBoundingClientRect();
    stage.resize(Math.max(1, r.width), Math.max(1, r.height));
  };
  new ResizeObserver(resize).observe(app);
  resize();

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.getElementById('glerror')!.classList.remove('hidden');
  });
  window.addEventListener('blur', () => {
    if (game.ui === 'play') game.togglePause();
  });
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  // fixed-step loop; advanceTime() drives the same step for tests
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  let manual = false;
  const step = () => {
    if (!game.paused) stage.update(STEP);
    else stage.composer.render();
  };
  const frame = (now: number) => {
    acc += Math.min(250, now - last);
    last = now;
    if (!manual) {
      // catch up after slow frames, but never more than 8 steps per frame
      let n = 0;
      while (acc >= STEP && n++ < 8) {
        step();
        acc -= STEP;
      }
      if (n > 8) acc = 0;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // deterministic: fixed 60 Hz steps; microtasks are flushed between steps so awaited animation chains advance
  window.advanceTime = async (ms: number) => {
    manual = true;
    const n = Math.max(1, Math.round(ms / STEP));
    for (let i = 0; i < n; i++) {
      step();
      for (let k = 0; k < 12; k++) await Promise.resolve();
    }
    manual = false;
    last = performance.now();
    acc = 0;
  };
  window.render_game_to_text = () => JSON.stringify(game.describe());

  game.showTitle();
}

boot();
