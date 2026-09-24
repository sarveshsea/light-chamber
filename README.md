# Light Chamber

[Open the canvas](https://light-chamber.vercel.app)

A straight-on technical light chamber with a white fixture, spectral rays, and a suspended, wind-driven optical film. Move the light to watch its highlights and refraction travel across the folds. No panels, nodes, or visible labels.

Move the pointer to position the light. Scroll to adjust the light's depth. Touch and drag on mobile. Arrow keys move the light; `+` / `-` change depth. Escape or double-click resets the light. The chamber and camera stay fixed. Space pauses or resumes the wind.

## Optical math and attribution

The seven-ray spectrum converts OKLCH hue through OKLab to linear sRGB in the shader, keeping the hues evenly spaced as the rays separate. The film's wind field uses Stefan Gustavson and Ian McEwan's [PSRD noise](https://github.com/stegu/psrdnoise): rotating-gradient simplex noise with analytical partial derivatives. The vendored GLSL at `src/vendor/psrdnoise2.glsl` is pinned to commit `419175a270862ce7ae692038fafafb42ec0427e9` and retains its MIT license. A copy is also shipped at `/THIRD_PARTY_NOTICES.txt`.

[Evan Wallace's WebGL Water](https://github.com/evanw/webgl-water/blob/master/renderer.js) was studied for its use of Snell refraction, Fresnel blending, and ray-footprint focusing. The chamber's optical shader is an original implementation; no water-demo source was copied.

This is a stylized optical study, not a calibrated optics simulator or a cloth-physics solver. Wind drives a procedural surface; the surface geometry and its derivatives drive the highlights and refraction.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm test
npm run build
```

Browser checks with a dev server on port 5178:

```sh
npx playwright install chromium
node tests/browser.mjs
```

Set `TEST_URL` to check the deployment. Unit tests cover coordinate mapping, bounded light depth, and smoothing. Browser checks cover light interaction, wind animation, fixed framing, reduced motion, touch, responsive layout, and WebGL fallback.

All rendering stays in the browser. Hidden tabs pause the wind. Reduced-motion preference freezes the film while keeping direct light interaction available. See `src/renderer.js` for the rendering implementation and `src/main.js` for input and animation lifecycle.
