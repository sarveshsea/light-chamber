# Light Chamber

A small, open WebGL workbench for light and material experiments. A metallic container, a frosted optical surface, and a spectral beam — with no copy on the canvas.

## Play

- Shape the light with seven live controls.
- Switch between Spectrum, Ice, Ember, or an empty canvas.
- Drag nodes by their headers; use arrow keys when a header has focus.
- Click a node's input port to bypass or reconnect that effect.
- Hide the interface for a clean canvas; press Escape to restore it.
- Export the current canvas as a PNG.

The node map is a fixed material pipeline with movable, bypassable stages. It is not an arbitrary shader graph compiler.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm test
npm run build
```

For browser checks, start the dev server on port 5178, then run:

```sh
npx playwright install chromium
node tests/browser.mjs
```

Set `TEST_URL` to check a deployed build. Pure settings and pipeline logic has 100% line/branch/function coverage in the included unit tests. Browser checks cover shader changes, presets, node bypass, dragging, presentation mode, PNG download, and mobile layout; this is not a claim of full renderer coverage.

## Extend

`src/renderer.js` owns the GLSL shader and WebGL lifecycle. `createRenderer(canvas)` exposes `update(settings)`, `exportImage()`, and `dispose()`. Add uniforms here for new material studies.

`src/model.js` holds immutable settings, input limits, preset definitions, and the node-to-uniform mapping. `src/main.js` binds controls and node interactions. `src/style.css` contains the workbench surface tokens and responsive layout.

The Empty preset disables the light, frame, and glass so the canvas is ready for a new experiment. Use the three toggles to bring components back independently. All processing stays in the browser. No analytics, account, or backend.

## Rendering

WebGL is required. Resolution is capped at 2× device pixel ratio. Reduced motion stops temporal animation. The container and glass are procedural screen-space shader geometry, not a ray-traced scene.
