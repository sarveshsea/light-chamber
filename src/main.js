import './style.css';
import {createRenderer} from './renderer.js';
import {pointerPosition, advance, changeDepth} from './motion.js';

const host = document.querySelector('#app');
const canvas = document.createElement('canvas');
canvas.id = 'canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'Interactive light chamber. Move the pointer to position the light inside the fixed chamber. Scroll to change light depth. Arrow keys steer; plus and minus change depth; Escape resets the light; Space pauses the wind.');
host.append(canvas);

function reportFailure(cause) {
  console.error('Light chamber initialization failed', cause);
  const error = document.createElement('p');
  error.className = 'render-error';
  error.setAttribute('role', 'alert');
  error.textContent = 'WebGL is unavailable. Open this canvas in a browser with hardware acceleration.';
  host.append(error);
}

let renderer;
try {
  renderer = createRenderer(canvas);
} catch (cause) {
  reportFailure(cause);
}

if (renderer) {
  let current = {x: 0, y: 0, depth: 0};
  let target = {...current};
  let frame = 0;
  let previous = performance.now();
  let windTime = 0;
  let windPaused = false;
  let contextLost = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function tick(now) {
    frame = 0;
    if (contextLost) return;
    const elapsed = Math.min(now - previous, 64);
    current = advance(current, target, elapsed, reduced.matches);
    if (!reduced.matches && !windPaused) windTime += elapsed / 1000;
    previous = now;
    renderer.update({pointerX: current.x, pointerY: current.y, depth: current.depth, time: windTime});
    if (!document.hidden && ((!reduced.matches && !windPaused) || Object.keys(target).some(key => current[key] !== target[key]))) {
      frame = requestAnimationFrame(tick);
    }
  }

  function steer(next) {
    target = {...target, ...next};
    if (!frame && !document.hidden && !contextLost) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.dispose();
    try {
      renderer = createRenderer(canvas);
      contextLost = false;
      renderer.update({pointerX: current.x, pointerY: current.y, depth: current.depth, time: windTime});
      steer(target);
    } catch (cause) {
      reportFailure(cause);
    }
  });

  reduced.addEventListener('change', () => steer(target));

  canvas.addEventListener('pointermove', event => {
    steer(pointerPosition(event.clientX, event.clientY, innerWidth, innerHeight));
  });
  canvas.addEventListener('pointerdown', event => {
    canvas.focus({preventScroll: true});
    canvas.setPointerCapture(event.pointerId);
    steer(pointerPosition(event.clientX, event.clientY, innerWidth, innerHeight));
  });
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    steer({depth: changeDepth(target.depth, event.deltaY * unit)});
  }, {passive: false});
  canvas.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const arrows = {ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, .12], ArrowDown: [0, -.12]};
    if (arrows[event.key]) {
      event.preventDefault();
      const [x, y] = arrows[event.key];
      steer({x: Math.max(-1, Math.min(1, target.x + x)), y: Math.max(-1, Math.min(1, target.y + y))});
    } else if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      steer({depth: changeDepth(target.depth, event.key === '-' ? -100 : 100)});
    } else if (event.code === 'Space') {
      event.preventDefault();
      windPaused = !windPaused;
      steer(target);
    } else if (event.key === 'Escape' || event.key === 'Home') {
      event.preventDefault();
      steer({x: 0, y: 0, depth: 0});
    }
  });
  canvas.addEventListener('dblclick', () => steer({x: 0, y: 0, depth: 0}));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else steer(target);
  });
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!event.persisted) renderer.dispose();
  });
  window.addEventListener('pageshow', () => steer(target));
  renderer.update({pointerX: 0, pointerY: 0, depth: 0, time: 0});
  steer(target);
}
