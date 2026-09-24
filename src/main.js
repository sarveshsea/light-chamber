import './style.css';
import {createRenderer} from './renderer.js';
import {pointerPosition, advance, changeDepth} from './motion.js';

const host = document.querySelector('#app');
const canvas = document.createElement('canvas');
canvas.id = 'canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', 'Interactive light chamber. Move the pointer to orbit and refract light. Scroll to change depth. Arrow keys steer; plus and minus change depth; Escape resets.');
host.append(canvas);

let renderer;
try {
  renderer = createRenderer(canvas);
} catch {
  const error = document.createElement('p');
  error.className = 'render-error';
  error.setAttribute('role', 'alert');
  error.textContent = 'WebGL is unavailable. Open this canvas in a browser with hardware acceleration.';
  host.append(error);
}

if (renderer) {
  let current = {x: 0, y: 0, depth: 0};
  let target = {...current};
  let frame = 0;
  let previous = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function tick(now) {
    frame = 0;
    current = advance(current, target, Math.min(now - previous, 64), reduced.matches);
    previous = now;
    renderer.update({pointerX: current.x, pointerY: current.y, depth: current.depth});
    if (Object.keys(target).some(key => current[key] !== target[key])) frame = requestAnimationFrame(tick);
  }

  function steer(next) {
    target = {...target, ...next};
    if (!frame && !document.hidden) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

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
  renderer.update({pointerX: 0, pointerY: 0, depth: 0});
}
