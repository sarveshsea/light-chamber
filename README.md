# Light Chamber

[Open the canvas](https://light-chamber.vercel.app)

An interactive study of a metallic chamber and spectral refraction. No panels, nodes, labels, or interface chrome. Procedural WebGL geometry with perspective, a cursor-steered optical surface, and fixed spatial dithering.

Move the pointer to orbit the chamber and steer refraction. Scroll to move the optical surface through depth. Touch and drag on mobile. Arrow keys steer, `+` / `-` change depth, and Escape or double-click resets.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm test
npm run build
```

Browser verification, with the dev server on port 5178:

```sh
npx playwright install chromium
node tests/browser.mjs
```

Set `TEST_URL` to check production. Unit tests cover the coordinate mapping and motion model with 100% line/branch/function coverage. Browser checks cover the text-free canvas, spatial interaction, deterministic reset, responsive layout, reduced motion, and WebGL fallback.

## Source

- `src/renderer.js` — procedural GLSL rendering and WebGL lifecycle.
- `src/motion.js` — bounded spatial coordinates and frame-rate-independent smoothing.
- `src/main.js` — pointer, touch, scroll, keyboard, and visibility lifecycle.
- `src/style.css` — full-viewport canvas.

The scene uses projected 3D geometry and artistic spectral refraction, not physically accurate ray tracing. All rendering stays in the browser. Resolution is capped at 2× device pixel ratio; rendering settles when interaction stops. Reduced-motion mode responds directly without trailing motion.
